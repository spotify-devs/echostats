"""Sync service tests — sync_recently_played."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.listening_history import HistoryTrackRef, ListeningHistory
from app.services.sync_service import sync_recently_played


def _make_spotify_item(track_id: str, played_at: str, name: str = "Track") -> dict:
    """Build a Spotify API recently-played item."""
    return {
        "track": {
            "id": track_id,
            "name": name,
            "duration_ms": 200_000,
            "artists": [{"name": "Artist", "id": "a1"}],
            "album": {
                "name": "Album",
                "images": [{"url": "https://img.example.com/cover.jpg"}],
            },
        },
        "played_at": played_at,
        "context": {"type": "playlist", "uri": "spotify:playlist:abc"},
    }


def _make_history_doc(user_id: str, track_id: str, played_at: datetime) -> MagicMock:
    """Simulate a ListeningHistory document returned from DB."""
    doc = MagicMock(spec=ListeningHistory)
    doc.played_at = played_at
    doc.track = MagicMock(spec=HistoryTrackRef)
    doc.track.spotify_id = track_id
    return doc


@pytest.mark.asyncio
@patch("app.services.sync_service.ListeningHistory")
async def test_empty_response_returns_zero(mock_lh):
    """When Spotify returns no items, the function returns 0."""
    client = AsyncMock()
    client.get_recently_played = AsyncMock(return_value={"items": []})

    # latest-record query returns nothing
    chain = mock_lh.find.return_value.sort.return_value.limit.return_value
    chain.to_list = AsyncMock(return_value=[])

    result = await sync_recently_played(client, "user123")
    assert result == 0


@pytest.mark.asyncio
@patch("app.services.sync_service.ListeningHistory")
async def test_calls_spotify_with_after_cursor(mock_lh):
    """Spotify API is called with `after` set to the latest played_at timestamp."""
    played = datetime(2024, 6, 15, 12, 0, 0, tzinfo=UTC)
    latest_doc = _make_history_doc("user1", "t1", played)

    chain = mock_lh.find.return_value.sort.return_value.limit.return_value
    chain.to_list = AsyncMock(return_value=[latest_doc])

    client = AsyncMock()
    client.get_recently_played = AsyncMock(return_value={"items": []})

    await sync_recently_played(client, "user1")

    expected_after = int(played.timestamp() * 1000)
    client.get_recently_played.assert_awaited_once_with(limit=50, after=expected_after)


@pytest.mark.asyncio
@patch("app.services.sync_service._bulk_upsert_tracks", new_callable=AsyncMock)
@patch("app.services.sync_service.ListeningHistory")
async def test_dedup_skips_existing_records(mock_lh, mock_upsert):
    """Tracks already in the DB are not inserted again."""
    played_str = "2024-06-15T12:00:00Z"
    played_dt = datetime(2024, 6, 15, 12, 0, 0, tzinfo=UTC)

    # No latest record → after_ts is None
    chain = mock_lh.find.return_value.sort.return_value.limit.return_value
    chain.to_list = AsyncMock(return_value=[])

    # Spotify returns one item
    client = AsyncMock()
    client.get_recently_played = AsyncMock(
        return_value={"items": [_make_spotify_item("t1", played_str)]}
    )

    # The dedup query returns the same track+played_at → it already exists
    existing_doc = _make_history_doc("user1", "t1", played_dt)
    mock_lh.find.return_value.to_list = AsyncMock(return_value=[existing_doc])

    result = await sync_recently_played(client, "user1")
    assert result == 0
    mock_lh.insert_many.assert_not_called()


@pytest.mark.asyncio
@patch("app.services.sync_service._bulk_upsert_tracks", new_callable=AsyncMock)
@patch("app.services.sync_service.ListeningHistory")
async def test_new_tracks_are_inserted(mock_lh, mock_upsert):
    """New tracks are bulk-inserted into the database."""
    played_str = "2024-06-15T14:00:00Z"

    # No latest record
    chain = mock_lh.find.return_value.sort.return_value.limit.return_value
    chain.to_list = AsyncMock(return_value=[])

    client = AsyncMock()
    client.get_recently_played = AsyncMock(
        return_value={
            "items": [
                _make_spotify_item("t1", played_str, "Song A"),
                _make_spotify_item("t2", "2024-06-15T14:05:00Z", "Song B"),
            ]
        }
    )

    # No existing records in dedup query
    mock_lh.find.return_value.to_list = AsyncMock(return_value=[])

    # Make the ListeningHistory constructor return a MagicMock (so insert_many works)
    mock_lh.side_effect = MagicMock
    mock_lh.insert_many = AsyncMock()

    result = await sync_recently_played(client, "user1")
    assert result == 2
    mock_lh.insert_many.assert_awaited_once()
    inserted = mock_lh.insert_many.call_args[0][0]
    assert len(inserted) == 2
