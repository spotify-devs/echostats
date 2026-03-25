"""Listening history API endpoints."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile

from app.middleware.auth import get_current_user
from app.models.listening_history import ListeningHistory
from app.models.user import User

router = APIRouter()


@router.get("/")
async def get_history(
    user: Annotated[User, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    artist: str | None = None,
    track: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    """Get paginated listening history."""
    query_filters = [ListeningHistory.user_id == str(user.id)]

    if artist:
        query_filters.append(ListeningHistory.track.artist_name == artist)
    if track:
        query_filters.append(ListeningHistory.track.name == track)
    if start_date:
        query_filters.append(ListeningHistory.played_at >= datetime.fromisoformat(start_date))
    if end_date:
        query_filters.append(ListeningHistory.played_at <= datetime.fromisoformat(end_date))

    total = await ListeningHistory.find(*query_filters).count()
    skip = (page - 1) * limit
    items = await (
        ListeningHistory.find(*query_filters)
        .sort("-played_at")
        .skip(skip)
        .limit(limit)
        .to_list()
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.post("/import")
async def import_history(
    user: Annotated[User, Depends(get_current_user)],
    file: Annotated[UploadFile, File(...)],
) -> dict:
    """Import Spotify streaming history from privacy data export."""
    from app.services.import_service import import_streaming_history

    content = await file.read()
    job = await import_streaming_history(str(user.id), content, file.filename or "unknown")
    return {
        "job_id": str(job.id),
        "status": job.status,
        "items_processed": job.items_processed,
        "items_total": job.items_total,
    }
