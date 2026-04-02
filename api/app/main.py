"""EchoStats API — FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import settings
from app.database import close_db, init_db
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.security import RequestLoggingMiddleware, SecurityHeadersMiddleware
from app.middleware.timeout import TimeoutMiddleware
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
    # Graceful shutdown: allow in-flight requests to drain
    logger.info("Shutting down EchoStats API — draining requests")
    import asyncio
    await asyncio.sleep(2)  # Brief grace period for in-flight requests
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


# ── Global exception handler ────────────────────────────────────────────────


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unhandled exceptions — never leak stack traces."""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.exception(
        "Unhandled exception",
        path=request.url.path,
        method=request.method,
        request_id=request_id,
        error=str(exc),
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "request_id": request_id,
        },
    )


# ── Middleware (order matters: first added = outermost) ──────────────────────

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Request logging
app.add_middleware(RequestLoggingMiddleware)

# Rate limiting
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)

# Request timeout
app.add_middleware(TimeoutMiddleware, default_timeout=30.0, slow_timeout=120.0)

# Request ID (outermost — runs first)
app.add_middleware(RequestIDMiddleware)

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
