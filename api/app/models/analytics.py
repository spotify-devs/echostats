"""Pre-computed analytics snapshot models."""

from datetime import datetime

from beanie import Document
from pydantic import BaseModel, Field


class TopItem(BaseModel):
    """A top-ranked item (artist, track, genre)."""
    spotify_id: str = ""
    name: str
    play_count: int = 0
    total_ms: int = 0
    image_url: str = ""
    rank: int = 0


class ListeningHour(BaseModel):
    """Listening count per hour of the day."""
    hour: int  # 0-23
    count: int = 0
    total_ms: int = 0


class ListeningDay(BaseModel):
    """Listening count per day of the week."""
    day: int  # 0=Monday, 6=Sunday
    count: int = 0
    total_ms: int = 0


class AudioFeatureAvg(BaseModel):
    """Average audio features across listened tracks."""
    danceability: float = 0.0
    energy: float = 0.0
    valence: float = 0.0
    acousticness: float = 0.0
    instrumentalness: float = 0.0
    liveness: float = 0.0
    speechiness: float = 0.0
    tempo: float = 0.0


class AnalyticsSnapshot(Document):
    """Pre-computed analytics for a user over a time period."""
    user_id: str = Field(index=True)  # type: ignore[call-overload]
    period: str = Field(index=True)  # type: ignore[call-overload]
    period_start: datetime | None = None
    period_end: datetime | None = None

    # Summary stats
    total_tracks_played: int = 0
    total_ms_played: int = 0
    unique_tracks: int = 0
    unique_artists: int = 0
    unique_albums: int = 0
    unique_genres: int = 0
    listening_streak_days: int = 0

    # Top items
    top_artists: list[TopItem] = []
    top_tracks: list[TopItem] = []
    top_genres: list[TopItem] = []
    top_albums: list[TopItem] = []

    # Patterns
    hourly_distribution: list[ListeningHour] = []
    daily_distribution: list[ListeningDay] = []

    # Audio profile
    avg_audio_features: AudioFeatureAvg | None = None

    computed_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "analytics_snapshots"
        indexes = [
            [("user_id", 1), ("period", 1)],
        ]


class GenreDistribution(Document):
    """Genre distribution tracking over time for a user."""
    user_id: str = Field(index=True)  # type: ignore[call-overload]
    date: datetime = Field(index=True)  # type: ignore[call-overload]
    genres: dict[str, int] = {}  # genre_name -> play_count
    total_plays: int = 0

    class Settings:
        name = "genre_distributions"
        indexes = [
            [("user_id", 1), ("date", -1)],
        ]
