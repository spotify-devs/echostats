"""Migration 001: deduplicate listening_history and set up unique index.

Replaces the ad-hoc dedup logic that was previously in database.py init_db.
"""

from typing import Any

import structlog

logger = structlog.get_logger()


async def up(db: Any) -> None:
    coll = db["listening_history"]

    # Step 1: Drop old non-unique compound index if it exists
    try:
        await coll.drop_index("user_id_1_track.spotify_id_1_played_at_1")
        logger.info("Dropped old non-unique compound index")
    except Exception:
        pass  # Already dropped or doesn't exist

    # Step 2: Remove duplicate records
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

    if dup_groups:
        ids_to_delete = []
        for group in dup_groups:
            ids_to_delete.extend(group["ids"][1:])

        total = 0
        for i in range(0, len(ids_to_delete), 5000):
            batch = ids_to_delete[i : i + 5000]
            result = await coll.delete_many({"_id": {"$in": batch}})
            total += result.deleted_count

        logger.info("Removed duplicate listening_history records", count=total)
