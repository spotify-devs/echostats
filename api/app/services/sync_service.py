"""Spotify data sync service — fetches and stores user data."""

from datetime import datetime
from typing import Any

import structlog

from app.models.artist import Artist, ArtistImage
from app.models.listening_history import HistoryTrackRef, ListeningHistory
from app.models.playlist import Playlist, PlaylistImage
from app.models.sync_job import SyncJob
from app.models.track import AudioFeatures, Track, TrackAlbumRef, TrackArtistRef
from app.services.spotify_client import SpotifyClient

logger = structlog.get_logger()


async def sync_recently_played(client: SpotifyClient, user_id: str) -> int:
    """Sync recently played tracks for a user. Returns count of new entries."""
    count = 0
    try:
        # Use cursor: only fetch tracks played after the most recent one we have
        after_ts: int | None = None
        latest = await ListeningHistory.find(
            {"user_id": user_id, "source": "api"}
        ).sort([("played_at", -1)]).limit(1).to_list()
        if latest:
            after_ts = int(latest[0].played_at.timestamp() * 1000)

        data = await client.get_recently_played(limit=50, after=after_ts)
        items = data.get("items", [])

        if not items:
            return 0

        # Batch dedup: collect all (track_id, played_at) pairs and check at once
        candidate_keys = []
        valid_items = []
        for item in items:
            track_data = item.get("track", {})
            played_at_str = item.get("played_at", "")
            if not track_data or not played_at_str:
                continue
            played_at = datetime.fromisoformat(played_at_str.replace("Z", "+00:00"))
            spotify_id = track_data.get("id", "")
            candidate_keys.append({"user_id": user_id, "track.spotify_id": spotify_id, "played_at": played_at})
            valid_items.append((item, track_data, played_at, spotify_id))

        # Batch check for existing entries — use timestamp (ms) for comparison
        # to avoid tz-aware vs tz-naive isoformat mismatches
        existing_set: set[tuple[str, int]] = set()
        if candidate_keys:
            existing_docs = await ListeningHistory.find(
                {"$or": candidate_keys}
            ).to_list()
            for doc in existing_docs:
                ts_ms = int(doc.played_at.timestamp() * 1000)
                existing_set.add((doc.track.spotify_id, ts_ms))

        # Build new entries and collect tracks to upsert
        new_entries: list[ListeningHistory] = []
        tracks_to_upsert: dict[str, dict] = {}

        for item, track_data, played_at, spotify_id in valid_items:
            key = (spotify_id, int(played_at.timestamp() * 1000))
            if key in existing_set:
                continue
            # Prevent duplicates within the same batch
            existing_set.add(key)

            artists = track_data.get("artists", [])
            artist_name = artists[0]["name"] if artists else "Unknown"
            album_data = track_data.get("album", {})
            album_images = album_data.get("images", [])

            new_entries.append(ListeningHistory(
                user_id=user_id,
                track=HistoryTrackRef(
                    spotify_id=spotify_id,
                    name=track_data.get("name", ""),
                    artist_name=artist_name,
                    album_name=album_data.get("name", ""),
                    album_image_url=album_images[0]["url"] if album_images else "",
                    duration_ms=track_data.get("duration_ms", 0),
                ),
                played_at=played_at,
                source="api",
                context_type=item.get("context", {}).get("type", "") if item.get("context") else "",
                context_uri=item.get("context", {}).get("uri", "") if item.get("context") else "",
            ))

            # Collect unique tracks for batch upsert
            if spotify_id not in tracks_to_upsert:
                tracks_to_upsert[spotify_id] = track_data

        # Bulk insert new history entries (ordered=False to skip dupes caught by unique index)
        if new_entries:
            try:
                await ListeningHistory.insert_many(new_entries, ordered=False)
            except Exception as bulk_err:
                # BulkWriteError with duplicate key errors is expected; count successes
                err_str = str(bulk_err)
                if "E11000" in err_str or "duplicate key" in err_str.lower():
                    logger.warning(
                        "Some duplicates skipped during insert",
                        user_id=user_id,
                        error=err_str[:200],
                    )
                else:
                    raise
            count = len(new_entries)

        # Batch upsert tracks
        if tracks_to_upsert:
            await _bulk_upsert_tracks(list(tracks_to_upsert.values()))

    except Exception as e:
        logger.error("Failed to sync recently played", error=str(e), user_id=user_id)
        raise

    logger.info("Synced recently played", user_id=user_id, new_entries=count)
    return count


