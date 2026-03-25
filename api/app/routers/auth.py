"""Spotify OAuth 2.0 authentication endpoints."""

import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode

import structlog
from fastapi import APIRouter, HTTPException, Request, Response
from jose import jwt

from app.config import settings
from app.models.user import SpotifyTokens, User
from app.services.spotify_client import (
    SCOPES,
    SPOTIFY_AUTH_URL,
    SpotifyClient,
    exchange_code_for_tokens,
)
from app.services.token_service import get_valid_access_token, store_tokens

logger = structlog.get_logger()
router = APIRouter()

# In-memory state store (for production, use Redis)
_oauth_states: dict[str, datetime] = {}


def _create_jwt(user_id: str, spotify_id: str) -> str:
    """Create a JWT token for the user session."""
    payload = {
        "sub": user_id,
        "spotify_id": spotify_id,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(days=30),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


@router.get("/login")
async def login() -> dict[str, str]:
    """Generate Spotify authorization URL."""
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = datetime.utcnow()

    # Clean expired states (older than 10 min)
    cutoff = datetime.utcnow() - timedelta(minutes=10)
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
    return {"url": auth_url, "state": state}


@router.get("/callback")
async def callback(
    response: Response,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> dict:
    """Handle Spotify OAuth callback."""
    if error:
        raise HTTPException(status_code=400, detail=f"Spotify auth error: {error}")

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state parameter")

    # Validate state
    if state not in _oauth_states:
        raise HTTPException(status_code=400, detail="Invalid or expired state")
    del _oauth_states[state]

    # Exchange code for tokens
    try:
        token_data = await exchange_code_for_tokens(code)
    except Exception as e:
        logger.error("Token exchange failed", error=str(e))
        raise HTTPException(
            status_code=502, detail="Failed to exchange authorization code"
        )

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

    # Create session JWT
    session_token = _create_jwt(str(user.id), spotify_id)

    # Set cookie
    response.set_cookie(
        key="session",
        value=session_token,
        httponly=True,
        secure=False,  # Set True in production with HTTPS
        samesite="lax",
        max_age=30 * 24 * 3600,  # 30 days
        path="/",
    )

    logger.info(
        "User authenticated",
        spotify_id=spotify_id,
        display_name=user.display_name,
    )

    return {
        "status": "authenticated",
        "user": {
            "id": str(user.id),
            "spotify_id": spotify_id,
            "display_name": user.display_name,
            "image_url": user.image_url,
        },
        "token": session_token,
    }


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
async def auth_status(request: Request) -> dict:
    """Check authentication status."""
    user = await _get_current_user(request)
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
async def dev_login(response: Response) -> dict:
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
