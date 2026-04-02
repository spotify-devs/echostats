"""Token service tests — get_valid_access_token."""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.token_service import get_valid_access_token

ENCRYPTION_KEY = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"


def _make_user(user_id: str = "uid1") -> MagicMock:
    user = MagicMock()
    user.id = user_id
    return user


def _make_tokens(
    *,
    expires_at: datetime,
    access_enc: str = "enc_access",
    refresh_enc: str = "enc_refresh",
) -> MagicMock:
    tokens = MagicMock()
    tokens.user_id = "uid1"
    tokens.access_token_encrypted = access_enc
    tokens.refresh_token_encrypted = refresh_enc
    tokens.expires_at = expires_at
    tokens.save = AsyncMock()
    return tokens


@pytest.mark.asyncio
@patch("app.services.token_service.decrypt_token")
@patch("app.services.token_service.SpotifyTokens")
async def test_returns_decrypted_token_when_not_expired(mock_st, mock_decrypt):
    """When the token is still valid, returns the decrypted access token."""
    tokens = _make_tokens(expires_at=datetime.utcnow() + timedelta(hours=1))
    mock_st.find_one = AsyncMock(return_value=tokens)
    mock_decrypt.return_value = "plain_access_token"

    result = await get_valid_access_token(_make_user())

    assert result == "plain_access_token"
    mock_decrypt.assert_called_once_with(tokens.access_token_encrypted, ENCRYPTION_KEY)


@pytest.mark.asyncio
@patch("app.services.token_service.encrypt_token")
@patch("app.services.token_service.decrypt_token")
@patch("app.services.token_service.refresh_access_token", new_callable=AsyncMock)
@patch("app.services.token_service.SpotifyTokens")
async def test_refreshes_token_when_expired(mock_st, mock_refresh, mock_decrypt, mock_encrypt):
    """When the token expires within 5 minutes, it refreshes via Spotify."""
    tokens = _make_tokens(expires_at=datetime.utcnow() - timedelta(minutes=1))
    mock_st.find_one = AsyncMock(return_value=tokens)
    mock_decrypt.return_value = "plain_refresh"
    mock_refresh.return_value = {
        "access_token": "new_access",
        "refresh_token": "new_refresh",
        "expires_in": 3600,
    }
    mock_encrypt.return_value = "encrypted_new"

    result = await get_valid_access_token(_make_user())

    assert result == "new_access"
    mock_refresh.assert_awaited_once_with("plain_refresh")
    tokens.save.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.services.token_service.asyncio.sleep", new_callable=AsyncMock)
@patch("app.services.token_service.decrypt_token")
@patch("app.services.token_service.refresh_access_token", new_callable=AsyncMock)
@patch("app.services.token_service.SpotifyTokens")
async def test_retry_on_transient_errors(mock_st, mock_refresh, mock_decrypt, mock_sleep):
    """Transient errors trigger retries (up to 3 attempts) before returning None."""
    tokens = _make_tokens(expires_at=datetime.utcnow() - timedelta(minutes=1))
    mock_st.find_one = AsyncMock(return_value=tokens)
    mock_decrypt.return_value = "plain_refresh"
    mock_refresh.side_effect = RuntimeError("connection timeout")

    result = await get_valid_access_token(_make_user())

    assert result is None
    assert mock_refresh.await_count == 3
    # Two sleep calls (between attempts 1→2 and 2→3)
    assert mock_sleep.await_count == 2


@pytest.mark.asyncio
@patch("app.services.token_service.decrypt_token")
@patch("app.services.token_service.refresh_access_token", new_callable=AsyncMock)
@patch("app.services.token_service.SpotifyTokens")
async def test_revoked_token_returns_none_immediately(mock_st, mock_refresh, mock_decrypt):
    """If the error contains 'invalid_grant', returns None without retrying."""
    tokens = _make_tokens(expires_at=datetime.utcnow() - timedelta(minutes=1))
    mock_st.find_one = AsyncMock(return_value=tokens)
    mock_decrypt.return_value = "plain_refresh"
    mock_refresh.side_effect = RuntimeError("invalid_grant: token revoked")

    result = await get_valid_access_token(_make_user())

    assert result is None
    mock_refresh.assert_awaited_once()  # No retries


@pytest.mark.asyncio
@patch("app.services.token_service.SpotifyTokens")
async def test_returns_none_when_no_tokens(mock_st):
    """When no tokens exist for the user, returns None."""
    mock_st.find_one = AsyncMock(return_value=None)

    result = await get_valid_access_token(_make_user())

    assert result is None
