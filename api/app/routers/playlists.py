"""Playlist API endpoints."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from app.middleware.auth import get_current_user
from app.models.playlist import Playlist
from app.models.user import User

router = APIRouter()


@router.get("")
async def get_playlists(
    user: Annotated[User, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
) -> dict[str, Any]:
    """Get user's playlists."""
    total = await Playlist.find(Playlist.user_id == str(user.id)).count()
    skip = (page - 1) * limit
    items = await (
        Playlist.find(Playlist.user_id == str(user.id))
        .skip(skip)
        .limit(limit)
        .to_list()
    )

    return {
        "items": [p.model_dump(mode="json") for p in items],
        "total": total,
        "page": page,
        "limit": limit,
    }
