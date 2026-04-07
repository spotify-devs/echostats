"""Spotify client tests — constructor, rate limiting, circuit breaker, API methods."""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.spotify_client import (
    CIRCUIT_FAILURE_THRESHOLD,
    SpotifyClient,
    SpotifyClientError,
    _circuit_failures,
    _circuit_open_until,
)


@pytest.fixture(autouse=True)
def _reset_circuit_state():
    """Clear global circuit-breaker state between tests."""
    _circuit_failures.clear()
    _circuit_open_until.clear()
    yield
    _circuit_failures.clear()
    _circuit_open_until.clear()


# ── Constructor ──────────────────────────────────────────────────────────────


def test_constructor_sets_auth_header():
    client = SpotifyClient("tok123", user_id="u1")
    assert client.access_token == "tok123"
    assert client.user_id == "u1"
    assert client._client.headers["authorization"] == "Bearer tok123"


# ── _request: logging ────────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("app.services.spotify_client.ApiLog")
async def test_request_logs_api_call(mock_api_log):
    """Each request creates an ApiLog document."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.content = b'{"ok": true}'
    mock_response.json.return_value = {"ok": True}

    log_instance = MagicMock()
    log_instance.insert = AsyncMock()
    mock_api_log.return_value = log_instance

    client = SpotifyClient("tok", user_id="u1")
    with patch.object(client._client, "request", new_callable=AsyncMock, return_value=mock_response):
        result = await client._request("GET", "/me")

    assert result == {"ok": True}
    mock_api_log.assert_called_once()
    call_kwargs = mock_api_log.call_args[1]
    assert call_kwargs["method"] == "GET"
    assert call_kwargs["endpoint"] == "/me"
    assert call_kwargs["status_code"] == 200


# ── _request: 429 rate limit ────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("app.services.spotify_client.ApiLog")
async def test_429_raises_spotify_client_error(mock_api_log):
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 429
    mock_response.headers = {"Retry-After": "10"}

    log_instance = MagicMock()
    log_instance.insert = AsyncMock()
    mock_api_log.return_value = log_instance

    client = SpotifyClient("tok", user_id="u1")
    with (
        patch.object(client._client, "request", new_callable=AsyncMock, return_value=mock_response),
        pytest.raises(SpotifyClientError) as exc_info,
    ):
        await client._request("GET", "/me")
    assert exc_info.value.status_code == 429


# ── Circuit breaker ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("app.services.spotify_client.ApiLog")
async def test_circuit_opens_after_threshold_failures(mock_api_log):
    """After CIRCUIT_FAILURE_THRESHOLD 5xx errors, the circuit opens (503)."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"

    log_instance = MagicMock()
    log_instance.insert = AsyncMock()
    mock_api_log.return_value = log_instance

    client = SpotifyClient("tok", user_id="u1")

    for _ in range(CIRCUIT_FAILURE_THRESHOLD):
        with (
            patch.object(client._client, "request", new_callable=AsyncMock, return_value=mock_response),
            pytest.raises(SpotifyClientError),
        ):
            await client._request("GET", "/me")

    # Next call should get 503 without even making a request
    with pytest.raises(SpotifyClientError) as exc_info:
        await client._request("GET", "/me")
    assert exc_info.value.status_code == 503
    assert "Circuit breaker open" in exc_info.value.message


