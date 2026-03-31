"""Album document model."""

from datetime import datetime

from beanie import Document
from pydantic import BaseModel, Field


class AlbumArtistRef(BaseModel):
    """Lightweight artist reference in an album."""
    spotify_id: str
    name: str


class AlbumImage(BaseModel):
    """Album cover art."""
    url: str
    height: int | None = None
    width: int | None = None


class Album(Document):
    """A Spotify album with metadata."""
    spotify_id: str = Field(index=True, unique=True)
    name: str
    album_type: str = ""  # "album", "single", "compilation"
    artists: list[AlbumArtistRef] = []
    images: list[AlbumImage] = []
    release_date: str = ""
    total_tracks: int = 0
    genres: list[str] = []
    popularity: int = 0
    external_url: str = ""
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def image_url(self) -> str:
        if self.images:
            return self.images[0].url
        return ""

    class Settings:
        name = "albums"
