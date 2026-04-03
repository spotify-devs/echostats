"""Security middleware — rate limiting, CSP headers, request logging."""

import time
from collections.abc import Awaitable, Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        else:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' https://i.scdn.co https://*.spotifycdn.com data: blob:; "
                "font-src 'self'; "
                "connect-src 'self' https://api.spotify.com https://accounts.spotify.com; "
                "media-src 'self' https://p.scdn.co; "
                "frame-ancestors 'none'"
            )
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all API requests with timing."""

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        duration_ms = (time.monotonic() - start) * 1000

        if request.url.path not in ("/api/health", "/metrics"):
            request_id = getattr(request.state, "request_id", "unknown")
            log_data = {
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "client": request.headers.get(
                    "x-forwarded-for", request.client.host if request.client else "unknown"
                ),
                "request_id": request_id,
                "content_length": response.headers.get("content-length", "0"),
            }

            # Warn on slow requests
            if duration_ms > 1000:
                logger.warning("slow_request", **log_data)
            else:
                logger.info("request", **log_data)

        return response
