"""Genre analytics API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.middleware.auth import get_current_user
from app.models.analytics import AnalyticsSnapshot
from app.models.user import User
from app.services.analytics_service import compute_analytics_snapshot

router = APIRouter()


@router.get("/distribution")
async def get_genre_distribution(
    user: Annotated[User, Depends(get_current_user)],
    period: str = Query("all_time", pattern="^(week|month|quarter|year|all_time)$"),
) -> dict:
    """Get genre distribution for a time period."""
    snapshot = await AnalyticsSnapshot.find_one(
        AnalyticsSnapshot.user_id == str(user.id),
        AnalyticsSnapshot.period == period,
    )
    if not snapshot:
        snapshot = await compute_analytics_snapshot(str(user.id), period)

    return {
        "genres": [item.model_dump() for item in snapshot.top_genres],
        "period": period,
        "total_genres": snapshot.unique_genres,
    }