async def sync_top_items(client: SpotifyClient, user_id: str) -> dict[str, int]:
    """Sync user's top artists and tracks across all time ranges."""
    counts = {"artists": 0, "tracks": 0}

    for time_range in ["short_term", "medium_term", "long_term"]:
        try:
            # Top artists
            data = await client.get_top_items("artists", time_range=time_range, limit=50)
            for item in data.get("items", []):
                await _upsert_artist(item)
                counts["artists"] += 1

            # Top tracks
            data = await client.get_top_items("tracks", time_range=time_range, limit=50)
            for item in data.get("items", []):
                await _upsert_track(item)
                counts["tracks"] += 1

        except Exception as e:
            logger.error(
                "Failed to sync top items",
                time_range=time_range,
                error=str(e),
                user_id=user_id,
            )

    logger.info("Synced top items", user_id=user_id, counts=counts)
    return counts


async def sync_saved_tracks(client: SpotifyClient, user_id: str, max_pages: int = 10) -> int:
    """Sync user's saved/liked tracks."""
    count = 0
    offset = 0
    page = 0

    while page < max_pages:
        try:
            data = await client.get_saved_tracks(limit=50, offset=offset)
            items = data.get("items", [])
            if not items:
                break

            for item in items:
                track_data = item.get("track", {})
                if track_data:
                    await _upsert_track(track_data)
                    count += 1

            offset += len(items)
            page += 1

            if not data.get("next"):
                break

        except Exception as e:
            logger.error("Failed to sync saved tracks", error=str(e), offset=offset)
            break

    logger.info("Synced saved tracks", user_id=user_id, count=count)
    return count


async def sync_playlists(client: SpotifyClient, user_id: str) -> int:
    """Sync user's playlists."""
    count = 0
    offset = 0

    while True:
        try:
            data = await client.get_user_playlists(limit=50, offset=offset)
            items = data.get("items", [])
            if not items:
                break

            for item in items:
                spotify_id = item.get("id", "")
                images = item.get("images", [])

                existing = await Playlist.find_one(
                    Playlist.spotify_id == spotify_id,
                    Playlist.user_id == user_id,
                )
                if existing:
                    existing.name = item.get("name", "")
                    existing.description = item.get("description", "")
                    existing.public = item.get("public", True)
                    existing.collaborative = item.get("collaborative", False)
                    existing.total_tracks = item.get("tracks", {}).get("total", 0)
                    existing.snapshot_id = item.get("snapshot_id", "")
                    existing.images = [
                        PlaylistImage(
                            url=img.get("url", ""),
                            height=img.get("height"),
                            width=img.get("width"),
                        )
                        for img in images
                    ]
                    existing.fetched_at = datetime.utcnow()
                    await existing.save()
                else:
                    playlist = Playlist(
                        spotify_id=spotify_id,
                        user_id=user_id,
                        name=item.get("name", ""),
                        description=item.get("description", "") or "",
                        public=item.get("public", True),
                        collaborative=item.get("collaborative", False),
                        images=[
                            PlaylistImage(
                                url=img.get("url", ""),
                                height=img.get("height"),
                                width=img.get("width"),
                            )
                            for img in images
                        ],
                        owner_id=item.get("owner", {}).get("id", ""),
                        owner_name=item.get("owner", {}).get("display_name", ""),
                        total_tracks=item.get("tracks", {}).get("total", 0),
                        snapshot_id=item.get("snapshot_id", ""),
                        external_url=item.get("external_urls", {}).get("spotify", ""),
                    )
                    await playlist.insert()
                count += 1

            offset += len(items)
            if not data.get("next"):
                break

        except Exception as e:
            logger.error("Failed to sync playlists", error=str(e))
            break

    logger.info("Synced playlists", user_id=user_id, count=count)
    return count


