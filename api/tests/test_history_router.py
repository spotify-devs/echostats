"""Tests for the history router endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware.auth import get_current_user


def _mock_user():
    user = MagicMock()
    user.id = "aabbccddeeff00112233aabb"
    user.spotify_id = "test-spotify-id"
    return user


def _make_history_item(**overrides):
    defaults = {
        "user_id": "aabbccddeeff00112233aabb",
        "track": {
            "spotify_id": "track123",
            "name": "Test Song",
            "artist_name": "Test Artist",
            "album_name": "Test Album",
            "album_image_url": "",
            "duration_ms": 210000,
        },
        "played_at": "2024-01-15T10:30:00",
        "ms_played": 210000,
        "source": "api",
        "context_type": "playlist",
        "context_uri": "spotify:playlist:abc",
    }
    defaults.update(overrides)
    return defaults


@pytest.fixture
def authed_client():
    app.dependency_overrides[get_current_user] = _mock_user
    transport = ASGITransport(app=app)
    yield AsyncClient(transport=transport, base_url="http://test")
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_get_history_returns_paginated(authed_client):
    item = MagicMock()
    # Make the item JSON-serializable by having model_dump return a dict
    item_data = _make_history_item()

    mock_find = MagicMock()
    mock_find.count = AsyncMock(return_value=1)
    mock_sort = MagicMock()
    mock_skip = MagicMock()
    mock_limit = MagicMock()
    mock_find.sort.return_value = mock_sort
    mock_sort.skip.return_value = mock_skip
    mock_skip.limit.return_value = mock_limit
    mock_limit.to_list = AsyncMock(return_value=[item_data])

    with patch("app.routers.history.ListeningHistory") as mock_cls:
        mock_cls.find = MagicMock(return_value=mock_find)
        mock_cls.user_id = "aabbccddeeff00112233aabb"
        mock_cls.track = MagicMock()
        mock_cls.played_at = MagicMock()

        async with authed_client as c:
            resp = await c.get("/api/v1/history?page=1&limit=10")

    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["page"] == 1
    assert data["limit"] == 10
    assert data["pages"] == 1
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_get_history_empty(authed_client):
    mock_find = MagicMock()
    mock_find.count = AsyncMock(return_value=0)
    mock_sort = MagicMock()
    mock_skip = MagicMock()
    mock_limit = MagicMock()
    mock_find.sort.return_value = mock_sort
    mock_sort.skip.return_value = mock_skip
    mock_skip.limit.return_value = mock_limit
    mock_limit.to_list = AsyncMock(return_value=[])

    with patch("app.routers.history.ListeningHistory") as mock_cls:
        mock_cls.find = MagicMock(return_value=mock_find)
        mock_cls.user_id = "aabbccddeeff00112233aabb"
        mock_cls.track = MagicMock()
        mock_cls.played_at = MagicMock()

        async with authed_client as c:
            resp = await c.get("/api/v1/history")

    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["pages"] == 0


@pytest.mark.asyncio
async def test_get_history_pagination(authed_client):
    mock_find = MagicMock()
    mock_find.count = AsyncMock(return_value=25)
    mock_sort = MagicMock()
    mock_skip = MagicMock()
    mock_limit = MagicMock()
    mock_find.sort.return_value = mock_sort
    mock_sort.skip.return_value = mock_skip
    mock_skip.limit.return_value = mock_limit
    mock_limit.to_list = AsyncMock(return_value=[_make_history_item()] * 10)

    with patch("app.routers.history.ListeningHistory") as mock_cls:
        mock_cls.find = MagicMock(return_value=mock_find)
        mock_cls.user_id = "aabbccddeeff00112233aabb"
        mock_cls.track = MagicMock()
        mock_cls.played_at = MagicMock()

        async with authed_client as c:
            resp = await c.get("/api/v1/history?page=2&limit=10")

    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 25
    assert data["page"] == 2
    assert data["pages"] == 3


@pytest.mark.asyncio
async def test_get_history_with_filters(authed_client):
    mock_find = MagicMock()
    mock_find.count = AsyncMock(return_value=0)
    mock_sort = MagicMock()
    mock_skip = MagicMock()
    mock_limit = MagicMock()
    mock_find.sort.return_value = mock_sort
    mock_sort.skip.return_value = mock_skip
    mock_skip.limit.return_value = mock_limit
    mock_limit.to_list = AsyncMock(return_value=[])

    with patch("app.routers.history.ListeningHistory") as mock_cls:
        mock_cls.find = MagicMock(return_value=mock_find)
        mock_cls.user_id = "aabbccddeeff00112233aabb"
        mock_cls.track = MagicMock()
        mock_cls.track.artist_name = "artist_filter"
        mock_cls.track.name = "track_filter"
        mock_cls.played_at = MagicMock()
        mock_cls.played_at.__ge__ = MagicMock(return_value="ge_filter")
        mock_cls.played_at.__le__ = MagicMock(return_value="le_filter")

        async with authed_client as c:
            resp = await c.get(
                "/api/v1/history?artist=TestArtist&track=TestTrack"
                "&start_date=2024-01-01&end_date=2024-12-31"
            )

    assert resp.status_code == 200
    # find is called twice: once for count, once for the query chain
    assert mock_cls.find.call_count == 2


@pytest.mark.asyncio
async def test_get_history_invalid_page(authed_client):
    async with authed_client as c:
        resp = await c.get("/api/v1/history?page=0")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_history_invalid_limit(authed_client):
    async with authed_client as c:
        resp = await c.get("/api/v1/history?limit=200")
    assert resp.status_code == 422
