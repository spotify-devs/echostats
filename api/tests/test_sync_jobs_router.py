"""Tests for the sync jobs router endpoints."""

from datetime import UTC, datetime
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


def _make_sync_job(**overrides):
    defaults = {
        "id": "660000000000000000000001",
        "user_id": "aabbccddeeff00112233aabb",
        "job_type": "periodic",
        "status": "completed",
        "items_processed": 50,
        "items_total": 50,
        "error_message": "",
        "started_at": datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC),
        "completed_at": datetime(2024, 1, 1, 12, 1, 0, tzinfo=UTC),
        "created_at": datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC),
        "steps": [],
    }
    defaults.update(overrides)
    job = MagicMock()
    for k, v in defaults.items():
        setattr(job, k, v)
    return job


@pytest.fixture
def authed_client():
    app.dependency_overrides[get_current_user] = _mock_user
    transport = ASGITransport(app=app)
    yield AsyncClient(transport=transport, base_url="http://test")
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_get_sync_jobs_returns_list(authed_client):
    job = _make_sync_job()

    mock_find = MagicMock()
    mock_find.count = AsyncMock(return_value=1)
    mock_sort = MagicMock()
    mock_skip = MagicMock()
    mock_limit = MagicMock()
    mock_find.sort.return_value = mock_sort
    mock_sort.skip.return_value = mock_skip
    mock_skip.limit.return_value = mock_limit
    mock_limit.to_list = AsyncMock(return_value=[job])

    with patch("app.routers.sync_jobs.SyncJob") as mock_cls:
        mock_cls.find = MagicMock(return_value=mock_find)
        mock_cls.user_id = "aabbccddeeff00112233aabb"
        mock_cls.status = "completed"
        mock_cls.job_type = "periodic"

        async with authed_client as c:
            resp = await c.get("/api/v1/sync-jobs")

    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["status"] == "completed"
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_get_sync_jobs_empty(authed_client):
    mock_find = MagicMock()
    mock_find.count = AsyncMock(return_value=0)
    mock_sort = MagicMock()
    mock_skip = MagicMock()
    mock_limit = MagicMock()
    mock_find.sort.return_value = mock_sort
    mock_sort.skip.return_value = mock_skip
    mock_skip.limit.return_value = mock_limit
    mock_limit.to_list = AsyncMock(return_value=[])

    with patch("app.routers.sync_jobs.SyncJob") as mock_cls:
        mock_cls.find = MagicMock(return_value=mock_find)
        mock_cls.user_id = "aabbccddeeff00112233aabb"
        mock_cls.status = "completed"
        mock_cls.job_type = "periodic"

        async with authed_client as c:
            resp = await c.get("/api/v1/sync-jobs")

    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["pages"] == 1


@pytest.mark.asyncio
async def test_get_sync_stats(authed_client):
    mock_agg = MagicMock()
    mock_agg.to_list = AsyncMock(return_value=[{
        "by_status": [
            {"_id": "completed", "count": 10, "items": 500},
            {"_id": "failed", "count": 2, "items": 0},
        ],
        "total": [{"n": 12}],
        "last_completed": [{"completed_at": datetime(2024, 6, 1, 12, 0, 0, tzinfo=UTC)}],
    }])

    with patch("app.routers.sync_jobs.SyncJob") as mock_cls:
        mock_cls.aggregate = MagicMock(return_value=mock_agg)

        async with authed_client as c:
            resp = await c.get("/api/v1/sync-jobs/stats")

    assert resp.status_code == 200
    data = resp.json()
    assert data["total_jobs"] == 12
    assert data["completed"] == 10
    assert data["failed"] == 2
    assert data["total_items_synced"] == 500
    assert data["last_sync_at"] is not None


@pytest.mark.asyncio
async def test_get_sync_stats_empty(authed_client):
    mock_agg = MagicMock()
    mock_agg.to_list = AsyncMock(return_value=[{
        "by_status": [],
        "total": [],
        "last_completed": [],
    }])

    with patch("app.routers.sync_jobs.SyncJob") as mock_cls:
        mock_cls.aggregate = MagicMock(return_value=mock_agg)

        async with authed_client as c:
            resp = await c.get("/api/v1/sync-jobs/stats")

    assert resp.status_code == 200
    data = resp.json()
    assert data["total_jobs"] == 0
    assert data["completed"] == 0
    assert data["last_sync_at"] is None


@pytest.mark.asyncio
async def test_trigger_sync_starts_job(authed_client):
    mock_find = MagicMock()
    mock_find.count = AsyncMock(return_value=0)

    mock_job = MagicMock()
    mock_job.id = "660000000000000000000099"
    mock_job.insert = AsyncMock()

    with patch("app.routers.sync_jobs.SyncJob") as mock_cls:
        mock_cls.find = MagicMock(return_value=mock_find)
        mock_cls.user_id = "aabbccddeeff00112233aabb"
        mock_cls.status = "running"
        mock_cls.return_value = mock_job
        # Background task calls SyncJob.get(); return None so it exits early
        mock_cls.get = AsyncMock(return_value=None)

        async with authed_client as c:
            resp = await c.post("/api/v1/sync-jobs/trigger")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "started"
    assert data["job_id"] == "660000000000000000000099"
    mock_job.insert.assert_awaited_once()


@pytest.mark.asyncio
async def test_trigger_sync_already_running(authed_client):
    mock_find = MagicMock()
    mock_find.count = AsyncMock(return_value=1)

    with patch("app.routers.sync_jobs.SyncJob") as mock_cls:
        mock_cls.find = MagicMock(return_value=mock_find)
        mock_cls.user_id = "aabbccddeeff00112233aabb"
        mock_cls.status = "running"

        async with authed_client as c:
            resp = await c.post("/api/v1/sync-jobs/trigger")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "already_running"
