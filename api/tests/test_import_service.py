"""Import service tests -- _parse_history_entry parsing logic."""

import json
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.import_service import _parse_history_entry, import_streaming_history


def _make_listening_history(**kwargs):
    """Stand-in for ListeningHistory constructor (avoids Beanie init)."""
    return SimpleNamespace(**kwargs)


# -- Extended history format (endsong) --


@pytest.mark.asyncio
@patch("app.services.import_service.ListeningHistory")
async def test_parse_extended_format_preserves_ms_played(mock_lh):
    """Extended format entries preserve ms_played from the export."""
    mock_lh.side_effect = _make_listening_history

    entry = {
        "ts": "2024-06-15T14:30:00Z",
        "master_metadata_track_name": "Song A",
        "master_metadata_album_artist_name": "Artist A",
        "master_metadata_album_album_name": "Album A",
        "ms_played": 240_000,
        "spotify_track_uri": "spotify:track:abc123",
    }

    result = await _parse_history_entry("user1", entry, "endsong_0.json")

    assert result is not None
    assert result.ms_played == 240_000
    assert result.track.spotify_id == "abc123"
    assert result.track.name == "Song A"
    assert result.track.artist_name == "Artist A"
    assert result.track.album_name == "Album A"
    assert result.source == "import"


@pytest.mark.asyncio
@patch("app.services.import_service.ListeningHistory")
async def test_parse_extended_format_computes_played_at_from_end_time(mock_lh):
    """played_at should be end_time minus ms_played."""
    mock_lh.side_effect = _make_listening_history

    entry = {
        "ts": "2024-06-15T14:30:00Z",
        "master_metadata_track_name": "Song",
        "master_metadata_album_artist_name": "Artist",
        "master_metadata_album_album_name": "Album",
        "ms_played": 60_000,
        "spotify_track_uri": "spotify:track:xyz",
    }

    result = await _parse_history_entry("user1", entry, "endsong_0.json")

    end_time = datetime.fromisoformat("2024-06-15T14:30:00+00:00")
    expected_start = end_time - timedelta(milliseconds=60_000)
    assert result.played_at == expected_start


@pytest.mark.asyncio
async def test_parse_extended_format_skips_missing_track_name():
    """Entries without a track name are skipped."""
    entry = {
        "ts": "2024-06-15T14:30:00Z",
        "master_metadata_track_name": "",
        "spotify_track_uri": "spotify:track:abc123",
        "ms_played": 1000,
    }

    result = await _parse_history_entry("user1", entry, "endsong_0.json")
    assert result is None


@pytest.mark.asyncio
async def test_parse_extended_format_skips_missing_uri():
    """Entries without a Spotify URI are skipped."""
    entry = {
        "ts": "2024-06-15T14:30:00Z",
        "master_metadata_track_name": "Song",
        "spotify_track_uri": "",
        "ms_played": 1000,
    }

    result = await _parse_history_entry("user1", entry, "endsong_0.json")
    assert result is None


# -- Basic history format (StreamingHistory) --


@pytest.mark.asyncio
@patch("app.services.import_service.ListeningHistory")
async def test_parse_basic_format_extracts_fields(mock_lh):
    """Basic StreamingHistory entries are parsed correctly."""
    mock_lh.side_effect = _make_listening_history

    entry = {
        "endTime": "2024-06-15 14:30",
        "trackName": "Song B",
        "artistName": "Artist B",
        "msPlayed": 180_000,
    }

    result = await _parse_history_entry("user1", entry, "StreamingHistory0.json")

    assert result is not None
    assert result.track.name == "Song B"
    assert result.track.artist_name == "Artist B"
    assert result.ms_played == 180_000
    assert result.track.spotify_id == ""
    assert result.source == "import"


