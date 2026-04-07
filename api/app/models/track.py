"""Track and audio features document models."""

from datetime import datetime

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import TEXT, IndexModel


class AudioFeatures(BaseModel):
    """Spotify audio features for a track."""
    danceability: float = 0.0
    energy: float = 0.0
    key: int = 0
    loudness: float = 0.0
    mode: int = 0
    speechiness: float = 0.0
    acousticness: float = 0.0
    instrumentalness: float = 0.0
    liveness: float = 0.0
    valence: float = 0.0
    tempo: float = 0.0
    duration_ms: int = 0
    time_signature: int = 4


class TrackArtistRef(BaseModel):
    """Lightweight artist reference embedded in a track."""
    spotify_id: str
    name: str


class TrackAlbumRef(BaseModel):
    """Lightweight album reference embedded in a track."""
    spotify_id: str
    name: str
    image_url: str = ""
    release_date: str = ""


class Track(Document):
    """A Spotify track with metadata and audio features."""
    spotify_id: str = Field(index=True, unique=True)  # type: ignore[call-overload]
    name: str = ""
    artists: list[TrackArtistRef] = []
    album: TrackAlbumRef | None = None
    duration_ms: int = 0
    popularity: int = 0
    explicit: bool = False
    preview_url: str | None = None
    external_url: str = ""
    audio_features: AudioFeatures | None = None
    genres: list[str] = []
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "tracks"
        indexes = [
            "artists.spotify_id",
            IndexModel([("name", TEXT), ("artists.name", TEXT)], name="track_text_search"),
        ]
