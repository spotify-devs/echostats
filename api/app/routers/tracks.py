"""Track API endpoints."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.middleware.auth import get_current_user
from app.models.track import Track
from app.models.user import User
from app.services.analytics_service import get_or_compute_snapshot

router = APIRouter()


@router.get("/top")
async def get_top_tracks(
    user: Annotated[User, Depends(get_current_user)],
    period: str = Query("all_time", pattern="^(week|month|quarter|year|all_time)$"),
    limit: int = Query(50, ge=1, le=100),
) -> dict[str, Any]:
    """Get top tracks for a time period."""
    snapshot = await get_or_compute_snapshot(str(user.id), period)

    return {
        "items": [item.model_dump() for item in snapshot.top_tracks[:limit]],
        "period": period,
        "total": len(snapshot.top_tracks),
    }


@router.get("/{track_id}")
async def get_track(track_id: str) -> dict[str, Any]:
    """Get track details with audio features."""
    track = await Track.find_one(Track.spotify_id == track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return dict(track.model_dump())
