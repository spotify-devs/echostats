"""Middleware tests — RequestIDMiddleware and TimeoutMiddleware."""

import asyncio

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.middleware.request_id import RequestIDMiddleware
from app.middleware.timeout import TimeoutMiddleware

# ---------------------------------------------------------------------------
# Helpers: build minimal FastAPI apps with the middleware under test
# ---------------------------------------------------------------------------


def _request_id_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(RequestIDMiddleware)

    @app.get("/ping")
    async def ping():
        return {"ok": True}

    return app


def _timeout_app(*, default_timeout: float = 0.2) -> FastAPI:
    app = FastAPI()
    app.add_middleware(TimeoutMiddleware, default_timeout=default_timeout, slow_timeout=5.0)

    @app.get("/fast")
    async def fast():
        return {"ok": True}

    @app.get("/slow")
    async def slow():
        await asyncio.sleep(2)
        return {"ok": True}

    @app.get("/api/health")
    async def health():
        await asyncio.sleep(2)
        return {"status": "healthy"}

    return app


# ---------------------------------------------------------------------------
# RequestIDMiddleware
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_request_id_generated_when_absent():
    """A UUID request ID is generated if the client doesn't send one."""
    app = _request_id_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        resp = await c.get("/ping")
    assert resp.status_code == 200
    rid = resp.headers.get("X-Request-ID")
    assert rid is not None
    assert len(rid) == 36  # UUID length


@pytest.mark.asyncio
async def test_request_id_passthrough():
    """An existing X-Request-ID header is passed through."""
    app = _request_id_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        resp = await c.get("/ping", headers={"X-Request-ID": "my-custom-id"})
    assert resp.headers["X-Request-ID"] == "my-custom-id"


# ---------------------------------------------------------------------------
# TimeoutMiddleware
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_timeout_returns_504_on_slow_handler():
    """A handler that exceeds the timeout gets a 504."""
    app = _timeout_app(default_timeout=0.1)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        resp = await c.get("/slow")
    assert resp.status_code == 504
    assert "timed out" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_timeout_passes_fast_handler():
    """A fast handler returns normally."""
    app = _timeout_app(default_timeout=5.0)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        resp = await c.get("/fast")
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}


@pytest.mark.asyncio
async def test_health_bypasses_timeout():
    """Health endpoints are excluded from timeout enforcement."""
    app = _timeout_app(default_timeout=0.1)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        resp = await c.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"
