"""Timeout middleware — enforces request deadlines."""

import asyncio
from collections.abc import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()

# Longer timeouts for heavy endpoints
_SLOW_PREFIXES = ("/api/v1/sync", "/api/v1/analytics", "/api/v1/history/import")


class TimeoutMiddleware(BaseHTTPMiddleware):
    """Abort requests that exceed a deadline."""

    def __init__(self, app, default_timeout: float = 30.0, slow_timeout: float = 120.0):
        super().__init__(app)
        self.default_timeout = default_timeout
        self.slow_timeout = slow_timeout

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip health/metrics
        if request.url.path in ("/api/health", "/api/health/ready", "/metrics"):
            return await call_next(request)

        timeout = self.default_timeout
        for prefix in _SLOW_PREFIXES:
            if request.url.path.startswith(prefix):
                timeout = self.slow_timeout
                break

        try:
            return await asyncio.wait_for(call_next(request), timeout=timeout)
        except TimeoutError:
            logger.warning(
                "Request timed out",
                path=request.url.path,
                method=request.method,
                timeout=timeout,
            )
            return Response(
                content='{"detail":"Request timed out"}',
                status_code=504,
                media_type="application/json",
            )
