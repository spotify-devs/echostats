"""Artist document model."""

from datetime import datetime

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import TEXT, IndexModel


class ArtistImage(BaseModel):
    """Artist image at a specific size."""
    url: str
    height: int | None = None
    width: int | None = None


class Artist(Document):
    """A Spotify artist with metadata."""
    spotify_id: str = Field(index=True, unique=True)  # type: ignore[call-overload]
    name: str = ""
    genres: list[str] = []
    images: list[ArtistImage] = []
    external_url: str = ""
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def image_url(self) -> str:
        """Return the best available image URL."""
        if self.images:
            return self.images[0].url
        return ""

    class Settings:
        name = "artists"
        indexes = [
            "genres",
            IndexModel([("name", TEXT)], name="artist_text_search"),
        ]
