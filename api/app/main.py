"""EchoStats API — FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import settings
from app.database import close_db, init_db
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security import RequestLoggingMiddleware, SecurityHeadersMiddleware
from app.routers import (
    albums,
    analytics,
    api_logs,
    artists,
    auth,
    browse,
    genres,
    health,
    history,
    library,
    player,
    playlists,
    recommendations,
    sync_jobs,
    tracks,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown events."""
    logger.info("Starting EchoStats API", version="0.1.0")
    await init_db()
    logger.info("Database connected")
    yield
    await close_db()
    logger.info("EchoStats API shut down")


app = FastAPI(
    title="EchoStats API",
    description="Spotify analytics backend",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)

# Prometheus metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# Routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(history.router, prefix="/api/v1/history", tags=["History"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(artists.router, prefix="/api/v1/artists", tags=["Artists"])
app.include_router(tracks.router, prefix="/api/v1/tracks", tags=["Tracks"])
app.include_router(albums.router, prefix="/api/v1/albums", tags=["Albums"])
app.include_router(genres.router, prefix="/api/v1/genres", tags=["Genres"])
app.include_router(playlists.router, prefix="/api/v1/playlists", tags=["Playlists"])
app.include_router(player.router, prefix="/api/v1/player", tags=["Player"])
app.include_router(browse.router, prefix="/api/v1/browse", tags=["Browse"])
app.include_router(library.router, prefix="/api/v1/library", tags=["Library"])
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["Recommendations"])
app.include_router(api_logs.router, prefix="/api/v1/api-logs", tags=["API Logs"])
app.include_router(sync_jobs.router, prefix="/api/v1/sync-jobs", tags=["Sync Jobs"])