async def enrich_audio_features(client: SpotifyClient, batch_size: int = 100) -> int:
    """Fetch audio features for tracks that don't have them yet."""
    count = 0
    tracks = await Track.find(Track.audio_features == None).limit(batch_size).to_list()

    if not tracks:
        return 0

    # Process in batches of 100 (Spotify API limit)
    for i in range(0, len(tracks), 100):
        batch = tracks[i : i + 100]
        track_ids = [t.spotify_id for t in batch]

        try:
            data = await client.get_audio_features(track_ids)
            features_list = data.get("audio_features", [])

            for features in features_list:
                if not features:
                    continue
                track_id = features.get("id", "")
                track = next((t for t in batch if t.spotify_id == track_id), None)
                if track:
                    track.audio_features = AudioFeatures(
                        danceability=features.get("danceability", 0),
                        energy=features.get("energy", 0),
                        key=features.get("key", 0),
                        loudness=features.get("loudness", 0),
                        mode=features.get("mode", 0),
                        speechiness=features.get("speechiness", 0),
                        acousticness=features.get("acousticness", 0),
                        instrumentalness=features.get("instrumentalness", 0),
                        liveness=features.get("liveness", 0),
                        valence=features.get("valence", 0),
                        tempo=features.get("tempo", 0),
                        duration_ms=features.get("duration_ms", 0),
                        time_signature=features.get("time_signature", 4),
                    )
                    track.updated_at = datetime.utcnow()
                    await track.save()
                    count += 1

        except Exception as e:
            logger.error("Failed to fetch audio features", error=str(e))

    logger.info("Enriched audio features", count=count)
    return count


async def run_initial_sync(client: SpotifyClient, user_id: str) -> SyncJob:
    """Run initial full sync for a new user."""
    job = SyncJob(
        user_id=user_id,
        job_type="initial",
        status="running",
        started_at=datetime.utcnow(),
    )
    await job.insert()

    try:
        total = 0
        total += await sync_recently_played(client, user_id)
        counts = await sync_top_items(client, user_id)
        total += counts["artists"] + counts["tracks"]
        total += await sync_saved_tracks(client, user_id)
        total += await sync_playlists(client, user_id)
        total += await enrich_audio_features(client)

        job.status = "completed"
        job.items_processed = total
        job.completed_at = datetime.utcnow()
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)[:500]
        logger.error("Initial sync failed", user_id=user_id, error=str(e))
    finally:
        await job.save()

    return job


# ── Internal helpers ─────────────────────────────────────────────────────────


async def _bulk_upsert_tracks(data_list: list[dict[str, Any]]) -> None:
    """Batch upsert tracks to avoid N+1 queries."""
    if not data_list:
        return

    spotify_ids = [d.get("id", "") for d in data_list if d.get("id")]
    existing_tracks = await Track.find({"spotify_id": {"$in": spotify_ids}}).to_list()
    existing_map = {t.spotify_id: t for t in existing_tracks}

    # Update existing tracks via Beanie save()
    for data in data_list:
        sid = data.get("id", "")
        if sid in existing_map:
            t = existing_map[sid]
            t.name = data.get("name", t.name)
            t.popularity = data.get("popularity", t.popularity)
            t.updated_at = datetime.utcnow()
            await t.save()

    # Bulk insert new tracks
    new_tracks = []
    new_artist_data: dict[str, dict] = {}
    for data in data_list:
        sid = data.get("id", "")
        if not sid or sid in existing_map:
            continue

        artists = data.get("artists", [])
        album_data = data.get("album", {})
        album_images = album_data.get("images", []) if album_data else []

        new_tracks.append(Track(
            spotify_id=sid,
            name=data.get("name", ""),
            artists=[
                TrackArtistRef(spotify_id=a.get("id", ""), name=a.get("name", ""))
                for a in artists
            ],
            album=TrackAlbumRef(
                spotify_id=album_data.get("id", ""),
                name=album_data.get("name", ""),
                image_url=album_images[0]["url"] if album_images else "",
                release_date=album_data.get("release_date", ""),
            ) if album_data else None,
            duration_ms=data.get("duration_ms", 0),
            popularity=data.get("popularity", 0),
            explicit=data.get("explicit", False),
            preview_url=data.get("preview_url"),
            external_url=data.get("external_urls", {}).get("spotify", ""),
        ))

        for artist_data in artists:
            aid = artist_data.get("id")
            if aid and aid not in new_artist_data:
                new_artist_data[aid] = artist_data

    if new_tracks:
        await Track.insert_many(new_tracks)

    # Batch upsert associated artists
    if new_artist_data:
        await _bulk_upsert_artists_minimal(list(new_artist_data.values()))


