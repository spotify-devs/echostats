"""Sync job tracking model."""

from datetime import datetime

from beanie import Document
from pydantic import Field


class SyncJob(Document):
    """Tracks background data sync jobs."""
    user_id: str = Field(index=True)
    job_type: str  # "initial", "periodic", "import", "enrichment"
    status: str = "pending"  # "pending", "running", "completed", "failed"
    started_at: datetime | None = None
    completed_at: datetime | None = None
    items_processed: int = 0
    items_total: int = 0
    error_message: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "sync_jobs"
        indexes = [
            "user_id",
            "status",
            [("user_id", 1), ("job_type", 1), ("created_at", -1)],
        ]
