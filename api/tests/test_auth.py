"""Authentication endpoint tests."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_login_returns_url():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/auth/login")
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert "accounts.spotify.com/authorize" in data["url"]
    assert "state" in data


@pytest.mark.asyncio
async def test_callback_without_code_fails():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/auth/callback")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_auth_status_unauthenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/auth/status")
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is False


@pytest.mark.asyncio
async def test_logout():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "logged_out"
