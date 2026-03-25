"""API documentation endpoint tests."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_openapi_schema():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert data["info"]["title"] == "EchoStats API"
    assert "paths" in data


@pytest.mark.asyncio
async def test_swagger_ui():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/docs")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_redoc():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/redoc")
    assert response.status_code == 200
