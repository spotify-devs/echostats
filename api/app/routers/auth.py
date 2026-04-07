"""Spotify OAuth 2.0 authentication endpoints."""

import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import jwt
import redis.asyncio as aioredis
import structlog
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from fastapi.responses import RedirectResponse

from app.config import settings
from app.models.user import SpotifyTokens, User
from app.services.spotify_client import (
    SCOPES,
    SPOTIFY_AUTH_URL,
    SpotifyClient,
    exchange_code_for_tokens,
)
from app.services.sync_service import (
    enrich_audio_features,
    run_initial_sync,
    sync_recently_played,
)
from app.services.token_service import get_valid_access_token, store_tokens

logger = structlog.get_logger()
router = APIRouter()

# In-memory fallback state store (used when Redis is unavailable)
_oauth_states: dict[str, datetime] = {}


def _get_redis() -> aioredis.Redis:
    """Create a Redis client from application settings."""
    return aioredis.from_url(settings.redis_url, decode_responses=True)  # type: ignore[no-any-return, no-untyped-call]


def _create_jwt(user_id: str, spotify_id: str) -> str:
    """Create a JWT token for the user session."""
    payload = {
        "sub": user_id,
        "spotify_id": spotify_id,
        "iat": datetime.now(tz=UTC),
        "exp": datetime.now(tz=UTC) + timedelta(days=30),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


@router.get("/login", response_model=None)
async def login(request: Request) -> dict[str, str] | RedirectResponse:
    """Generate Spotify authorization URL. Redirects browsers, returns JSON for JS clients."""
    state = secrets.token_urlsafe(32)

    # Store state in Redis with 10-min TTL; fall back to in-memory
    try:
        r = _get_redis()
        await r.set(f"oauth_state:{state}", "1", ex=600)
        await r.aclose()
    except Exception:
        logger.debug("Redis unavailable for OAuth state, using in-memory fallback")
        _oauth_states[state] = datetime.now(tz=UTC)

    # Clean expired in-memory states (older than 10 min)
    cutoff = datetime.now(tz=UTC) - timedelta(minutes=10)
    expired = [k for k, v in _oauth_states.items() if v < cutoff]
    for k in expired:
        del _oauth_states[k]

    params = {
        "client_id": settings.spotify_client_id,
        "response_type": "code",
        "redirect_uri": settings.spotify_redirect_uri,
        "scope": " ".join(SCOPES),
        "state": state,
        "show_dialog": "false",
    }
    auth_url = f"{SPOTIFY_AUTH_URL}?{urlencode(params)}"

    # If browser navigates here directly, redirect to Spotify
    accept = request.headers.get("accept", "")
    if "text/html" in accept and "application/json" not in accept:
        return RedirectResponse(url=auth_url, status_code=302)

    return {"url": auth_url, "state": state}


@router.get("/callback", response_model=None)
async def callback(
    background_tasks: BackgroundTasks,
    response: Response,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> dict[str, Any] | RedirectResponse:
    """Handle Spotify OAuth callback."""
    if error:
        raise HTTPException(status_code=400, detail=f"Spotify auth error: {error}")

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state parameter")

    # Validate state: check Redis first, then in-memory fallback
    state_valid = False
    try:
        r = _get_redis()
        val = await r.get(f"oauth_state:{state}")
        if val:
            await r.delete(f"oauth_state:{state}")
            state_valid = True
        await r.aclose()
    except Exception:
        logger.debug("Redis unavailable for OAuth state validation, using in-memory fallback")

    if not state_valid and state in _oauth_states:
        del _oauth_states[state]
        state_valid = True

    if not state_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    # Exchange code for tokens
    try:
        token_data = await exchange_code_for_tokens(code)
    except Exception as e:
        logger.exception("Token exchange failed", error=str(e))
        raise HTTPException(
            status_code=502, detail="Failed to exchange authorization code"
        ) from e

    access_token = token_data["access_token"]
    refresh_token = token_data["refresh_token"]
    expires_in = token_data.get("expires_in", 3600)
    scope = token_data.get("scope", "")

    # Fetch user profile from Spotify
    client = SpotifyClient(access_token)
    try:
        profile = await client.get_current_user()
    finally:
        await client.close()

    spotify_id = profile["id"]

    # Create or update user
    user = await User.find_one(User.spotify_id == spotify_id)
    is_new_user = user is None
    if user:
        user.display_name = profile.get("display_name", "")
        user.email = profile.get("email", "")
        user.image_url = (
            (profile.get("images") or [{}])[0].get("url", "")
            if profile.get("images")
            else ""
        )
        user.country = profile.get("country", "")
        user.product = profile.get("product", "")
        await user.save()
    else:
        user = User(
            spotify_id=spotify_id,
            display_name=profile.get("display_name", ""),
            email=profile.get("email", ""),
            image_url=(
                (profile.get("images") or [{}])[0].get("url", "")
                if profile.get("images")
                else ""
            ),
            country=profile.get("country", ""),
            product=profile.get("product", ""),
        )
        await user.insert()

    # Store encrypted tokens
    await store_tokens(user, access_token, refresh_token, expires_in, scope)

    # Trigger initial data sync in background
    background_tasks.add_task(_run_post_auth_sync, str(user.id), is_new_user)

    # Create session JWT
    session_token = _create_jwt(str(user.id), spotify_id)

    # Set cookie
    response.set_cookie(
        key="session",
        value=session_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=30 * 24 * 3600,  # 30 days
        path="/",
    )

    logger.info(
        "User authenticated",
        spotify_id=spotify_id,
        display_name=user.display_name,
    )

    # Redirect to frontend — the browser was redirected here by Spotify,
    # so we redirect back to the frontend with success
    cors_origins = settings.cors_origin_list
    frontend_url = cors_origins[0] if cors_origins else "http://localhost:3000"
    redirect_url = f"{frontend_url}/auth/callback?status=success"

    redirect = RedirectResponse(url=redirect_url, status_code=302)
    redirect.set_cookie(
        key="session",
        value=session_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=30 * 24 * 3600,
        path="/",
    )
    return redirect


@router.post("/refresh")
async def refresh_token(request: Request) -> dict[str, str]:
    """Refresh the Spotify access token for the current user."""
    user = await _get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = await get_valid_access_token(user)
    if not token:
        raise HTTPException(
            status_code=401, detail="Failed to refresh token — re-login required"
        )

    return {"status": "refreshed"}


@router.get("/status")
async def auth_status(request: Request, response: Response) -> dict[str, Any]:
    """Check authentication status. Auto-authenticates if single user exists."""
    user = await _get_current_user(request)

    # Single-user auto-login: if no session but exactly one user exists,
    # automatically create a session for them (self-hosted single-user app)
    if not user:
        try:
            user_count = await User.count()
            if user_count == 1:
                user = await User.find_one()
                if user:
                    session_token = _create_jwt(str(user.id), user.spotify_id)
                    response.set_cookie(
                        key="session",
                        value=session_token,
                        httponly=True,
                        secure=False,
                        samesite="lax",
                        max_age=30 * 24 * 3600,
                        path="/",
                    )
                    logger.info("Single-user auto-login", spotify_id=user.spotify_id)
        except Exception:
            pass  # DB not initialized or unavailable — skip auto-login

    if not user:
        return {"authenticated": False}

    tokens = await SpotifyTokens.find_one(SpotifyTokens.user_id == str(user.id))
    return {
        "authenticated": True,
        "user": {
            "id": str(user.id),
            "spotify_id": user.spotify_id,
            "display_name": user.display_name,
            "image_url": user.image_url,
            "product": user.product,
        },
        "token_expires_at": tokens.expires_at.isoformat() if tokens else None,
    }


@router.post("/logout")
async def logout(response: Response) -> dict[str, str]:
    """Clear session cookie."""
    response.delete_cookie("session", path="/")
    return {"status": "logged_out"}


@router.get("/dev-login")
async def dev_login(response: Response) -> dict[str, Any]:
    """DEV ONLY — Log in as the demo seed user without Spotify OAuth."""
    user = await User.find_one(User.spotify_id == "demo_user")
    if not user:
        raise HTTPException(status_code=404, detail="Demo user not found. Run seed.py first.")

    session_token = _create_jwt(str(user.id), "demo_user")

    response.set_cookie(
        key="session",
        value=session_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=30 * 24 * 3600,
        path="/",
    )

    logger.info("Dev login", spotify_id="demo_user", display_name=user.display_name)

    return {
        "status": "authenticated",
        "user": {
            "id": str(user.id),
            "spotify_id": "demo_user",
            "display_name": user.display_name,
        },
        "token": session_token,
    }


async def _run_post_auth_sync(user_id: str, is_new_user: bool) -> None:
    """Run data sync after OAuth authentication (background task)."""
    from beanie import PydanticObjectId

    from app.services.analytics_service import compute_analytics_snapshot

    try:
        user = await User.get(PydanticObjectId(user_id))
        if not user:
            return

        token = await get_valid_access_token(user)
        if not token:
            logger.warning("No valid token for post-auth sync", user_id=user_id)
            return

        client = SpotifyClient(token, user_id=user_id)
        try:
            if is_new_user:
                job = await run_initial_sync(client, user_id)
                logger.info("Initial sync completed", user_id=user_id, status=job.status)
            else:
                count = await sync_recently_played(client, user_id)
                if count > 0:
                    await enrich_audio_features(client, batch_size=50)
                logger.info("Post-auth sync completed", user_id=user_id, new_tracks=count)
        finally:
            await client.close()

        # Refresh analytics so dashboard shows data immediately
        for period in ["week", "month", "year", "all_time"]:
            try:
                await compute_analytics_snapshot(user_id, period)
            except Exception:
                pass
        logger.info("Post-auth analytics refreshed", user_id=user_id)

    except Exception as e:
        logger.exception("Post-auth sync failed", user_id=user_id, error=str(e))


async def _get_current_user(request: Request) -> User | None:
    """Extract the current user from the session cookie or Authorization header."""
    token = request.cookies.get("session")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return await User.find_one(
            User.spotify_id == payload.get("spotify_id", "")
        )
    except Exception:
        return None
