"""Health check endpoints."""

import os

import httpx
import structlog
from fastapi import APIRouter

router = APIRouter()
logger = structlog.get_logger()

APP_VERSION = os.environ.get("APP_VERSION", "dev")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "spotify-devs/echostats")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# Cache the latest release check (avoid hitting GitHub on every request)
_update_cache: dict = {"version": None, "url": None, "notes": None, "published": None, "checked_at": 0}


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Basic health check."""
    return {"status": "healthy", "service": "echostats-api", "version": APP_VERSION}


@router.get("/health/update")
async def check_update() -> dict:
    """Check if a newer version is available on GitHub releases."""
    import time

    now = time.time()
    # Cache for 1 hour
    if _update_cache["version"] and now - _update_cache["checked_at"] < 3600:
        return _build_update_response()

    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest",
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                _update_cache["version"] = data.get("tag_name", "").lstrip("v")
                _update_cache["url"] = data.get("html_url", f"https://github.com/{GITHUB_REPO}/releases")
                _update_cache["notes"] = (data.get("body") or "")[:500]
                _update_cache["published"] = data.get("published_at")
                _update_cache["checked_at"] = now
                return _build_update_response()

            if resp.status_code == 404:
                logger.info("GitHub releases not accessible (private repo without token?)")
            else:
                logger.warning("GitHub API error", status=resp.status_code)

    except Exception as e:
        logger.warning("Failed to check for updates", error=str(e))

    return {
        "current_version": APP_VERSION,
        "latest_version": None,
        "update_available": False,
        "release_url": f"https://github.com/{GITHUB_REPO}/releases",
    }


def _build_update_response() -> dict:
    current = APP_VERSION.lstrip("v")
    latest = _update_cache["version"]
    return {
        "current_version": APP_VERSION,
        "latest_version": latest,
        "update_available": current not in (latest, "dev"),
        "release_url": _update_cache["url"],
        "release_notes": _update_cache["notes"],
        "published_at": _update_cache["published"],
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
