"""Analytics API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.middleware.auth import get_current_user
from app.models.analytics import AnalyticsSnapshot
from app.models.user import User
from app.services.analytics_service import compute_analytics_snapshot

router = APIRouter()


@router.get("/overview")
async def get_overview(
    user: Annotated[User, Depends(get_current_user)],
    period: str = Query("all_time", pattern="^(week|month|quarter|year|all_time)$"),
) -> dict:
    """Get analytics overview for a time period."""
    snapshot = await AnalyticsSnapshot.find_one(
        AnalyticsSnapshot.user_id == str(user.id),
        AnalyticsSnapshot.period == period,
    )

    if not snapshot:
        snapshot = await compute_analytics_snapshot(str(user.id), period)

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
) -> dict:
    """Force recompute analytics for a time period."""
    snapshot = await compute_analytics_snapshot(str(user.id), period)
    return {
        "status": "refreshed",
        "period": period,
        "computed_at": snapshot.computed_at.isoformat(),
    }
