"""Playlist document model."""

from datetime import datetime

from beanie import Document
from pydantic import BaseModel, Field


class PlaylistTrack(BaseModel):
    """A track entry within a playlist."""
    spotify_id: str
    name: str
    artist_name: str
    album_name: str = ""
    added_at: datetime | None = None
    duration_ms: int = 0


class PlaylistImage(BaseModel):
    """Playlist cover image."""
    url: str
    height: int | None = None
    width: int | None = None


class Playlist(Document):
    """A Spotify playlist (user-owned or followed)."""
    spotify_id: str = Field(index=True)  # type: ignore[call-overload]
    user_id: str = Field(index=True)  # type: ignore[call-overload]
    name: str
    description: str = ""
    public: bool = True
    collaborative: bool = False
    images: list[PlaylistImage] = []
    owner_id: str = ""
    owner_name: str = ""
    total_tracks: int = 0
    tracks: list[PlaylistTrack] = []
    snapshot_id: str = ""
    external_url: str = ""
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "playlists"
        indexes = [
            "spotify_id",
            "user_id",
            [("user_id", 1), ("spotify_id", 1)],
        ]
