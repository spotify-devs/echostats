"""Sync job tracking endpoints."""

from datetime import UTC, datetime
from typing import Annotated

import structlog
from beanie import PydanticObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, Query

from app.middleware.auth import get_current_user
from app.models.sync_job import SyncJob
from app.models.user import User
from app.services.spotify_client import SpotifyClient
from app.services.sync_service import enrich_audio_features, sync_recently_played
from app.services.token_service import get_valid_access_token

logger = structlog.get_logger()
router = APIRouter()


@router.get("")
async def get_sync_jobs(
    user: Annotated[User, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = None,
    job_type: str | None = None,
) -> dict:
    """Get paginated sync jobs for the current user."""
    query_filters = [SyncJob.user_id == str(user.id)]

    if status:
        query_filters.append(SyncJob.status == status)
    if job_type:
        query_filters.append(SyncJob.job_type == job_type)

    total = await SyncJob.find(*query_filters).count()
    skip = (page - 1) * limit
    items = await (
        SyncJob.find(*query_filters)
        .sort("-created_at")
        .skip(skip)
        .limit(limit)
        .to_list()
    )

    return {
        "items": [
            {
                "id": str(job.id),
                "job_type": job.job_type,
                "status": job.status,
                "items_processed": job.items_processed,
                "items_total": job.items_total,
                "error_message": job.error_message,
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                "created_at": job.created_at.isoformat(),
            }
            for job in items
        ],
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
    }


@router.get("/stats")
async def get_sync_stats(
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Get sync job statistics."""
    user_id = str(user.id)
    total = await SyncJob.find(SyncJob.user_id == user_id).count()
    completed = await SyncJob.find(
        SyncJob.user_id == user_id, SyncJob.status == "completed"
    ).count()
    failed = await SyncJob.find(
        SyncJob.user_id == user_id, SyncJob.status == "failed"
    ).count()
    running = await SyncJob.find(
        SyncJob.user_id == user_id, SyncJob.status == "running"
    ).count()

    # Last successful sync
    last_completed = await (
        SyncJob.find(SyncJob.user_id == user_id, SyncJob.status == "completed")
        .sort("-completed_at")
        .limit(1)
        .to_list()
    )

    # Total items synced
    all_completed = await SyncJob.find(
        SyncJob.user_id == user_id, SyncJob.status == "completed"
    ).to_list()
    total_items = sum(job.items_processed for job in all_completed)

    return {
        "total_jobs": total,
        "completed": completed,
        "failed": failed,
        "running": running,
        "total_items_synced": total_items,
        "last_sync_at": (
            last_completed[0].completed_at.isoformat()
            if last_completed
            else None
        ),
    }


@router.post("/trigger")
async def trigger_sync(
    user: Annotated[User, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
) -> dict:
    """Trigger a manual data sync."""
    # Check if a sync is already running
    running = await SyncJob.find(
        SyncJob.user_id == str(user.id), SyncJob.status == "running"
    ).count()
    if running > 0:
        return {"status": "already_running", "message": "A sync is already in progress"}

    job = SyncJob(
        user_id=str(user.id),
        job_type="periodic",
        status="running",
        started_at=datetime.now(tz=UTC),
    )
    await job.insert()

    background_tasks.add_task(_run_manual_sync, str(user.id), str(job.id))

    return {
        "status": "started",
        "job_id": str(job.id),
        "message": "Sync started in background",
    }


async def _run_manual_sync(user_id: str, job_id: str) -> None:
    """Run a manual sync in the background."""
    from app.services.analytics_service import compute_analytics_snapshot

    job = await SyncJob.get(PydanticObjectId(job_id))
    if not job:
        return

    try:
        user = await User.get(PydanticObjectId(user_id))
        if not user:
            job.status = "failed"
            job.error_message = "User not found"
            await job.save()
            return

        token = await get_valid_access_token(user)
        if not token:
            job.status = "failed"
            job.error_message = "No valid Spotify token"
            await job.save()
            return

        client = SpotifyClient(token, user_id=user_id)
        try:
            count = await sync_recently_played(client, user_id)
            if count > 0:
                count += await enrich_audio_features(client, batch_size=50)
            job.status = "completed"
            job.items_processed = count
            job.completed_at = datetime.now(tz=UTC)
        finally:
            await client.close()

        # Refresh analytics so dashboard updates immediately
        for period in ["week", "month", "all_time"]:
            try:
                await compute_analytics_snapshot(user_id, period)
            except Exception:
                pass
        logger.info("Manual sync + analytics refresh complete", user_id=user_id, items=count)

    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)[:500]

    await job.save()
