"""Tests for the health router endpoints."""

import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_health_returns_200_with_status_fields(client):
    async with client:
        resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "echostats-api"
    assert "version" in data


@pytest.mark.asyncio
async def test_readiness_ready_when_db_and_redis_ok(client):
    mock_client = AsyncMock()
    mock_client.admin.command = AsyncMock(return_value={"ok": 1})

    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)
    mock_redis.aclose = AsyncMock()

    with (
        patch("app.routers.health.client", mock_client, create=True),
        patch("app.database.client", mock_client),
        patch("redis.asyncio.from_url", return_value=mock_redis),
    ):
        async with client:
            resp = await client.get("/api/health/ready")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_readiness_not_ready_when_no_db_client(client):
    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)
    mock_redis.aclose = AsyncMock()

    with (
        patch("app.database.client", None),
        patch("redis.asyncio.from_url", return_value=mock_redis),
    ):
        async with client:
            resp = await client.get("/api/health/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "not_ready"
    assert "database" in data["reason"]


@pytest.mark.asyncio
async def test_readiness_not_ready_when_redis_down(client):
    mock_db = AsyncMock()
    mock_db.admin.command = AsyncMock(return_value={"ok": 1})

    with (
        patch("app.database.client", mock_db),
        patch("redis.asyncio.from_url", side_effect=ConnectionError("refused")),
    ):
        async with client:
            resp = await client.get("/api/health/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "not_ready"
    assert "cache" in data["reason"]


@pytest.mark.asyncio
async def test_update_returns_info_on_github_success(client):
    # Reset the module-level cache before test
    from app.routers import health as health_mod

    health_mod._update_cache["version"] = None
    health_mod._update_cache["checked_at"] = 0

    fake_response = MagicMock()
    fake_response.status_code = 200
    fake_response.json.return_value = {
        "tag_name": "v1.2.3",
        "html_url": "https://github.com/test/releases/v1.2.3",
        "body": "Release notes text",
        "published_at": "2024-01-01T00:00:00Z",
    }

    mock_http_client = AsyncMock()
    mock_http_client.get = AsyncMock(return_value=fake_response)
    mock_http_client.__aenter__ = AsyncMock(return_value=mock_http_client)
    mock_http_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.routers.health.httpx.AsyncClient", return_value=mock_http_client):
        async with client:
            resp = await client.get("/api/health/update")

    assert resp.status_code == 200
    data = resp.json()
    assert data["latest_version"] == "1.2.3"
    assert "release_url" in data
    assert "current_version" in data


@pytest.mark.asyncio
async def test_update_returns_fallback_on_github_error(client):
    from app.routers import health as health_mod

    health_mod._update_cache["version"] = None
    health_mod._update_cache["checked_at"] = 0

    mock_http_client = AsyncMock()
    mock_http_client.get = AsyncMock(side_effect=Exception("network error"))
    mock_http_client.__aenter__ = AsyncMock(return_value=mock_http_client)
    mock_http_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.routers.health.httpx.AsyncClient", return_value=mock_http_client):
        async with client:
            resp = await client.get("/api/health/update")

    assert resp.status_code == 200
    data = resp.json()
    assert data["latest_version"] is None
    assert data["update_available"] is False


@pytest.mark.asyncio
async def test_update_uses_cache_when_fresh(client):
    from app.routers import health as health_mod

    health_mod._update_cache["version"] = "2.0.0"
    health_mod._update_cache["url"] = "https://example.com/release"
    health_mod._update_cache["notes"] = "cached notes"
    health_mod._update_cache["published"] = "2024-06-01T00:00:00Z"
    health_mod._update_cache["checked_at"] = time.time()  # fresh

    async with client:
        resp = await client.get("/api/health/update")

    assert resp.status_code == 200
    data = resp.json()
    assert data["latest_version"] == "2.0.0"
