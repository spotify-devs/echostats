"""Import service for Spotify privacy data exports."""

import json
from datetime import datetime, timedelta
from typing import Any

import structlog

from app.models.analytics import AnalyticsSnapshot
from app.models.listening_history import HistoryTrackRef, ListeningHistory
from app.models.sync_job import SyncJob
from app.services.rollup_service import build_rollups

logger = structlog.get_logger()


async def import_streaming_history(
    user_id: str, file_content: bytes, filename: str
) -> SyncJob:
    """Import a StreamingHistory*.json or endsong*.json file."""
    job = SyncJob(
        user_id=user_id,
        job_type="import",
        status="running",
        started_at=datetime.utcnow(),
    )
    await job.insert()

    try:
        data = json.loads(file_content)
        if not isinstance(data, list):
            raise ValueError("Expected a JSON array")

        job.items_total = len(data)
        count = 0

        # Parse all entries first
        parsed: list[ListeningHistory] = []
        for entry in data:
            try:
                history = await _parse_history_entry(user_id, entry, filename)
                if history:
                    parsed.append(history)
            except Exception as e:
                logger.debug("Skipping entry", error=str(e))
                continue

        # Batch dedup and insert in chunks of 1000
        chunk_size = 1000
        for i in range(0, len(parsed), chunk_size):
            chunk = parsed[i : i + chunk_size]

            # Build dedup queries for the chunk
            dedup_filters = []
            for h in chunk:
                end_time = h.played_at + timedelta(
                    milliseconds=h.ms_played or 0
                )
                dedup_filters.append({
                    "user_id": user_id,
                    "track.spotify_id": h.track.spotify_id,
                    "$or": [
                        {"played_at": h.played_at},
                        {"played_at": end_time},
                    ],
                })

            # Batch check existing — query in sub-batches to avoid huge $or
            existing_keys: set[tuple[str, str]] = set()
            sub_batch = 100
            for j in range(0, len(dedup_filters), sub_batch):
                sub = dedup_filters[j : j + sub_batch]
                existing_docs = await ListeningHistory.find(
                    {"$or": sub}
                ).to_list()
                for doc in existing_docs:
                    existing_keys.add((doc.track.spotify_id, doc.played_at.isoformat()))

            # Filter to only new entries
            new_entries = []
            for h in chunk:
                key = (h.track.spotify_id, h.played_at.isoformat())
                end_time = h.played_at + timedelta(milliseconds=h.ms_played or 0)
                key2 = (h.track.spotify_id, end_time.isoformat())
                if key not in existing_keys and key2 not in existing_keys:
                    new_entries.append(h)

            if new_entries:
                await ListeningHistory.insert_many(new_entries)
                count += len(new_entries)

        job.status = "completed"
        job.items_processed = count
        job.completed_at = datetime.utcnow()

        # Invalidate all cached analytics snapshots so they get recomputed
        if count > 0:
            deleted = await AnalyticsSnapshot.find(
                AnalyticsSnapshot.user_id == user_id
            ).delete()
            logger.info(
                "Invalidated analytics snapshots after import",
                user_id=user_id,
                deleted=deleted,
            )
            # Rebuild rollups from raw history so analytics are instant
            try:
                await build_rollups(user_id)
            except Exception as e:
                logger.error("Rollup rebuild after import failed", user_id=user_id, error=str(e))

        logger.info(
            "Import completed",
            user_id=user_id,
            filename=filename,
            total=len(data),
            imported=count,
        )

    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)[:500]
        logger.error("Import failed", user_id=user_id, filename=filename, error=str(e))

    await job.save()
    return job


async def _parse_history_entry(
    user_id: str, entry: dict[str, Any], filename: str
) -> ListeningHistory | None:
    """Parse a single entry from Spotify export data."""

    # Extended streaming history format (endsong*.json / Streaming_History_Audio*.json)
    if "ts" in entry:
        played_at_str = entry.get("ts", "")
        track_name = entry.get("master_metadata_track_name", "")
        artist_name = entry.get("master_metadata_album_artist_name", "")
        album_name = entry.get("master_metadata_album_album_name", "")
        ms_played = entry.get("ms_played", 0)
        spotify_uri = entry.get("spotify_track_uri", "")

        if not track_name or not spotify_uri:
            return None

        spotify_id = spotify_uri.split(":")[-1] if spotify_uri else ""

        # ts is when the track STOPPED playing; compute start time
        end_time = datetime.fromisoformat(played_at_str.replace("Z", "+00:00"))
        played_at = end_time - timedelta(milliseconds=ms_played)

        return ListeningHistory(
            user_id=user_id,
            track=HistoryTrackRef(
                spotify_id=spotify_id,
                name=track_name,
                artist_name=artist_name or "Unknown",
                album_name=album_name or "",
                duration_ms=0,  # actual track duration unknown from export
            ),
            played_at=played_at,
            ms_played=ms_played,
            source="import",
        )

    # Basic streaming history format (StreamingHistory*.json)
    if "endTime" in entry:
        played_at_str = entry.get("endTime", "")
        track_name = entry.get("trackName", "")
        artist_name = entry.get("artistName", "")
        ms_played = entry.get("msPlayed", 0)

        if not track_name:
            return None

        end_time = datetime.strptime(played_at_str, "%Y-%m-%d %H:%M")
        played_at = end_time - timedelta(milliseconds=ms_played)

        return ListeningHistory(
            user_id=user_id,
            track=HistoryTrackRef(
                spotify_id="",  # Not available in basic format
                name=track_name,
                artist_name=artist_name or "Unknown",
                duration_ms=0,  # actual track duration unknown from export
            ),
            played_at=played_at,
            ms_played=ms_played,
            source="import",
        )

    return None
