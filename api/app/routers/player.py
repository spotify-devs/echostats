"""Player/Playback control endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.spotify_client import SpotifyClient
from app.services.token_service import get_valid_access_token

router = APIRouter()


async def _get_client(user: User) -> SpotifyClient:
    token = await get_valid_access_token(user)
    if not token:
        raise HTTPException(status_code=401, detail="No valid Spotify token")
    return SpotifyClient(token, user_id=str(user.id))


@router.get("/current")
async def get_currently_playing(user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Get currently playing track."""
    client = await _get_client(user)
    try:
        data = await client.get_currently_playing()
        if not data or not data.get("item"):
            return {"is_playing": False}

        item = data["item"]
        artists = item.get("artists", [])
        album = item.get("album", {})
        images = album.get("images", [])

        return {
            "is_playing": data.get("is_playing", False),
            "track_name": item.get("name", ""),
            "artist_name": ", ".join(a.get("name", "") for a in artists),
            "album_name": album.get("name", ""),
            "album_image": images[0]["url"] if images else "",
            "track_id": item.get("id", ""),
            "duration_ms": item.get("duration_ms", 0),
            "progress_ms": data.get("progress_ms", 0),
            "device": data.get("device", {}).get("name", ""),
            "shuffle": data.get("shuffle_state", False),
            "repeat": data.get("repeat_state", "off"),
        }
    except Exception:
        return {"is_playing": False}
    finally:
        await client.close()


@router.get("/devices")
async def get_devices(user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Get available playback devices."""
    client = await _get_client(user)
    try:
        data = await client.get_devices()
        return {
            "devices": [
                {
                    "id": d.get("id", ""),
                    "name": d.get("name", ""),
                    "type": d.get("type", ""),
                    "is_active": d.get("is_active", False),
                    "volume_percent": d.get("volume_percent", 0),
                }
                for d in data.get("devices", [])
            ]
        }
    except Exception as e:
        return {"devices": [], "error": str(e)}
    finally:
        await client.close()


@router.get("/queue")
async def get_queue(user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Get playback queue."""
    client = await _get_client(user)
    try:
        data = await client.get_queue()
        currently_playing = data.get("currently_playing")
        queue = data.get("queue", [])

        def format_track(t: dict) -> dict:
            artists = t.get("artists", [])
            album = t.get("album", {})
            images = album.get("images", [])
            return {
                "id": t.get("id", ""),
                "name": t.get("name", ""),
                "artist": ", ".join(a.get("name", "") for a in artists),
                "album": album.get("name", ""),
                "image": images[0]["url"] if images else "",
                "duration_ms": t.get("duration_ms", 0),
            }

        return {
            "currently_playing": format_track(currently_playing) if currently_playing else None,
            "queue": [format_track(t) for t in queue[:20]],
        }
    except Exception:
        return {"currently_playing": None, "queue": []}
    finally:
        await client.close()


class PlayRequest(BaseModel):
    context_uri: str | None = None
    uris: list[str] | None = None
    device_id: str | None = None


@router.post("/play")
async def play(user: Annotated[User, Depends(get_current_user)], body: PlayRequest | None = None) -> dict:
    """Start or resume playback."""
    client = await _get_client(user)
    try:
        await client.start_playback(
            device_id=body.device_id if body else None,
            context_uri=body.context_uri if body else None,
            uris=body.uris if body else None,
        )
        return {"status": "playing"}
    finally:
        await client.close()


@router.post("/pause")
async def pause(user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Pause playback."""
    client = await _get_client(user)
    try:
        await client.pause_playback()
        return {"status": "paused"}
    finally:
        await client.close()


@router.post("/next")
async def next_track(user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Skip to next track."""
    client = await _get_client(user)
    try:
        await client.skip_next()
        return {"status": "skipped"}
    finally:
        await client.close()


@router.post("/previous")
async def previous_track(user: Annotated[User, Depends(get_current_user)]) -> dict:
    """Skip to previous track."""
    client = await _get_client(user)
    try:
        await client.skip_previous()
        return {"status": "skipped_back"}
    finally:
        await client.close()
