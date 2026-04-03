"""Tests for the analytics router endpoints."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware.auth import get_current_user
from app.models.analytics import TopItem


def _mock_user():
    user = MagicMock()
    user.id = "aabbccddeeff00112233aabb"
    user.spotify_id = "test-spotify-id"
    return user


def _make_top_item(name, play_count, rank):
    return TopItem(name=name, play_count=play_count, rank=rank)


def _make_snapshot(**overrides):
    """Build a MagicMock that quacks like an AnalyticsSnapshot (avoids Beanie init)."""
    top_artists = [_make_top_item("Artist 1", 10, 1)]
    top_tracks = [_make_top_item("Track 1", 8, 1)]
    top_albums = [_make_top_item("Album 1", 6, 1)]
    top_genres = [_make_top_item("pop", 20, 1)]

    defaults = {
        "user_id": "aabbccddeeff00112233aabb",
        "period": "week",
        "total_tracks_played": 42,
        "total_ms_played": 7_200_000,
        "unique_tracks": 30,
        "unique_artists": 10,
        "unique_albums": 8,
        "unique_genres": 5,
        "listening_streak_days": 3,
        "top_artists": top_artists,
        "top_tracks": top_tracks,
        "top_albums": top_albums,
        "top_genres": top_genres,
        "hourly_distribution": [],
        "daily_distribution": [],
        "avg_audio_features": None,
        "computed_at": datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC),
    }
    defaults.update(overrides)
    snap = MagicMock()
    for k, v in defaults.items():
        setattr(snap, k, v)
    return snap


@pytest.fixture
def authed_client():
    app.dependency_overrides[get_current_user] = _mock_user
    transport = ASGITransport(app=app)
    yield AsyncClient(transport=transport, base_url="http://test")
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_overview_returns_200_with_valid_period(authed_client):
    snapshot = _make_snapshot(period="week")

    with patch(
        "app.routers.analytics.get_or_compute_snapshot",
        new_callable=AsyncMock,
        return_value=snapshot,
    ):
        async with authed_client as c:
            resp = await c.get("/api/v1/analytics/overview?period=week")

    assert resp.status_code == 200
    data = resp.json()
    assert data["period"] == "week"
    assert data["total_tracks_played"] == 42
    assert data["total_hours"] == 2.0
    assert data["unique_tracks"] == 30
    assert data["unique_artists"] == 10
    assert len(data["top_artists"]) == 1
    assert data["top_artists"][0]["name"] == "Artist 1"
    assert "computed_at" in data


@pytest.mark.asyncio
async def test_overview_invalid_period_returns_422(authed_client):
    async with authed_client as c:
        resp = await c.get("/api/v1/analytics/overview?period=invalid")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_overview_default_period_is_all_time(authed_client):
    snapshot = _make_snapshot(period="all_time")

    with patch(
        "app.routers.analytics.get_or_compute_snapshot",
        new_callable=AsyncMock,
        return_value=snapshot,
    ) as mock_compute:
        async with authed_client as c:
            resp = await c.get("/api/v1/analytics/overview")

    assert resp.status_code == 200
    mock_compute.assert_awaited_once_with("aabbccddeeff00112233aabb", "all_time")


@pytest.mark.asyncio
async def test_overview_502_on_service_error(authed_client):
    with patch(
        "app.routers.analytics.get_or_compute_snapshot",
        new_callable=AsyncMock,
        side_effect=RuntimeError("db down"),
    ):
        async with authed_client as c:
            resp = await c.get("/api/v1/analytics/overview?period=week")

    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_refresh_returns_refreshed_status(authed_client):
    with patch(
        "app.routers.analytics.compute_analytics_snapshot",
        new_callable=AsyncMock,
    ) as mock_compute:
        async with authed_client as c:
            resp = await c.post("/api/v1/analytics/refresh?period=month")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "refreshed"
    assert data["periods"] == ["month"]
    mock_compute.assert_awaited_once_with("aabbccddeeff00112233aabb", "month")


@pytest.mark.asyncio
async def test_refresh_all_time_refreshes_all_periods(authed_client):
    with patch(
        "app.routers.analytics.compute_analytics_snapshot",
        new_callable=AsyncMock,
    ) as mock_compute:
        async with authed_client as c:
            resp = await c.post("/api/v1/analytics/refresh?period=all_time")

    assert resp.status_code == 200
    data = resp.json()
    assert set(data["periods"]) == {"week", "month", "quarter", "year", "all_time"}
    assert mock_compute.await_count == 5


@pytest.mark.asyncio
async def test_refresh_502_on_service_error(authed_client):
    with patch(
        "app.routers.analytics.compute_analytics_snapshot",
        new_callable=AsyncMock,
        side_effect=RuntimeError("fail"),
    ):
        async with authed_client as c:
            resp = await c.post("/api/v1/analytics/refresh?period=week")

    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_trend_returns_points_weekly(authed_client):
    mock_agg = MagicMock()
    mock_agg.to_list = AsyncMock(return_value=[
        {"label": "2024-01-01", "plays": 10, "ms": 3_600_000},
        {"label": "2024-01-02", "plays": 5, "ms": 1_800_000},
    ])

    with patch("app.routers.analytics.DailyRollup") as mock_rollup:
        mock_rollup.aggregate = MagicMock(return_value=mock_agg)
        async with authed_client as c:
            resp = await c.get("/api/v1/analytics/trend?period=week")

    assert resp.status_code == 200
    data = resp.json()
    assert data["period"] == "week"
    assert data["granularity"] == "%Y-%m-%d"
    assert len(data["points"]) == 2
    assert data["points"][0]["hours"] == 1.0


@pytest.mark.asyncio
async def test_trend_returns_points_quarter(authed_client):
    mock_agg = MagicMock()
    mock_agg.to_list = AsyncMock(return_value=[
        {"label": "2024-W01", "plays": 50, "ms": 18_000_000},
    ])

    with patch("app.routers.analytics.DailyRollup") as mock_rollup:
        mock_rollup.aggregate = MagicMock(return_value=mock_agg)
        async with authed_client as c:
            resp = await c.get("/api/v1/analytics/trend?period=quarter")

    assert resp.status_code == 200
    data = resp.json()
    assert data["granularity"] == "%Y-W%V"


@pytest.mark.asyncio
async def test_trend_returns_points_all_time(authed_client):
    mock_agg = MagicMock()
    mock_agg.to_list = AsyncMock(return_value=[
        {"label": "2024-01", "plays": 200, "ms": 72_000_000},
    ])

    with patch("app.routers.analytics.DailyRollup") as mock_rollup:
        mock_rollup.aggregate = MagicMock(return_value=mock_agg)
        async with authed_client as c:
            resp = await c.get("/api/v1/analytics/trend?period=all_time")

    assert resp.status_code == 200
    data = resp.json()
    assert data["granularity"] == "%Y-%m"


@pytest.mark.asyncio
async def test_trend_502_on_error(authed_client):
    with patch("app.routers.analytics.DailyRollup") as mock_rollup:
        mock_rollup.aggregate = MagicMock(side_effect=RuntimeError("db error"))
        async with authed_client as c:
            resp = await c.get("/api/v1/analytics/trend?period=week")

    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_rollup_status_returns_status(authed_client):
    with patch(
        "app.routers.analytics.get_rollup_status",
        new_callable=AsyncMock,
        return_value={"has_rollups": True, "total_days": 30, "date_range": {}},
    ):
        async with authed_client as c:
            resp = await c.get("/api/v1/analytics/rollup-status")

    assert resp.status_code == 200
    data = resp.json()
    assert data["has_rollups"] is True


@pytest.mark.asyncio
async def test_rollup_status_502_on_error(authed_client):
    with patch(
        "app.routers.analytics.get_rollup_status",
        new_callable=AsyncMock,
        side_effect=RuntimeError("fail"),
    ):
        async with authed_client as c:
            resp = await c.get("/api/v1/analytics/rollup-status")

    assert resp.status_code == 502
