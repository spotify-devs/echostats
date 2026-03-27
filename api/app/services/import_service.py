"""Import service for Spotify privacy data exports."""

import json
from datetime import datetime, timedelta
from typing import Any

import structlog

from app.models.analytics import AnalyticsSnapshot
from app.models.listening_history import HistoryTrackRef, ListeningHistory
from app.models.sync_job import SyncJob

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

        for entry in data:
            try:
                history = await _parse_history_entry(user_id, entry, filename)
                if history:
                    # Dedup: check both old format (played_at=end_time) and
                    # new format (played_at=start_time) to avoid duplicates
                    # across re-imports.
                    end_time = history.played_at + timedelta(
                        milliseconds=history.ms_played or 0
                    )
                    existing = await ListeningHistory.find_one(
                        {
                            "user_id": user_id,
                            "track.spotify_id": history.track.spotify_id,
                            "$or": [
                                {"played_at": history.played_at},
                                {"played_at": end_time},
                            ],
                        }
                    )
                    if not existing:
                        await history.insert()
                        count += 1
            except Exception as e:
                logger.debug("Skipping entry", error=str(e))
                continue

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