async def _upsert_track(data: dict[str, Any]) -> Track:
    """Create or update a track document."""
    spotify_id = data.get("id", "")
    artists = data.get("artists", [])
    album_data = data.get("album", {})
    album_images = album_data.get("images", []) if album_data else []

    existing = await Track.find_one(Track.spotify_id == spotify_id)
    if existing:
        existing.name = data.get("name", existing.name)
        existing.popularity = data.get("popularity", existing.popularity)
        existing.updated_at = datetime.utcnow()
        await existing.save()
        return existing

    track = Track(
        spotify_id=spotify_id,
        name=data.get("name", ""),
        artists=[
            TrackArtistRef(spotify_id=a.get("id", ""), name=a.get("name", ""))
            for a in artists
        ],
        album=TrackAlbumRef(
            spotify_id=album_data.get("id", ""),
            name=album_data.get("name", ""),
            image_url=album_images[0]["url"] if album_images else "",
            release_date=album_data.get("release_date", ""),
        )
        if album_data
        else None,
        duration_ms=data.get("duration_ms", 0),
        popularity=data.get("popularity", 0),
        explicit=data.get("explicit", False),
        preview_url=data.get("preview_url"),
        external_url=data.get("external_urls", {}).get("spotify", ""),
    )
    await track.insert()

    # Also upsert associated artists
    for artist_data in artists:
        if artist_data.get("id"):
            await _upsert_artist_minimal(artist_data)

    return track


async def _upsert_artist(data: dict[str, Any]) -> Artist:
    """Create or update a full artist document."""
    spotify_id = data.get("id", "")
    images = data.get("images", [])

    existing = await Artist.find_one(Artist.spotify_id == spotify_id)
    if existing:
        existing.name = data.get("name", existing.name)
        existing.genres = data.get("genres", existing.genres)
        existing.popularity = data.get("popularity", existing.popularity)
        existing.followers = data.get("followers", {}).get("total", existing.followers)
        existing.images = [
            ArtistImage(url=img.get("url", ""), height=img.get("height"), width=img.get("width"))
            for img in images
        ]
        existing.updated_at = datetime.utcnow()
        await existing.save()
        return existing

    artist = Artist(
        spotify_id=spotify_id,
        name=data.get("name", ""),
        genres=data.get("genres", []),
        popularity=data.get("popularity", 0),
        followers=data.get("followers", {}).get("total", 0),
        images=[
            ArtistImage(url=img.get("url", ""), height=img.get("height"), width=img.get("width"))
            for img in images
        ],
        external_url=data.get("external_urls", {}).get("spotify", ""),
    )
    await artist.insert()
    return artist


async def _upsert_artist_minimal(data: dict[str, Any]) -> None:
    """Create a minimal artist record if it doesn't exist."""
    spotify_id = data.get("id", "")
    if not spotify_id:
        return
    existing = await Artist.find_one(Artist.spotify_id == spotify_id)
    if not existing:
        artist = Artist(
            spotify_id=spotify_id,
            name=data.get("name", ""),
            external_url=data.get("external_urls", {}).get("spotify", ""),
        )
        await artist.insert()


async def _bulk_upsert_artists_minimal(data_list: list[dict[str, Any]]) -> None:
    """Batch create minimal artist records for artists that don't exist."""
    if not data_list:
        return

    spotify_ids = [d.get("id", "") for d in data_list if d.get("id")]
    existing = await Artist.find({"spotify_id": {"$in": spotify_ids}}).to_list()
    existing_ids = {a.spotify_id for a in existing}

    new_artists = []
    for data in data_list:
        sid = data.get("id", "")
        if sid and sid not in existing_ids:
            new_artists.append(Artist(
                spotify_id=sid,
                name=data.get("name", ""),
                external_url=data.get("external_urls", {}).get("spotify", ""),
            ))
            existing_ids.add(sid)  # Prevent duplicates within the batch

    if new_artists:
        await Artist.insert_many(new_artists)
