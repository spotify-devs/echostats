"""API call logging model for Spotify API interactions."""

from datetime import datetime

from beanie import Document
from pydantic import Field


class ApiLog(Document):
    """Log of external API calls (primarily Spotify API)."""
    user_id: str = Field(index=True, default="")
    service: str = "spotify"  # "spotify", "internal"
    method: str = ""  # "GET", "POST", etc.
    endpoint: str = ""
    status_code: int = 0
    latency_ms: float = 0.0
    error: str = ""
    request_id: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)

    class Settings:
        name = "api_logs"
        indexes = [
            [("user_id", 1), ("timestamp", -1)],
            [("service", 1), ("status_code", 1)],
        ]
