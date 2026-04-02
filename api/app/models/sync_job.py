"""Sync job tracking model."""

from datetime import UTC, datetime

from beanie import Document
from pydantic import BaseModel, Field


class SyncStep(BaseModel):
    """A single step within a sync job."""
    action: str  # e.g. "sync_recently_played", "enrich_audio_features"
    status: str = "running"  # "running", "completed", "failed"
    detail: str = ""  # e.g. "Fetched 50 recently played tracks"
    items: int = 0
    started_at: datetime = Field(default_factory=lambda: datetime.now(tz=UTC))
    completed_at: datetime | None = None
    error: str = ""


class SyncJob(Document):
    """Tracks background data sync jobs."""
    user_id: str = Field(index=True)  # type: ignore[call-overload]
    status: str = "pending"  # "pending", "running", "completed", "failed"
    started_at: datetime | None = None
    completed_at: datetime | None = None
    items_processed: int = 0
    items_total: int = 0
    error_message: str = ""
    steps: list[SyncStep] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=UTC))

    class Settings:
        name = "sync_jobs"
        indexes = [
            "user_id",
            "status",
            [("user_id", 1), ("job_type", 1), ("created_at", -1)],
        ]
