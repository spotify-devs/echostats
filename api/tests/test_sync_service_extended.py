"""Extended sync_service tests — top items, saved tracks, playlists, audio features, initial sync."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.sync_service import (
    enrich_audio_features,
    run_initial_sync,
    sync_playlists,
    sync_saved_tracks,
    sync_top_items,
)

# ── sync_top_items ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("app.services.sync_service._upsert_track", new_callable=AsyncMock)
@patch("app.services.sync_service._upsert_artist", new_callable=AsyncMock)
async def test_sync_top_items_upserts_artists_and_tracks(mock_artist, mock_track):
    """Top items are upserted for each time range."""
    client = AsyncMock()

    def _top_items(item_type, **kwargs):
        if item_type == "artists":
            return {"items": [{"id": "a1", "name": "Artist1", "genres": []}]}
        return {"items": [{"id": "t1", "name": "Track1"}]}

    client.get_top_items = AsyncMock(side_effect=_top_items)

    counts = await sync_top_items(client, "user1")
    # 3 time ranges x 1 artist each = 3 artists
    assert counts["artists"] == 3
    assert counts["tracks"] == 3
    assert mock_artist.await_count == 3
    assert mock_track.await_count == 3


@pytest.mark.asyncio
@patch("app.services.sync_service._upsert_track", new_callable=AsyncMock)
@patch("app.services.sync_service._upsert_artist", new_callable=AsyncMock)
async def test_sync_top_items_empty(mock_artist, mock_track):
    """When API returns no items, counts are zero."""
    client = AsyncMock()
    client.get_top_items = AsyncMock(return_value={"items": []})

    counts = await sync_top_items(client, "user1")
    assert counts == {"artists": 0, "tracks": 0}
    mock_artist.assert_not_awaited()
    mock_track.assert_not_awaited()


# ── sync_saved_tracks ────────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("app.services.sync_service._upsert_track", new_callable=AsyncMock)
async def test_sync_saved_tracks_single_page(mock_upsert):
    """Single page of saved tracks with no next link."""
    client = AsyncMock()
    client.get_saved_tracks = AsyncMock(return_value={
        "items": [{"track": {"id": "t1", "name": "Song"}}],
        "next": None,
    })

    count = await sync_saved_tracks(client, "user1")
    assert count == 1
    mock_upsert.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.services.sync_service._upsert_track", new_callable=AsyncMock)
async def test_sync_saved_tracks_pagination_stops_no_next(mock_upsert):
    """Pagination stops when 'next' is absent."""
    call_count = 0

    async def _get_saved(limit, offset):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return {
                "items": [{"track": {"id": "t1", "name": "Song1"}}],
                "next": "http://next",
            }
        return {
            "items": [{"track": {"id": "t2", "name": "Song2"}}],
            "next": None,
        }

    client = AsyncMock()
    client.get_saved_tracks = AsyncMock(side_effect=_get_saved)

    count = await sync_saved_tracks(client, "user1")
    assert count == 2
    assert mock_upsert.await_count == 2


@pytest.mark.asyncio
@patch("app.services.sync_service._upsert_track", new_callable=AsyncMock)
async def test_sync_saved_tracks_empty(mock_upsert):
    """No saved tracks returns 0."""
    client = AsyncMock()
    client.get_saved_tracks = AsyncMock(return_value={"items": [], "next": None})

    count = await sync_saved_tracks(client, "user1")
    assert count == 0
    mock_upsert.assert_not_awaited()


# ── sync_playlists ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("app.services.sync_service.Playlist")
async def test_sync_playlists_inserts_new(mock_playlist):
    """New playlists are inserted."""
    mock_playlist.find_one = AsyncMock(return_value=None)
    playlist_instance = MagicMock()
    playlist_instance.insert = AsyncMock()
    mock_playlist.return_value = playlist_instance

    client = AsyncMock()
    client.get_user_playlists = AsyncMock(return_value={
        "items": [{
            "id": "pl1",
            "name": "My Playlist",
            "description": "desc",
            "public": True,
            "collaborative": False,
            "images": [],
            "owner": {"id": "o1", "display_name": "Owner"},
            "tracks": {"total": 10},
            "snapshot_id": "snap1",
            "external_urls": {"spotify": "http://example.com"},
        }],
        "next": None,
    })

    count = await sync_playlists(client, "user1")
    assert count == 1
    playlist_instance.insert.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.services.sync_service.Playlist")
async def test_sync_playlists_updates_existing(mock_playlist):
    """Existing playlists are updated."""
    existing = MagicMock()
    existing.save = AsyncMock()
    mock_playlist.find_one = AsyncMock(return_value=existing)

    client = AsyncMock()
    client.get_user_playlists = AsyncMock(return_value={
        "items": [{
            "id": "pl1",
            "name": "Updated Playlist",
            "description": "",
            "public": False,
            "collaborative": True,
            "images": [{"url": "http://img.example.com", "height": 300, "width": 300}],
            "owner": {"id": "o1", "display_name": "Owner"},
            "tracks": {"total": 20},
            "snapshot_id": "snap2",
            "external_urls": {"spotify": "http://example.com"},
        }],
        "next": None,
    })

    count = await sync_playlists(client, "user1")
    assert count == 1
    existing.save.assert_awaited_once()
    assert existing.name == "Updated Playlist"


@pytest.mark.asyncio
@patch("app.services.sync_service.Playlist")
async def test_sync_playlists_empty(mock_playlist):
    """No playlists returns 0."""
    client = AsyncMock()
    client.get_user_playlists = AsyncMock(return_value={"items": [], "next": None})

    count = await sync_playlists(client, "user1")
    assert count == 0


# ── enrich_audio_features ────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("app.services.sync_service.Track")
async def test_enrich_audio_features_enriches_tracks(mock_track):
    """Tracks without audio features get enriched."""
    track = MagicMock()
    track.spotify_id = "t1"
    track.audio_features = None
    track.save = AsyncMock()

    find_chain = MagicMock()
    find_chain.limit.return_value.to_list = AsyncMock(return_value=[track])
    mock_track.find.return_value = find_chain

    client = AsyncMock()
    client.get_audio_features = AsyncMock(return_value={
        "audio_features": [{
            "id": "t1",
            "danceability": 0.8,
            "energy": 0.6,
            "key": 5,
            "loudness": -5.0,
            "mode": 1,
            "speechiness": 0.05,
            "acousticness": 0.1,
            "instrumentalness": 0.0,
            "liveness": 0.1,
            "valence": 0.7,
            "tempo": 120.0,
            "duration_ms": 200000,
            "time_signature": 4,
        }],
    })

    count = await enrich_audio_features(client, batch_size=50)
    assert count == 1
    track.save.assert_awaited_once()
    assert track.audio_features is not None


@pytest.mark.asyncio
@patch("app.services.sync_service.Track")
async def test_enrich_audio_features_no_tracks(mock_track):
    """When no tracks need enrichment, returns 0."""
    find_chain = MagicMock()
    find_chain.limit.return_value.to_list = AsyncMock(return_value=[])
    mock_track.find.return_value = find_chain

    client = AsyncMock()
    count = await enrich_audio_features(client, batch_size=50)
    assert count == 0
    client.get_audio_features.assert_not_awaited()


@pytest.mark.asyncio
@patch("app.services.sync_service.Track")
async def test_enrich_audio_features_skips_null_features(mock_track):
    """Null entries in audio_features response are skipped."""
    track = MagicMock()
    track.spotify_id = "t1"
    track.audio_features = None
    track.save = AsyncMock()

    find_chain = MagicMock()
    find_chain.limit.return_value.to_list = AsyncMock(return_value=[track])
    mock_track.find.return_value = find_chain

    client = AsyncMock()
    client.get_audio_features = AsyncMock(return_value={
        "audio_features": [None],
    })

    count = await enrich_audio_features(client, batch_size=50)
    assert count == 0
    track.save.assert_not_awaited()


# ── run_initial_sync ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("app.services.sync_service.enrich_audio_features", new_callable=AsyncMock, return_value=2)
@patch("app.services.sync_service.sync_playlists", new_callable=AsyncMock, return_value=3)
@patch("app.services.sync_service.sync_saved_tracks", new_callable=AsyncMock, return_value=10)
@patch("app.services.sync_service.sync_top_items", new_callable=AsyncMock, return_value={"artists": 5, "tracks": 5})
@patch("app.services.sync_service.sync_recently_played", new_callable=AsyncMock, return_value=20)
@patch("app.services.sync_service.SyncJob")
async def test_run_initial_sync_success(
    mock_sync_job, mock_rp, mock_top, mock_saved, mock_pl, mock_enrich
):
    """Successful initial sync creates and completes a SyncJob."""
    job = MagicMock()
    job.insert = AsyncMock()
    job.save = AsyncMock()
    mock_sync_job.return_value = job

    client = AsyncMock()
    result = await run_initial_sync(client, "user1")

    assert result is job
    assert job.status == "completed"
    # 20 + (5+5) + 10 + 3 + 2 = 45
    assert job.items_processed == 45
    job.insert.assert_awaited_once()
    job.save.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.services.sync_service.sync_recently_played", new_callable=AsyncMock, side_effect=RuntimeError("API down"))
@patch("app.services.sync_service.SyncJob")
async def test_run_initial_sync_failure(mock_sync_job, mock_rp):
    """On failure, the job is marked failed with an error message."""
    job = MagicMock()
    job.insert = AsyncMock()
    job.save = AsyncMock()
    mock_sync_job.return_value = job

    client = AsyncMock()
    result = await run_initial_sync(client, "user1")

    assert result is job
    assert job.status == "failed"
    assert "API down" in job.error_message
    job.save.assert_awaited_once()
