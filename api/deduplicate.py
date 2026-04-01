"""One-time script: remove duplicate listening_history records and rebuild rollups.

Usage:
    cd api && python deduplicate.py

Duplicates are identified by (user_id, track.spotify_id, played_at).
For each duplicate group, the first document is kept and the rest are deleted.
After dedup, rollups are rebuilt for all affected users.
"""

import asyncio

import structlog

from app.database import close_db, init_db
from app.models.listening_history import ListeningHistory
from app.models.user import User
from app.services.rollup_service import build_rollups

logger = structlog.get_logger()


async def deduplicate_listening_history() -> None:
    await init_db()
    print("Connected to database.\n")

    users = await User.find_all().to_list()
    print(f"Found {len(users)} user(s).\n")

    total_deleted = 0

    for user in users:
        user_id = str(user.id)
        print(f"--- Processing user: {user_id} ---")

        # Find duplicate groups: (user_id, track.spotify_id, played_at) appearing > 1 time
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": {
                    "spotify_id": "$track.spotify_id",
                    "played_at": "$played_at",
                },
                "count": {"$sum": 1},
                "ids": {"$push": "$_id"},
            }},
            {"$match": {"count": {"$gt": 1}}},
        ]

        dup_groups = await ListeningHistory.aggregate(pipeline, allowDiskUse=True).to_list()
        if not dup_groups:
            print("  No duplicates found.\n")
            continue

        dup_count = sum(g["count"] - 1 for g in dup_groups)
        print(f"  Found {len(dup_groups)} duplicate group(s), {dup_count} extra record(s) to remove.")

        # For each group, keep the first _id and delete the rest
        ids_to_delete = []
        for group in dup_groups:
            # Keep the first document, delete the rest
            ids_to_delete.extend(group["ids"][1:])

        if ids_to_delete:
            # Delete in batches of 1000
            for i in range(0, len(ids_to_delete), 1000):
                batch = ids_to_delete[i:i + 1000]
                result = await ListeningHistory.find(
                    {"_id": {"$in": batch}}
                ).delete()
                deleted = result.deleted_count if result else 0
                total_deleted += deleted
                print(f"  Deleted batch {i // 1000 + 1}: {deleted} record(s)")

        # Rebuild rollups for this user
        print("  Rebuilding rollups...")
        days = await build_rollups(user_id)
        print(f"  Rebuilt {days} day(s) of rollups.\n")

    print(f"=== Done. Total duplicates removed: {total_deleted} ===")
    await close_db()


if __name__ == "__main__":
    asyncio.run(deduplicate_listening_history())
