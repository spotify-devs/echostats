"""API logs viewer endpoints."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.middleware.auth import get_current_user
from app.models.api_log import ApiLog
from app.models.user import User

router = APIRouter()


@router.get("")
async def get_api_logs(
    user: Annotated[User, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    service: str | None = None,
    status_min: int | None = None,
    status_max: int | None = None,
    method: str | None = None,
    endpoint_contains: str | None = None,
) -> dict:
    """Get paginated API call logs."""
    query_filters = [ApiLog.user_id == str(user.id)]

    if service:
        query_filters.append(ApiLog.service == service)
    if status_min is not None:
        query_filters.append(ApiLog.status_code >= status_min)
    if status_max is not None:
        query_filters.append(ApiLog.status_code <= status_max)
    if method:
        query_filters.append(ApiLog.method == method.upper())

    total = await ApiLog.find(*query_filters).count()
    skip = (page - 1) * limit
    items = await (
        ApiLog.find(*query_filters)
        .sort("-timestamp")
        .skip(skip)
        .limit(limit)
        .to_list()
    )

    return {
        "items": [
            {
                "id": str(log.id),
                "service": log.service,
                "method": log.method,
                "endpoint": log.endpoint,
                "status_code": log.status_code,
                "latency_ms": round(log.latency_ms, 1),
                "error": log.error,
                "timestamp": log.timestamp.isoformat(),
            }
            for log in items
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/stats")
async def get_api_log_stats(
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Get aggregated API call statistics."""
    user_id = str(user.id)
    total = await ApiLog.find(ApiLog.user_id == user_id).count()
    errors = await ApiLog.find(
        ApiLog.user_id == user_id, ApiLog.status_code >= 400
    ).count()
    rate_limits = await ApiLog.find(
        ApiLog.user_id == user_id, ApiLog.status_code == 429
    ).count()

    # Average latency
    all_logs = await ApiLog.find(ApiLog.user_id == user_id).limit(500).to_list()
    avg_latency = (
        round(sum(log.latency_ms for log in all_logs) / len(all_logs), 1)
        if all_logs
        else 0
    )

    # Status distribution
    status_2xx = sum(1 for log in all_logs if 200 <= log.status_code < 300)
    status_4xx = sum(1 for log in all_logs if 400 <= log.status_code < 500)
    status_5xx = sum(1 for log in all_logs if log.status_code >= 500)

    # Top endpoints
    endpoint_counts: dict[str, int] = {}
    for log in all_logs:
        key = f"{log.method} {log.endpoint}"
        endpoint_counts[key] = endpoint_counts.get(key, 0) + 1
    top_endpoints = sorted(endpoint_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "total_calls": total,
        "error_count": errors,
        "rate_limit_count": rate_limits,
        "success_rate": round((1 - errors / total) * 100, 1) if total > 0 else 100,
        "avg_latency_ms": avg_latency,
        "status_distribution": {
            "2xx": status_2xx,
            "4xx": status_4xx,
            "5xx": status_5xx,
        },
        "top_endpoints": [
            {"endpoint": ep, "count": count} for ep, count in top_endpoints
        ],
    }