@pytest.mark.asyncio
@patch("app.services.import_service.ListeningHistory")
async def test_parse_basic_format_computes_played_at(mock_lh):
    """Basic format: played_at = endTime - msPlayed."""
    mock_lh.side_effect = _make_listening_history

    entry = {
        "endTime": "2024-06-15 14:30",
        "trackName": "Song",
        "artistName": "Artist",
        "msPlayed": 120_000,
    }

    result = await _parse_history_entry("user1", entry, "StreamingHistory0.json")

    end_time = datetime.strptime("2024-06-15 14:30", "%Y-%m-%d %H:%M")
    expected_start = end_time - timedelta(milliseconds=120_000)
    assert result.played_at == expected_start


@pytest.mark.asyncio
async def test_parse_basic_format_skips_missing_track_name():
    """Basic entries without a trackName are skipped."""
    entry = {
        "endTime": "2024-06-15 14:30",
        "trackName": "",
        "artistName": "Artist",
        "msPlayed": 1000,
    }

    result = await _parse_history_entry("user1", entry, "StreamingHistory0.json")
    assert result is None


# -- Malformed / unknown format --


@pytest.mark.asyncio
async def test_parse_unknown_format_returns_none():
    """Entries matching neither format return None."""
    entry = {"some_random_key": "value"}
    result = await _parse_history_entry("user1", entry, "unknown.json")
    assert result is None


@pytest.mark.asyncio
async def test_parse_empty_entry_returns_none():
    """An empty dict returns None."""
    result = await _parse_history_entry("user1", {}, "file.json")
    assert result is None


# -- Source field --


@pytest.mark.asyncio
@patch("app.services.import_service.ListeningHistory")
async def test_source_is_import_for_extended(mock_lh):
    """Extended entries have source='import'."""
    mock_lh.side_effect = _make_listening_history

    entry = {
        "ts": "2024-06-15T14:00:00Z",
        "master_metadata_track_name": "X",
        "master_metadata_album_artist_name": "Y",
        "ms_played": 5000,
        "spotify_track_uri": "spotify:track:t1",
    }
    result = await _parse_history_entry("user1", entry, "endsong_0.json")
    assert result.source == "import"


@pytest.mark.asyncio
@patch("app.services.import_service.ListeningHistory")
async def test_source_is_import_for_basic(mock_lh):
    """Basic entries have source='import'."""
    mock_lh.side_effect = _make_listening_history

    entry = {
        "endTime": "2024-06-15 10:00",
        "trackName": "X",
        "artistName": "Y",
        "msPlayed": 5000,
    }
    result = await _parse_history_entry("user1", entry, "StreamingHistory0.json")
    assert result.source == "import"


# -- import_streaming_history integration (mocked DB) --


@pytest.mark.asyncio
@patch("app.services.import_service.build_rollups", new_callable=AsyncMock)
@patch("app.services.import_service.AnalyticsSnapshot")
@patch("app.services.import_service.ListeningHistory")
@patch("app.services.import_service.SyncJob")
async def test_import_inserts_new_records(mock_job_cls, mock_lh, mock_snap, mock_rollups):
    """import_streaming_history inserts parsed records via insert_many."""
    job_instance = MagicMock()
    job_instance.insert = AsyncMock()
    job_instance.save = AsyncMock()
    mock_job_cls.return_value = job_instance

    # Let the ListeningHistory constructor create objects with real attributes
    mock_lh.side_effect = _make_listening_history

    # No existing records - everything is new
    mock_lh.find.return_value.to_list = AsyncMock(return_value=[])
    mock_lh.insert_many = AsyncMock()

    mock_snap.find.return_value.delete = AsyncMock(return_value=1)

    payload = [
        {
            "ts": "2024-06-15T14:30:00Z",
            "master_metadata_track_name": "Song A",
            "master_metadata_album_artist_name": "Artist A",
            "master_metadata_album_album_name": "Album A",
            "ms_played": 200_000,
            "spotify_track_uri": "spotify:track:aaa",
        },
    ]

    result = await import_streaming_history("user1", json.dumps(payload).encode(), "endsong_0.json")

    assert result.status == "completed"
    mock_lh.insert_many.assert_awaited_once()
    inserted = mock_lh.insert_many.call_args[0][0]
    assert len(inserted) == 1
    assert inserted[0].source == "import"
    assert inserted[0].ms_played == 200_000