@pytest.mark.asyncio
@patch("app.services.spotify_client.ApiLog")
async def test_circuit_resets_on_success(mock_api_log):
    """A successful request resets the failure counter."""
    log_instance = MagicMock()
    log_instance.insert = AsyncMock()
    mock_api_log.return_value = log_instance

    client = SpotifyClient("tok", user_id="u1")

    # Simulate some failures (but below threshold)
    fail_response = MagicMock(spec=httpx.Response)
    fail_response.status_code = 500
    fail_response.text = "error"
    for _ in range(CIRCUIT_FAILURE_THRESHOLD - 1):
        with (
            patch.object(client._client, "request", new_callable=AsyncMock, return_value=fail_response),
            pytest.raises(SpotifyClientError),
        ):
            await client._request("GET", "/me")

    assert _circuit_failures.get("u1", 0) == CIRCUIT_FAILURE_THRESHOLD - 1

    # Successful request resets
    ok_response = MagicMock(spec=httpx.Response)
    ok_response.status_code = 200
    ok_response.content = b'{"ok": true}'
    ok_response.json.return_value = {"ok": True}

    with patch.object(client._client, "request", new_callable=AsyncMock, return_value=ok_response):
        await client._request("GET", "/me")

    assert _circuit_failures.get("u1", 0) == 0


@pytest.mark.asyncio
@patch("app.services.spotify_client.ApiLog")
async def test_429_does_not_count_as_circuit_failure(mock_api_log):
    """Rate-limit (429) errors should NOT increment the circuit failure counter."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 429
    mock_response.headers = {"Retry-After": "5"}

    log_instance = MagicMock()
    log_instance.insert = AsyncMock()
    mock_api_log.return_value = log_instance

    client = SpotifyClient("tok", user_id="u1")
    for _ in range(10):
        with (
            patch.object(client._client, "request", new_callable=AsyncMock, return_value=mock_response),
            pytest.raises(SpotifyClientError),
        ):
            await client._request("GET", "/me")

    # Circuit should NOT be open
    assert _circuit_failures.get("u1", 0) == 0
    assert "u1" not in _circuit_open_until


# ── API method endpoints ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_recently_played_calls_correct_endpoint():
    client = SpotifyClient("tok", user_id="u1")
    client._request = AsyncMock(return_value={"items": []})
    await client.get_recently_played(limit=50, after=123)
    client._request.assert_awaited_once_with(
        "GET", "/me/player/recently-played", params={"limit": 50, "after": 123}
    )


@pytest.mark.asyncio
async def test_get_top_items_calls_correct_endpoint():
    client = SpotifyClient("tok", user_id="u1")
    client._request = AsyncMock(return_value={"items": []})
    await client.get_top_items("artists", time_range="short_term", limit=20, offset=0)
    client._request.assert_awaited_once_with(
        "GET", "/me/top/artists",
        params={"time_range": "short_term", "limit": 20, "offset": 0},
    )


@pytest.mark.asyncio
async def test_get_audio_features_calls_correct_endpoint():
    client = SpotifyClient("tok", user_id="u1")
    client._request = AsyncMock(return_value={"audio_features": []})
    await client.get_audio_features(["id1", "id2"])
    client._request.assert_awaited_once_with(
        "GET", "/audio-features", params={"ids": "id1,id2"}
    )


@pytest.mark.asyncio
async def test_get_user_playlists_calls_correct_endpoint():
    client = SpotifyClient("tok", user_id="u1")
    client._request = AsyncMock(return_value={"items": []})
    await client.get_user_playlists(limit=50, offset=0)
    client._request.assert_awaited_once_with(
        "GET", "/me/playlists", params={"limit": 50, "offset": 0}
    )


@pytest.mark.asyncio
async def test_get_saved_tracks_calls_correct_endpoint():
    client = SpotifyClient("tok", user_id="u1")
    client._request = AsyncMock(return_value={"items": []})
    await client.get_saved_tracks(limit=50, offset=10)
    client._request.assert_awaited_once_with(
        "GET", "/me/tracks", params={"limit": 50, "offset": 10}
    )


@pytest.mark.asyncio
async def test_get_current_user_calls_me():
    client = SpotifyClient("tok", user_id="u1")
    client._request = AsyncMock(return_value={"id": "me"})
    await client.get_current_user()
    client._request.assert_awaited_once_with("GET", "/me", params=None)


@pytest.mark.asyncio
async def test_close_closes_httpx_client():
    client = SpotifyClient("tok", user_id="u1")
    client._client.aclose = AsyncMock()
    await client.close()
    client._client.aclose.assert_awaited_once()
