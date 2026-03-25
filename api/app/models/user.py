"""User document model."""

from datetime import datetime

from beanie import Document
from pydantic import Field


class SpotifyTokens(Document):
    """Encrypted Spotify OAuth tokens stored per user."""
    user_id: str = Field(index=True)
    access_token_encrypted: str
    refresh_token_encrypted: str
    expires_at: datetime
    scope: str = ""

    class Settings:
        name = "spotify_tokens"


class User(Document):
    """EchoStats user linked to a Spotify account."""
    spotify_id: str = Field(index=True, unique=True)
    display_name: str = ""
    email: str = ""
    image_url: str = ""
    country: str = ""
    product: str = ""  # "premium", "free", etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_synced_at: datetime | None = None

    class Settings:
        name = "users"
