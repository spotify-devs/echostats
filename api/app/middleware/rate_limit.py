"""Sliding-window rate limiter backed by Redis, with in-memory fallback."""

import time
import uuid
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.config import settings

logger = structlog.get_logger()

# Try to set up a Redis connection pool at import time
_redis_pool: Any = None
try:
    import redis.asyncio as aioredis

    _redis_pool = aioredis.from_url(settings.redis_url, decode_responses=True)  # type: ignore[no-untyped-call]
except Exception:
    logger.warning("Redis unavailable for rate limiting — falling back to in-memory")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limit requests per client IP using Redis sliding window."""

    def __init__(self, app: ASGIApp, max_requests: int = 100, window_seconds: int = 60) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # In-memory fallback
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def _check_redis(self, client_ip: str) -> int | None:
        """Try Redis sliding window. Returns request count or None on failure."""
        if _redis_pool is None:
            return None
        try:
            key = f"ratelimit:{client_ip}"
            now = time.time()
            window_start = now - self.window_seconds
            member = f"{now}:{uuid.uuid4().hex[:8]}"

            pipe = _redis_pool.pipeline(transaction=True)
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zadd(key, {member: now})
            pipe.zcard(key)
            pipe.expire(key, self.window_seconds)
            results = await pipe.execute()
            return int(results[2])  # ZCARD result
        except Exception:
            logger.warning("Redis rate-limit check failed — falling back to in-memory")
            return None

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        # Skip health/metrics endpoints
        if request.url.path in ("/api/health", "/api/health/ready", "/metrics"):
            return await call_next(request)

        client_ip = self._get_client_ip(request)

        # Try Redis first
        count = await self._check_redis(client_ip)
        if count is not None:
            if count > self.max_requests:
                return Response(
                    content='{"detail":"Rate limit exceeded"}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": str(self.window_seconds)},
                )
            return await call_next(request)

        # In-memory fallback
        now = time.monotonic()
        self._requests[client_ip] = [
            t for t in self._requests[client_ip]
            if now - t < self.window_seconds
        ]

        if len(self._requests[client_ip]) >= self.max_requests:
            return Response(
                content='{"detail":"Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(self.window_seconds)},
            )

        self._requests[client_ip].append(now)
        return await call_next(request)
