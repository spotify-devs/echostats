"""Track API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.middleware.auth import get_current_user
from app.models.analytics import AnalyticsSnapshot
from app.models.track import Track
from app.models.user import User

router = APIRouter()


@router.get("/top")
async def get_top_tracks(
    user: Annotated[User, Depends(get_current_user)],
    period: str = Query("all_time", pattern="^(week|month|quarter|year|all_time)$"),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    """Get top tracks for a time period."""
    snapshot = await AnalyticsSnapshot.find_one(
        AnalyticsSnapshot.user_id == str(user.id),
        AnalyticsSnapshot.period == period,
    )
    if not snapshot:
        return {"items": [], "period": period}

    return {
        "items": [item.model_dump() for item in snapshot.top_tracks[:limit]],
        "period": period,
        "total": len(snapshot.top_tracks),
    }


@router.get("/{track_id}")
async def get_track(track_id: str) -> dict:
    """Get track details with audio features."""
    track = await Track.find_one(Track.spotify_id == track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return track.model_dump()
