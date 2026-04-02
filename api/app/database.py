"""MongoDB connection management using Beanie ODM."""

import asyncio
from typing import Any

import structlog
from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.config import settings

logger = structlog.get_logger()

client: AsyncMongoClient | None = None

MAX_RETRIES = 10
RETRY_DELAY = 3  # seconds


async def _deduplicate_listening_history(db: Any) -> int:
    """Remove duplicate listening_history records using raw motor operations.

    Must run BEFORE init_beanie so the unique index can be built.
    Returns count of deleted duplicates.
    """
    coll = db["listening_history"]

    # Find duplicate groups by (user_id, track.spotify_id, played_at)
    pipeline = [
        {"$group": {
            "_id": {
                "user_id": "$user_id",
                "spotify_id": "$track.spotify_id",
                "played_at": "$played_at",
            },
            "count": {"$sum": 1},
            "ids": {"$push": "$_id"},
        }},
        {"$match": {"count": {"$gt": 1}}},
    ]

    cursor = await coll.aggregate(pipeline, allowDiskUse=True)
    dup_groups = await cursor.to_list()
    if not dup_groups:
        return 0

    # Keep the first document in each group, delete the rest
    ids_to_delete = []
    for group in dup_groups:
        ids_to_delete.extend(group["ids"][1:])

    if not ids_to_delete:
        return 0

    # Delete in batches of 5000
    total_deleted = 0
    for i in range(0, len(ids_to_delete), 5000):
        batch = ids_to_delete[i : i + 5000]
        result = await coll.delete_many({"_id": {"$in": batch}})
        total_deleted += result.deleted_count

    return total_deleted


async def init_db() -> None:
    """Initialize MongoDB connection and Beanie ODM with retry logic."""
    global client
    from app.models import ALL_MODELS

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            client = AsyncMongoClient(
                settings.mongo_uri,
                maxPoolSize=10,
                minPoolSize=2,
                maxIdleTimeMS=30000,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=30000,
            )
            db = client[settings.mongo_db]

            # Drop the old non-unique compound index that conflicts with the
            # new unique index (same key pattern, different options).
            try:
                await db["listening_history"].drop_index(
                    "user_id_1_track.spotify_id_1_played_at_1"
                )
            except Exception:
                pass  # Index may not exist or already dropped

            # Deduplicate listening_history before Beanie tries to create
            # the unique index — otherwise index build fails on dirty data.
            dedup_removed = 0
            try:
                dedup_removed = await _deduplicate_listening_history(db)
                if dedup_removed:
                    logger.info(
                        "Deduplicated listening_history on startup",
                        duplicates_removed=dedup_removed,
                    )
            except Exception as dedup_err:
                logger.warning(
                    "Dedup check failed, continuing",
                    error=str(dedup_err)[:200],
                )

            await init_beanie(database=db, document_models=ALL_MODELS)

            # Rebuild rollups if duplicates were removed so dashboard
            # stats reflect the cleaned data.
            if dedup_removed:
                try:
                    from app.models.user import User
                    from app.services.rollup_service import build_rollups

                    users = await User.find_all().to_list()
                    for user in users:
                        days = await build_rollups(str(user.id))
                        logger.info(
                            "Rebuilt rollups after dedup",
                            user_id=str(user.id),
                            days=days,
                        )
                except Exception as rollup_err:
                    logger.warning(
                        "Rollup rebuild after dedup failed",
                        error=str(rollup_err)[:200],
                    )

            # Create TTL index on api_logs (Beanie doesn't support TTL index syntax)
            try:
                await db["api_logs"].create_index(
                    "timestamp", expireAfterSeconds=2592000, background=True
                )
            except Exception:
                pass  # Index may already exist

            if attempt > 1:
                logger.info("Database connected after retry", attempt=attempt)
            return
        except Exception as exc:
            if attempt == MAX_RETRIES:
                logger.error(
                    "Database connection failed after all retries",
                    attempts=MAX_RETRIES,
                    error=str(exc),
                )
                raise
            logger.warning(
                "Database not ready, retrying...",
                attempt=attempt,
                max_retries=MAX_RETRIES,
                delay=RETRY_DELAY,
                error=str(exc),
            )
            # Close failed client before retrying
            if client:
                try:
                    await client.close()
                except Exception:
                    pass
                client = None
            await asyncio.sleep(RETRY_DELAY)


async def close_db() -> None:
    """Close MongoDB connection."""
    global client
    if client:
        await client.close()
