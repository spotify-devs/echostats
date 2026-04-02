"""Pre-aggregated daily rollup models for fast analytics.

One DailyRollup document per user per day compresses millions of raw
ListeningHistory records into ~18K small documents (50 years), enabling
instant analytics across any time window.
"""

from beanie import Document
from pydantic import BaseModel, Field


class HourlyBucket(BaseModel):
    """Play count and duration for a single hour of a day."""

    hour: int  # 0-23
    count: int = 0
    ms: int = 0


class TrackPlayEntry(BaseModel):
    """A track's play count for a single day."""

    spotify_id: str = ""
    name: str = ""
    artist_name: str = ""
    count: int = 0


class DailyRollup(Document):
    """Pre-aggregated listening stats for one user-day."""

    user_id: str = Field(index=True)  # type: ignore[call-overload]
    date: str = Field(index=True)  # type: ignore[call-overload]
    day_of_week: int = 0  # 0=Mon..6=Sun (Python convention)

    total_plays: int = 0
    total_ms: int = 0

    hourly: list[HourlyBucket] = []
    artist_plays: dict[str, int] = {}  # artist_name -> play_count
    album_plays: dict[str, int] = {}  # album_name -> play_count
    track_plays: list[TrackPlayEntry] = []

    class Settings:
        name = "daily_rollups"
        indexes = [
            [("user_id", 1), ("date", 1)],
            [("user_id", 1), ("date", -1)],
        ]
