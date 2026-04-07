"""Listening history document model."""

from datetime import datetime

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class HistoryTrackRef(BaseModel):
    """Track reference in listening history."""
    spotify_id: str
    name: str
    artist_name: str
    album_name: str = ""
    album_image_url: str = ""
    duration_ms: int = 0


class ListeningHistory(Document):
    """A single listening event — one track played at a specific time."""
    user_id: str = Field(index=True)  # type: ignore[call-overload]
    track: HistoryTrackRef
    played_at: datetime = Field(index=True)  # type: ignore[call-overload]
    ms_played: int | None = None  # Available from privacy exports
    source: str = "api"  # "api" or "import"
    context_type: str = ""  # "playlist", "album", "artist", etc.
    context_uri: str = ""

    class Settings:
        name = "listening_history"
        indexes = [
            "user_id",
            "played_at",
            "track.spotify_id",
            [("user_id", 1), ("played_at", -1)],
            IndexModel(
                [("user_id", 1), ("track.spotify_id", 1), ("played_at", 1)],
                unique=True,
                name="uniq_user_track_played_at",
            ),
        ]
