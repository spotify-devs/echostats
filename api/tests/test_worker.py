"""Worker task tests."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.tasks.worker import (
    _reap_stale_jobs,
    cleanup_stale_jobs,
    startup,
    sync_all_users,
)


@pytest.mark.asyncio
@patch("app.models.user.User")
async def test_sync_all_users_no_users(mock_user):
    """When no users exist, the function completes without errors."""
    ctx = {"db_initialized": True}
    mock_user.find_all.return_value.to_list = AsyncMock(return_value=[])
    await sync_all_users(ctx)
    mock_user.find_all.return_value.to_list.assert_called_once()


@pytest.mark.asyncio
@patch("app.services.analytics_service.compute_analytics_snapshot", new_callable=AsyncMock)
@patch("app.services.rollup_service.update_rollup_for_date", new_callable=AsyncMock)
@patch("app.services.sync_service.sync_playlists", new_callable=AsyncMock, return_value=2)
@patch("app.services.sync_service.sync_top_items", new_callable=AsyncMock, return_value={"artists": 1, "tracks": 1})
@patch("app.services.sync_service.enrich_audio_features", new_callable=AsyncMock, return_value=0)
@patch("app.services.sync_service.sync_recently_played", new_callable=AsyncMock, return_value=5)
@patch("app.services.spotify_client.SpotifyClient")
@patch("app.services.token_service.get_valid_access_token", new_callable=AsyncMock, return_value="tok")
@patch("app.models.sync_job.SyncStep")
@patch("app.models.sync_job.SyncJob")
@patch("app.models.user.User")
async def test_sync_all_users_processes_users(
    mock_user, mock_sync_job, mock_sync_step, mock_token, mock_spotify_client,
    mock_sync_rp, mock_enrich, mock_sync_top, mock_sync_pl,
    mock_rollup, mock_analytics,
):
    """Sync creates a SyncJob and processes each user."""
    user = MagicMock()
    user.id = "user123"
    mock_user.find_all.return_value.to_list = AsyncMock(return_value=[user])

    job = MagicMock()
    job.steps = []
    job.insert = AsyncMock()
    job.save = AsyncMock()
    mock_sync_job.return_value = job

    step = MagicMock()
    mock_sync_step.return_value = step

    client_instance = AsyncMock()
    client_instance.close = AsyncMock()
    mock_spotify_client.return_value = client_instance

    ctx = {"db_initialized": True}
    await sync_all_users(ctx)

    job.insert.assert_awaited_once()
    mock_sync_rp.assert_awaited_once()
    job.save.assert_awaited()
    assert job.status == "completed"


@pytest.mark.asyncio
@patch("app.services.spotify_client.SpotifyClient")
@patch("app.services.token_service.get_valid_access_token", new_callable=AsyncMock, return_value=None)
@patch("app.models.sync_job.SyncStep")
@patch("app.models.sync_job.SyncJob")
@patch("app.models.user.User")
async def test_sync_all_users_no_token_marks_failed(
    mock_user, mock_sync_job, mock_sync_step, mock_token, mock_spotify_client,
):
    """When token is unavailable, the job is marked as failed."""
    user = MagicMock()
    user.id = "user123"
    mock_user.find_all.return_value.to_list = AsyncMock(return_value=[user])

    job = MagicMock()
    job.steps = []
    job.insert = AsyncMock()
    job.save = AsyncMock()
    mock_sync_job.return_value = job

    step = MagicMock()
    mock_sync_step.return_value = step

    ctx = {"db_initialized": True}
    await sync_all_users(ctx)

    assert job.status == "failed"
    job.save.assert_awaited()


@pytest.mark.asyncio
@patch("app.models.sync_job.SyncJob")
async def test_reap_stale_jobs_marks_failed(mock_sync_job):
    """Stale running jobs get marked as failed."""
    stale_job = MagicMock()
    stale_job.status = "running"
    stale_job.save = AsyncMock()

    mock_sync_job.find.return_value.to_list = AsyncMock(return_value=[stale_job])

    cleaned = await _reap_stale_jobs()
    assert cleaned == 1
    assert stale_job.status == "failed"
    assert "timed out" in stale_job.error_message.lower()
    stale_job.save.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.models.sync_job.SyncJob")
async def test_reap_stale_jobs_no_stale(mock_sync_job):
    """When no stale jobs exist, returns 0."""
    mock_sync_job.find.return_value.to_list = AsyncMock(return_value=[])
    cleaned = await _reap_stale_jobs()
    assert cleaned == 0


@pytest.mark.asyncio
@patch("app.models.sync_job.SyncJob")
async def test_reap_stale_jobs_multiple(mock_sync_job):
    """Multiple stale jobs are all cleaned up."""
    jobs = []
    for _ in range(3):
        j = MagicMock()
        j.status = "running"
        j.save = AsyncMock()
        jobs.append(j)

    mock_sync_job.find.return_value.to_list = AsyncMock(return_value=jobs)

    cleaned = await _reap_stale_jobs()
    assert cleaned == 3
    for j in jobs:
        assert j.status == "failed"
        j.save.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.tasks.worker._reap_stale_jobs", new_callable=AsyncMock, return_value=0)
async def test_cleanup_stale_jobs_calls_reap(mock_reap):
    ctx = {"db_initialized": True}
    await cleanup_stale_jobs(ctx)
    mock_reap.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.tasks.worker._reap_stale_jobs", new_callable=AsyncMock, return_value=0)
@patch("app.database.init_db", new_callable=AsyncMock)
async def test_startup_initializes_db(mock_init_db, mock_reap):
    ctx: dict = {}
    await startup(ctx)
    mock_init_db.assert_awaited_once()
    assert ctx["db_initialized"] is True
    mock_reap.assert_awaited_once()
