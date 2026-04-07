"""Analytics API endpoints."""

from datetime import datetime, timedelta
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query

from app.middleware.auth import get_current_user
from app.models.rollup import DailyRollup
from app.models.user import User
from app.services.analytics_service import compute_analytics_snapshot, get_or_compute_snapshot
from app.services.rollup_service import get_rollup_status

router = APIRouter()
logger = structlog.get_logger()


@router.get("/overview")
async def get_overview(
    user: Annotated[User, Depends(get_current_user)],
    period: str = Query("all_time", pattern="^(week|month|quarter|year|all_time)$"),
) -> dict[str, Any]:
    """Get analytics overview for a time period."""
    try:
        snapshot = await get_or_compute_snapshot(str(user.id), period)
    except Exception as e:
        logger.error("Analytics overview failed", user_id=str(user.id), period=period, error=str(e))
        raise HTTPException(status_code=502, detail="Analytics computation failed — please retry")

    return {
        "period": period,
        "total_tracks_played": snapshot.total_tracks_played,
        "total_ms_played": snapshot.total_ms_played,
        "total_hours": round(snapshot.total_ms_played / 3_600_000, 1),
        "unique_tracks": snapshot.unique_tracks,
        "unique_artists": snapshot.unique_artists,
        "unique_albums": snapshot.unique_albums,
        "unique_genres": snapshot.unique_genres,
        "listening_streak_days": snapshot.listening_streak_days,
        "top_artists": [item.model_dump() for item in snapshot.top_artists[:10]],
        "top_tracks": [item.model_dump() for item in snapshot.top_tracks[:10]],
        "top_albums": [item.model_dump() for item in snapshot.top_albums[:10]],
        "top_genres": [item.model_dump() for item in snapshot.top_genres[:10]],
        "hourly_distribution": [item.model_dump() for item in snapshot.hourly_distribution],
        "daily_distribution": [item.model_dump() for item in snapshot.daily_distribution],
        "avg_audio_features": (
            snapshot.avg_audio_features.model_dump() if snapshot.avg_audio_features else None
        ),
        "computed_at": snapshot.computed_at.isoformat(),
    }


@router.post("/refresh")
async def refresh_analytics(
    user: Annotated[User, Depends(get_current_user)],
    period: str = Query("all_time", pattern="^(week|month|quarter|year|all_time)$"),
) -> dict[str, Any]:
    """Force recompute analytics for a time period (or all periods)."""
    periods = [period]
    if period == "all_time":
        periods = ["week", "month", "quarter", "year", "all_time"]

    try:
        for p in periods:
            await compute_analytics_snapshot(str(user.id), p)
    except Exception as e:
        logger.error("Analytics refresh failed", user_id=str(user.id), periods=periods, error=str(e))
        raise HTTPException(status_code=502, detail="Analytics refresh failed — please retry")

    return {
        "status": "refreshed",
        "periods": periods,
        "computed_at": datetime.utcnow().isoformat(),
    }


@router.get("/trend")
async def get_trend(
    user: Annotated[User, Depends(get_current_user)],
    period: str = Query("all_time", pattern="^(week|month|quarter|year|all_time)$"),
) -> dict[str, Any]:
    """Get chronological listening trend data from DailyRollups.

    Returns data points grouped by appropriate granularity:
    - week/month: daily
    - quarter: weekly
    - year/all_time: monthly
    """
    user_id = str(user.id)
    now = datetime.utcnow()

    match_filter: dict[str, Any] = {"user_id": user_id}
    if period == "week":
        start = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        match_filter["date"] = {"$gte": start}
        group_format = "%Y-%m-%d"
    elif period == "month":
        start = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        match_filter["date"] = {"$gte": start}
        group_format = "%Y-%m-%d"
    elif period == "quarter":
        start = (now - timedelta(days=90)).strftime("%Y-%m-%d")
        match_filter["date"] = {"$gte": start}
        # Group by ISO week
        group_format = "%Y-W%V"
    elif period == "year":
        start = (now - timedelta(days=365)).strftime("%Y-%m-%d")
        match_filter["date"] = {"$gte": start}
        group_format = "%Y-%m"
    else:
        group_format = "%Y-%m"

    try:
        if group_format in ("%Y-%m-%d",):
            # Daily granularity: each rollup doc is one day
            results = await DailyRollup.aggregate([
                {"$match": match_filter},
                {"$project": {
                    "_id": 0,
                    "label": "$date",
                    "plays": "$total_plays",
                    "ms": "$total_ms",
                }},
                {"$sort": {"label": 1}},
            ], allowDiskUse=True).to_list()
        elif group_format == "%Y-W%V":
            # Weekly granularity
            results = await DailyRollup.aggregate([
                {"$match": match_filter},
                {"$addFields": {"parsed_date": {"$dateFromString": {"dateString": "$date", "format": "%Y-%m-%d"}}}},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-W%V", "date": "$parsed_date"}},
                    "plays": {"$sum": "$total_plays"},
                    "ms": {"$sum": "$total_ms"},
                }},
                {"$sort": {"_id": 1}},
                {"$project": {"_id": 0, "label": "$_id", "plays": 1, "ms": 1}},
            ], allowDiskUse=True).to_list()
        else:
            # Monthly granularity
            results = await DailyRollup.aggregate([
                {"$match": match_filter},
                {"$group": {
                    "_id": {"$substrBytes": ["$date", 0, 7]},
                    "plays": {"$sum": "$total_plays"},
                    "ms": {"$sum": "$total_ms"},
                }},
                {"$sort": {"_id": 1}},
                {"$project": {"_id": 0, "label": "$_id", "plays": 1, "ms": 1}},
            ], allowDiskUse=True).to_list()
    except Exception as e:
        logger.error("Trend query failed", user_id=user_id, period=period, error=str(e))
        raise HTTPException(status_code=502, detail="Failed to compute trend data")

    # Add hours for convenience
    for r in results:
        r["hours"] = round(r["ms"] / 3_600_000, 1)

    return {"period": period, "granularity": group_format, "points": results}


@router.get("/rollup-status")
async def rollup_status(
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    """Get rollup build status for the current user."""
    try:
        return await get_rollup_status(str(user.id))
    except Exception as e:
        logger.error("Rollup status check failed", user_id=str(user.id), error=str(e))
        raise HTTPException(status_code=502, detail="Failed to check rollup status")


@router.post("/rollup-build")
async def trigger_rollup_build(
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    """Trigger a background rollup build for the current user."""
    from arq.connections import ArqRedis, create_pool

    from app.config import settings as app_settings
    from app.models.sync_job import SyncJob

    user_id = str(user.id)

    # Check if a build is already running
    existing = await SyncJob.find_one(
        {"user_id": user_id, "job_type": "rollup_build", "status": "running"},
    )
    if existing:
        return {"status": "already_running", "job_id": str(existing.id)}

    # Create a tracking job
    job = SyncJob(
        user_id=user_id,
        job_type="rollup_build",
        status="pending",
    )
    await job.insert()

    # Enqueue ARQ task
    try:
        from arq.connections import RedisSettings

        redis_settings = RedisSettings.from_dsn(app_settings.redis_url)
        redis: ArqRedis = await create_pool(redis_settings)
        await redis.enqueue_job("build_user_rollups", user_id, str(job.id))
        await redis.aclose()
    except Exception as e:
        logger.error("Failed to enqueue rollup build", user_id=user_id, error=str(e))
        job.status = "failed"
        job.error_message = f"Failed to enqueue: {e}"
        await job.save()
        raise HTTPException(status_code=502, detail="Failed to start rollup build")

    return {"status": "started", "job_id": str(job.id)}
