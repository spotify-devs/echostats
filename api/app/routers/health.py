"""Health check endpoints."""

import os

import httpx
import structlog
from fastapi import APIRouter

router = APIRouter()
logger = structlog.get_logger()

APP_VERSION = os.environ.get("APP_VERSION", "dev")
GITHUB_REPO = "spotify-devs/echostats"

# Cache the latest release check (avoid hitting GitHub on every request)
_update_cache: dict = {"version": None, "url": None, "checked_at": 0}


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Basic health check."""
    return {"status": "healthy", "service": "echostats-api", "version": APP_VERSION}


@router.get("/health/update")
async def check_update() -> dict:
    """Check if a newer version is available on GitHub."""
    import time

    now = time.time()
    # Cache for 1 hour
    if _update_cache["version"] and now - _update_cache["checked_at"] < 3600:
        return _build_update_response(_update_cache["version"], _update_cache["url"])

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest",
                headers={"Accept": "application/vnd.github+json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                latest = data.get("tag_name", "").lstrip("v")
                url = data.get("html_url", f"https://github.com/{GITHUB_REPO}/releases")
                _update_cache["version"] = latest
                _update_cache["url"] = url
                _update_cache["checked_at"] = now
                return _build_update_response(latest, url)
    except Exception as e:
        logger.warning("Failed to check for updates", error=str(e))

    return {
        "current_version": APP_VERSION,
        "latest_version": None,
        "update_available": False,
        "release_url": f"https://github.com/{GITHUB_REPO}/releases",
    }


def _build_update_response(latest: str, url: str) -> dict:
    current = APP_VERSION.lstrip("v")
    return {
        "current_version": APP_VERSION,
        "latest_version": latest,
        "update_available": current not in (latest, "dev"),
        "release_url": url,
    }


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
