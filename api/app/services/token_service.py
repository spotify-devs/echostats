"""Token management service — encrypt/decrypt/refresh Spotify tokens."""

import asyncio
from datetime import datetime, timedelta

import structlog

from app.config import settings
from app.models.user import SpotifyTokens, User
from app.services.spotify_client import refresh_access_token
from app.utils.crypto import decrypt_token, encrypt_token

logger = structlog.get_logger()

MAX_REFRESH_RETRIES = 3
RETRY_DELAYS = [1, 3, 5]  # seconds


async def store_tokens(
    user: User,
    access_token: str,
    refresh_token: str,
    expires_in: int,
    scope: str = "",
) -> SpotifyTokens:
    """Encrypt and store Spotify tokens for a user."""
    encrypted_access = encrypt_token(access_token, settings.encryption_key)
    encrypted_refresh = encrypt_token(refresh_token, settings.encryption_key)
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

    existing = await SpotifyTokens.find_one(SpotifyTokens.user_id == str(user.id))
    if existing:
        existing.access_token_encrypted = encrypted_access
        existing.refresh_token_encrypted = encrypted_refresh
        existing.expires_at = expires_at
        existing.scope = scope
        await existing.save()
        return existing

    tokens = SpotifyTokens(
        user_id=str(user.id),
        access_token_encrypted=encrypted_access,
        refresh_token_encrypted=encrypted_refresh,
        expires_at=expires_at,
        scope=scope,
    )
    await tokens.insert()
    return tokens


async def get_valid_access_token(user: User) -> str | None:
    """Get a valid access token, refreshing if needed."""
    tokens = await SpotifyTokens.find_one(SpotifyTokens.user_id == str(user.id))
    if not tokens:
        return None

    # Check if token needs refresh (5 min buffer)
    if tokens.expires_at < datetime.utcnow() + timedelta(minutes=5):
        logger.info("Refreshing Spotify token", user_id=str(user.id))
        refresh_tok = decrypt_token(
            tokens.refresh_token_encrypted, settings.encryption_key
        )

        for attempt in range(MAX_REFRESH_RETRIES):
            try:
                token_data = await refresh_access_token(refresh_tok)
                new_access: str = token_data["access_token"]
                new_refresh = token_data.get("refresh_token", refresh_tok)
                expires_in = token_data.get("expires_in", 3600)

                tokens.access_token_encrypted = encrypt_token(
                    new_access, settings.encryption_key
                )
                tokens.refresh_token_encrypted = encrypt_token(
                    new_refresh, settings.encryption_key
                )
                tokens.expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                await tokens.save()

                return new_access
            except Exception as e:
                err_str = str(e).lower()
                # Token revoked or invalid — don't retry
                if "invalid_grant" in err_str or "revoked" in err_str or "400" in err_str:
                    logger.warning(
                        "Spotify token revoked — user must re-authenticate",
                        user_id=str(user.id),
                        error=str(e),
                    )
                    return None

                if attempt < MAX_REFRESH_RETRIES - 1:
                    delay = RETRY_DELAYS[attempt]
                    logger.warning(
                        "Token refresh failed, retrying",
                        attempt=attempt + 1,
                        delay=delay,
                        error=str(e),
                        user_id=str(user.id),
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "Token refresh failed after all retries",
                        attempts=MAX_REFRESH_RETRIES,
                        error=str(e),
                        user_id=str(user.id),
                    )
                    return None

    return decrypt_token(tokens.access_token_encrypted, settings.encryption_key)
