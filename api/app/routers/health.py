"""Health check endpoints."""

import os

from fastapi import APIRouter

router = APIRouter()

APP_VERSION = os.environ.get("APP_VERSION", "dev")


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Basic health check."""
    return {"status": "healthy", "service": "echostats-api", "version": APP_VERSION}


@router.get("/health/ready")
async def readiness_check() -> dict[str, str]:
    """Readiness check — verifies database connectivity."""
    from app.database import client

    if client is None:
        return {"status": "not_ready", "reason": "database not connected"}

    try:
        await client.admin.command("ping")
        return {"status": "ready"}
    except Exception:
        return {"status": "not_ready", "reason": "database unreachable"}
