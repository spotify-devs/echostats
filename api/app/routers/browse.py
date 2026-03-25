"""Browse/Discover endpoints — new releases, featured playlists, categories."""

from typing import Annotated

from fastapi import APIRouter, Depends

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


@router.get("/new-releases")
async def new_releases(user: Annotated[User, Depends(get_current_user)], limit: int = 20) -> dict:
    """Get new album releases."""
    client = await _get_client(user)
    try:
        data = await client.get_new_releases(limit=limit)
        albums = data.get("albums", {}).get("items", [])
        return {
            "items": [
                {
                    "id": a.get("id", ""),
                    "name": a.get("name", ""),
                    "artists": ", ".join(art.get("name", "") for art in a.get("artists", [])),
                    "image": (a.get("images") or [{}])[0].get("url", ""),
                    "release_date": a.get("release_date", ""),
                    "total_tracks": a.get("total_tracks", 0),
                    "type": a.get("album_type", ""),
                }
                for a in albums
            ]
        }
    finally:
        await client.close()


@router.get("/featured-playlists")
async def featured_playlists(user: Annotated[User, Depends(get_current_user)], limit: int = 20) -> dict:
    """Get Spotify featured playlists."""
    client = await _get_client(user)
    try:
        data = await client.get_featured_playlists(limit=limit)
        playlists = data.get("playlists", {}).get("items", [])
        return {
            "message": data.get("message", ""),
            "items": [
                {
                    "id": p.get("id", ""),
                    "name": p.get("name", ""),
                    "description": p.get("description", ""),
                    "image": (p.get("images") or [{}])[0].get("url", ""),
                    "tracks_total": p.get("tracks", {}).get("total", 0),
                    "owner": p.get("owner", {}).get("display_name", ""),
                }
                for p in playlists
            ]
        }
    finally:
        await client.close()


@router.get("/categories")
async def categories(user: Annotated[User, Depends(get_current_user)], limit: int = 50) -> dict:
    """Get browse categories."""
    client = await _get_client(user)
    try:
        data = await client.get_categories(limit=limit)
        cats = data.get("categories", {}).get("items", [])
        return {
            "items": [
                {
                    "id": c.get("id", ""),
                    "name": c.get("name", ""),
                    "image": (c.get("icons") or [{}])[0].get("url", ""),
                }
                for c in cats
            ]
        }
    finally:
        await client.close()
