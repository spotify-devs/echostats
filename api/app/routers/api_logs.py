"""API logs viewer endpoints."""

from typing import Annotated, Any

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
) -> dict[str, Any]:
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
) -> dict[str, Any]:
    """Get aggregated API call statistics."""
    user_id = str(user.id)

    # Use aggregation pipeline instead of loading docs into Python
    stats_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$facet": {
            "totals": [
                {"$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "errors": {"$sum": {"$cond": [{"$gte": ["$status_code", 400]}, 1, 0]}},
                    "rate_limits": {"$sum": {"$cond": [{"$eq": ["$status_code", 429]}, 1, 0]}},
                    "avg_latency": {"$avg": "$latency_ms"},
                }},
            ],
            "status_dist": [
                {"$group": {
                    "_id": {"$switch": {
                        "branches": [
                            {"case": {"$and": [{"$gte": ["$status_code", 200]}, {"$lt": ["$status_code", 300]}]}, "then": "2xx"},
                            {"case": {"$and": [{"$gte": ["$status_code", 400]}, {"$lt": ["$status_code", 500]}]}, "then": "4xx"},
                            {"case": {"$gte": ["$status_code", 500]}, "then": "5xx"},
                        ],
                        "default": "other",
                    }},
                    "count": {"$sum": 1},
                }},
            ],
            "top_endpoints": [
                {"$group": {
                    "_id": {"$concat": ["$method", " ", "$endpoint"]},
                    "count": {"$sum": 1},
                }},
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ],
        }},
    ]

    results = await ApiLog.aggregate(stats_pipeline).to_list()
    facets = results[0] if results else {}

    totals = facets.get("totals", [{}])
    t = totals[0] if totals else {}
    total = t.get("total", 0)
    errors = t.get("errors", 0)

    status_dist = {r["_id"]: r["count"] for r in facets.get("status_dist", [])}

    return {
        "total_calls": total,
        "error_count": errors,
        "rate_limit_count": t.get("rate_limits", 0),
        "success_rate": round((1 - errors / total) * 100, 1) if total > 0 else 100,
        "avg_latency_ms": round(t.get("avg_latency", 0), 1),
        "status_distribution": {
            "2xx": status_dist.get("2xx", 0),
            "4xx": status_dist.get("4xx", 0),
            "5xx": status_dist.get("5xx", 0),
        },
        "top_endpoints": [
            {"endpoint": r["_id"], "count": r["count"]}
            for r in facets.get("top_endpoints", [])
        ],
    }
