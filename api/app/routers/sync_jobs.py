"""Sync job tracking endpoints."""

from datetime import UTC, datetime
from typing import Annotated, Any

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
) -> dict[str, Any]:
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
                "steps": [
                    {
                        "action": s.action,
                        "status": s.status,
                        "detail": s.detail,
                        "items": s.items,
                        "error": s.error,
                    }
                    for s in (job.steps or [])
                ],
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
) -> dict[str, Any]:
    """Get sync job statistics."""
    user_id = str(user.id)

    # Use aggregation instead of loading all completed jobs into memory
    stats_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$facet": {
            "by_status": [
                {"$group": {
                    "_id": "$status",
                    "count": {"$sum": 1},
                    "items": {"$sum": "$items_processed"},
                }},
            ],
            "total": [{"$count": "n"}],
            "last_completed": [
                {"$match": {"status": "completed"}},
                {"$sort": {"completed_at": -1}},
                {"$limit": 1},
                {"$project": {"completed_at": 1}},
            ],
        }},
    ]

    results = await SyncJob.aggregate(stats_pipeline).to_list()
    facets = results[0] if results else {}

    status_map = {r["_id"]: r for r in facets.get("by_status", [])}
    total_count = facets.get("total", [{}])
    total = total_count[0]["n"] if total_count else 0

    completed_info = status_map.get("completed", {})
    last_completed = facets.get("last_completed", [])

    return {
        "total_jobs": total,
        "completed": completed_info.get("count", 0),
        "failed": status_map.get("failed", {}).get("count", 0),
        "running": status_map.get("running", {}).get("count", 0),
        "total_items_synced": completed_info.get("items", 0),
        "last_sync_at": (
            last_completed[0]["completed_at"].isoformat()
            if last_completed and last_completed[0].get("completed_at")
            else None
        ),
    }


@router.post("/trigger")
async def trigger_sync(
    user: Annotated[User, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
) -> dict[str, Any]:
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
    from app.models.sync_job import SyncStep
    from app.services.analytics_service import compute_analytics_snapshot
    from app.services.sync_service import sync_playlists, sync_top_items

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
            job.steps.append(SyncStep(
                action="get_token", status="failed",
                detail="Could not obtain valid Spotify access token",
                completed_at=datetime.now(tz=UTC), error="Token expired",
            ))
            await job.save()
            return

        client = SpotifyClient(token, user_id=user_id)
        try:
            # Step 1: Recently played
            step1 = SyncStep(action="sync_recently_played", detail="Fetching recently played tracks")
            count = await sync_recently_played(client, user_id)
            step1.status = "completed"
            step1.items = count
            step1.detail = f"Fetched {count} new track{'s' if count != 1 else ''}"
            step1.completed_at = datetime.now(tz=UTC)
            job.steps.append(step1)

            # Step 2: Audio features
            if count > 0:
                step2 = SyncStep(action="enrich_audio_features", detail="Enriching audio features")
                enriched = await enrich_audio_features(client, batch_size=50)
                count += enriched
                step2.status = "completed"
                step2.items = enriched
                step2.detail = f"Enriched {enriched} track{'s' if enriched != 1 else ''}"
                step2.completed_at = datetime.now(tz=UTC)
                job.steps.append(step2)

            # Step 3: Sync playlists
            step_pl = SyncStep(action="sync_playlists", detail="Syncing playlists from Spotify")
            try:
                pl_count = await sync_playlists(client, user_id)
                step_pl.status = "completed"
                step_pl.items = pl_count
                step_pl.detail = f"Synced {pl_count} playlist{'s' if pl_count != 1 else ''}"
            except Exception as e:
                step_pl.status = "failed"
                step_pl.error = str(e)[:200]
                step_pl.detail = "Failed to sync playlists"
            step_pl.completed_at = datetime.now(tz=UTC)
            job.steps.append(step_pl)

            # Step 4: Sync top artists & tracks (refreshes artist genres)
            step_top = SyncStep(action="sync_top_items", detail="Syncing top artists & tracks")
            try:
                top_counts = await sync_top_items(client, user_id)
                top_total = top_counts["artists"] + top_counts["tracks"]
                step_top.status = "completed"
                step_top.items = top_total
                step_top.detail = f"Synced {top_counts['artists']} artists, {top_counts['tracks']} tracks"
            except Exception as e:
                step_top.status = "failed"
                step_top.error = str(e)[:200]
                step_top.detail = "Failed to sync top items"
            step_top.completed_at = datetime.now(tz=UTC)
            job.steps.append(step_top)

            job.status = "completed"
            job.items_processed = count
            job.completed_at = datetime.now(tz=UTC)
        finally:
            await client.close()

        # Step 3: Analytics refresh
        step3 = SyncStep(action="refresh_analytics", detail="Refreshing analytics")
        for period in ["week", "month", "all_time"]:
            try:
                await compute_analytics_snapshot(user_id, period)
            except Exception:
                pass
        step3.status = "completed"
        step3.detail = "Analytics refreshed for week, month, all_time"
        step3.completed_at = datetime.now(tz=UTC)
        job.steps.append(step3)
        logger.info("Manual sync complete", user_id=user_id, items=count)

    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)[:500]

    await job.save()
