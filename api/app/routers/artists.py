"""Artist API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.middleware.auth import get_current_user
from app.models.analytics import AnalyticsSnapshot
from app.models.artist import Artist
from app.models.user import User
from app.services.analytics_service import compute_analytics_snapshot

router = APIRouter()


@router.get("/top")
async def get_top_artists(
    user: Annotated[User, Depends(get_current_user)],
    period: str = Query("all_time", pattern="^(week|month|quarter|year|all_time)$"),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    """Get top artists for a time period."""
    snapshot = await AnalyticsSnapshot.find_one(
        AnalyticsSnapshot.user_id == str(user.id),
        AnalyticsSnapshot.period == period,
    )
    if not snapshot:
        snapshot = await compute_analytics_snapshot(str(user.id), period)

    return {
        "items": [item.model_dump() for item in snapshot.top_artists[:limit]],
        "period": period,
        "total": len(snapshot.top_artists),
    }


@router.get("/{artist_id}")
async def get_artist(artist_id: str) -> dict:
    """Get artist details."""
    artist = await Artist.find_one(Artist.spotify_id == artist_id)
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    return artist.model_dump()
