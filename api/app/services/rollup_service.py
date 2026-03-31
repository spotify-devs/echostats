"""Service for building and maintaining DailyRollup documents.

Rollups compress raw ListeningHistory into one small document per user
per day, enabling instant analytics across arbitrarily large time windows.
"""

import asyncio
import copy
from datetime import datetime, timedelta
from typing import Any

import structlog

from app.models.listening_history import ListeningHistory
from app.models.rollup import DailyRollup, HourlyBucket, TrackPlayEntry

logger = structlog.get_logger()


async def build_rollups(
    user_id: str,
    start_date: str | None = None,
    end_date: str | None = None,
) -> int:
    """Build DailyRollup documents from raw ListeningHistory.

    If start_date/end_date are given, only rollups for that range are rebuilt.
    Otherwise, all rollups for the user are rebuilt from scratch.

    Returns the number of rollup documents created.
    """
    match_filter: dict[str, Any] = {"user_id": user_id}
    if start_date or end_date:
        date_filter: dict[str, Any] = {}
        if start_date:
            date_filter["$gte"] = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            date_filter["$lte"] = (
                datetime.strptime(end_date, "%Y-%m-%d")
                + timedelta(days=1)
                - timedelta(microseconds=1)
            )
        match_filter["played_at"] = date_filter

    agg_opts: dict[str, Any] = {"allowDiskUse": True}

    def _match() -> dict:
        return {"$match": copy.deepcopy(match_filter)}

    def _dur() -> dict:
        return {"$ifNull": ["$ms_played", {"$ifNull": ["$track.duration_ms", 0]}]}

    try:
        # Batch 1: lightweight aggregations
        totals_res, hourly_res = await asyncio.gather(
            ListeningHistory.aggregate([
                _match(),
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$played_at"}},
                    "plays": {"$sum": 1},
                    "ms": {"$sum": _dur()},
                }},
            ], **agg_opts).to_list(),
            ListeningHistory.aggregate([
                _match(),
                {"$group": {
                    "_id": {
                        "d": {"$dateToString": {"format": "%Y-%m-%d", "date": "$played_at"}},
                        "h": {"$hour": "$played_at"},
                    },
                    "c": {"$sum": 1},
                    "ms": {"$sum": _dur()},
                }},
            ], **agg_opts).to_list(),
        )

        # Batch 2: per-day breakdowns (heavier)
        artist_res, track_res, album_res = await asyncio.gather(
            ListeningHistory.aggregate([
                _match(),
                {"$group": {
                    "_id": {
                        "d": {"$dateToString": {"format": "%Y-%m-%d", "date": "$played_at"}},
                        "a": "$track.artist_name",
                    },
                    "c": {"$sum": 1},
                }},
            ], **agg_opts).to_list(),
            ListeningHistory.aggregate([
                _match(),
                {"$group": {
                    "_id": {
                        "d": {"$dateToString": {"format": "%Y-%m-%d", "date": "$played_at"}},
                        "s": "$track.spotify_id",
                        "n": "$track.name",
                        "a": "$track.artist_name",
                    },
                    "c": {"$sum": 1},
                }},
            ], **agg_opts).to_list(),
            ListeningHistory.aggregate([
                _match(),
                {"$group": {
                    "_id": {
                        "d": {"$dateToString": {"format": "%Y-%m-%d", "date": "$played_at"}},
                        "al": "$track.album_name",
                    },
                    "c": {"$sum": 1},
                }},
            ], **agg_opts).to_list(),
        )
    except Exception as e:
        logger.error("Rollup build pipelines failed", user_id=user_id, error=str(e))
        raise

    # Merge pipeline results by date
    days: dict[str, dict[str, Any]] = {}

    def _day(d: str) -> dict[str, Any]:
        return days.setdefault(d, {
            "plays": 0, "ms": 0,
            "hourly": {},
            "artists": {},
            "tracks": [],
            "albums": {},
        })

    for r in totals_res:
        day = _day(r["_id"])
        day["plays"] = r["plays"]
        day["ms"] = r["ms"]

    for r in hourly_res:
        day = _day(r["_id"]["d"])
        day["hourly"][r["_id"]["h"]] = {"count": r["c"], "ms": r["ms"]}

    for r in artist_res:
        day = _day(r["_id"]["d"])
        day["artists"][r["_id"]["a"]] = r["c"]

    for r in track_res:
        day = _day(r["_id"]["d"])
        day["tracks"].append(TrackPlayEntry(
            spotify_id=r["_id"].get("s", ""),
            name=r["_id"].get("n", ""),
            artist_name=r["_id"].get("a", ""),
            count=r["c"],
        ))

    for r in album_res:
        day = _day(r["_id"]["d"])
        day["albums"][r["_id"].get("al", "")] = r["c"]

    if not days:
        logger.info("No listening history to rollup", user_id=user_id)
        return 0

    # Delete existing rollups for affected dates, then bulk insert new ones
    date_list = list(days.keys())
    await DailyRollup.find(
        {"user_id": user_id, "date": {"$in": date_list}}
    ).delete()

    rollups = []
    for date_str, data in days.items():
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        rollups.append(DailyRollup(
            user_id=user_id,
            date=date_str,
            day_of_week=dt.weekday(),
            total_plays=data["plays"],
            total_ms=data["ms"],
            hourly=sorted(
                [HourlyBucket(hour=h, count=v["count"], ms=v["ms"])
                 for h, v in data["hourly"].items()],
                key=lambda b: b.hour,
            ),
            artist_plays=data["artists"],
            album_plays=data["albums"],
            track_plays=data["tracks"],
        ))

    await DailyRollup.insert_many(rollups)
    logger.info("Rollups built", user_id=user_id, days=len(rollups))
    return len(rollups)


async def update_rollup_for_date(user_id: str, date_str: str) -> None:
    """Rebuild the rollup for a single date (e.g. today after a sync)."""
    await build_rollups(user_id, start_date=date_str, end_date=date_str)


async def ensure_rollups_exist(user_id: str) -> None:
    """If no rollups exist for this user, build them from raw history."""
    count = await DailyRollup.find({"user_id": user_id}).count()
    if count > 0:
        return

    history_count = await ListeningHistory.find(
        {"user_id": user_id}
    ).count()
    if history_count == 0:
        return

    logger.info(
        "Building initial rollups from raw history",
        user_id=user_id,
        history_records=history_count,
    )
    await build_rollups(user_id)


async def get_rollup_status(user_id: str) -> dict:
    """Return rollup build status for a user."""
    from app.models.sync_job import SyncJob

    rollup_days = await DailyRollup.find({"user_id": user_id}).count()

    # Count distinct days in listening history
    history_days_res = await ListeningHistory.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$played_at"}}}},
        {"$count": "n"},
    ], allowDiskUse=True).to_list()
    history_days = history_days_res[0]["n"] if history_days_res else 0

    # Check if a rollup build job is currently running
    running_job = await SyncJob.find_one(
        {"user_id": user_id, "job_type": "rollup_build", "status": "running"},
    )

    # Get last completed rollup build
    last_job = await SyncJob.find_one(
        {"user_id": user_id, "job_type": "rollup_build", "status": "completed"},
        sort=[("completed_at", -1)],
    )

    return {
        "rollup_days": rollup_days,
        "history_days": history_days,
        "is_building": running_job is not None,
        "started_at": running_job.started_at.isoformat() if running_job else None,
        "last_built_at": last_job.completed_at.isoformat() if last_job and last_job.completed_at else None,
        "items_processed": running_job.items_processed if running_job else 0,
    }
