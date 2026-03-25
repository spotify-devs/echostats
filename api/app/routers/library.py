"""User library endpoints — followed artists, saved albums."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.spotify_client import SpotifyClient
from app.services.token_service import get_valid_access_token

router = APIRouter()


async def _get_client(user: User) -> SpotifyClient:
    from fastapi import HTTPException
    token = await get_valid_access_token(user)
    if not token:
        raise HTTPException(status_code=401, detail="No valid Spotify token")
    return SpotifyClient(token, user_id=str(user.id))


@router.get("/followed-artists")
async def followed_artists(
    user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(50, ge=1, le=50),
) -> dict:
    """Get user's followed artists."""
    client = await _get_client(user)
    try:
        data = await client.get_followed_artists(limit=limit)
        artists = data.get("artists", {}).get("items", [])
        return {
            "items": [
                {
                    "id": a.get("id", ""),
                    "name": a.get("name", ""),
                    "image": (a.get("images") or [{}])[0].get("url", ""),
                    "followers": a.get("followers", {}).get("total", 0),
                    "genres": a.get("genres", []),
                }
                for a in artists
            ],
            "total": data.get("artists", {}).get("total", 0),
        }
    finally:
        await client.close()


@router.get("/saved-albums")
async def saved_albums(
    user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(50, ge=1, le=50),
    offset: int = Query(0, ge=0),
) -> dict:
    """Get user's saved albums."""
    client = await _get_client(user)
    try:
        data = await client.get_saved_albums(limit=limit, offset=offset)
        items = data.get("items", [])
        return {
            "items": [
                {
                    "id": item.get("album", {}).get("id", ""),
                    "name": item.get("album", {}).get("name", ""),
                    "artists": ", ".join(
                        a.get("name", "") for a in item.get("album", {}).get("artists", [])
                    ),
                    "image": (item.get("album", {}).get("images") or [{}])[0].get("url", ""),
                    "release_date": item.get("album", {}).get("release_date", ""),
                    "total_tracks": item.get("album", {}).get("total_tracks", 0),
                    "added_at": item.get("added_at", ""),
                }
                for item in items
            ],
            "total": data.get("total", 0),
            "limit": limit,
            "offset": offset,
        }
    finally:
        await client.close()
