"""Health check endpoints."""

import os

import httpx
import structlog
from fastapi import APIRouter

router = APIRouter()
logger = structlog.get_logger()

APP_VERSION = os.environ.get("APP_VERSION", "dev")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "spotify-devs/echostats")

# Cache the latest release check
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
    if _update_cache["version"] and now - _update_cache["checked_at"] < 3600:
        return _build_update_response()

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest",
                headers={"Accept": "application/vnd.github+json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                _update_cache["version"] = data.get("tag_name", "").lstrip("v")
                _update_cache["url"] = data.get("html_url", f"https://github.com/{GITHUB_REPO}/releases")
                _update_cache["notes"] = (data.get("body") or "")[:500]
                _update_cache["published"] = data.get("published_at")
                _update_cache["checked_at"] = now
                return _build_update_response()
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
    """Readiness check — verifies database and cache connectivity."""
    from app.database import client

    issues = []

    # MongoDB
    if client is None:
        issues.append("database not connected")
    else:
        try:
            await client.admin.command("ping")
        except Exception:
            issues.append("database unreachable")

    # Redis
    try:
        import redis.asyncio as aioredis

        from app.config import settings

        r = aioredis.from_url(settings.redis_url, socket_connect_timeout=2)
        await r.ping()
        await r.aclose()
    except Exception:
        issues.append("cache unreachable")

    if issues:
        return {"status": "not_ready", "reason": ", ".join(issues)}
    return {"status": "ready"}
