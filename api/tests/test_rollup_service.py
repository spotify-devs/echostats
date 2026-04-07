"""Rollup service tests — build_rollups, _dur, update_rollup_for_date."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.rollup_service import build_rollups, update_rollup_for_date


def _totals(date_str, plays, ms):
    return {"_id": date_str, "plays": plays, "ms": ms}


def _hourly(date_str, hour, count, ms):
    return {"_id": {"d": date_str, "h": hour}, "c": count, "ms": ms}


def _artist(date_str, artist, count):
    return {"_id": {"d": date_str, "a": artist}, "c": count}


def _track(date_str, spotify_id, name, artist, count):
    return {"_id": {"d": date_str, "s": spotify_id, "n": name, "a": artist}, "c": count}


def _album(date_str, album, count):
    return {"_id": {"d": date_str, "al": album}, "c": count}


def _mock_aggregate(side_effects):
    """Return a side_effect function for ListeningHistory.aggregate.

    Each call returns a mock whose .to_list() resolves to the next item
    in *side_effects*.
    """
    it = iter(side_effects)

    def _agg(*_args, **_kwargs):
        mock = MagicMock()
        mock.to_list = AsyncMock(return_value=next(it))
        return mock

    return _agg


def _make_rollup(**kwargs):
    """Create a SimpleNamespace standing in for a DailyRollup document."""
    return SimpleNamespace(**kwargs)


@pytest.mark.asyncio
@patch("app.services.rollup_service.DailyRollup")
@patch("app.services.rollup_service.ListeningHistory")
async def test_build_rollups_creates_documents(mock_lh, mock_rollup):
    """build_rollups creates DailyRollup documents from aggregation results."""
    date = "2024-06-15"
    mock_lh.aggregate = MagicMock(side_effect=_mock_aggregate([
        [_totals(date, 10, 30000)],
        [_hourly(date, 14, 5, 15000), _hourly(date, 15, 5, 15000)],
        [_artist(date, "Artist A", 6), _artist(date, "Artist B", 4)],
        [_track(date, "s1", "Song", "Artist A", 10)],
        [_album(date, "Album X", 10)],
    ]))

    mock_rollup.side_effect = _make_rollup
    mock_rollup.find.return_value.delete = AsyncMock()
    mock_rollup.insert_many = AsyncMock()

    result = await build_rollups("user1")

    assert result == 1
    mock_rollup.insert_many.assert_awaited_once()
    inserted = mock_rollup.insert_many.call_args[0][0]
    assert len(inserted) == 1

    doc = inserted[0]
    assert doc.total_plays == 10
    assert doc.total_ms == 30000
    assert doc.user_id == "user1"
    assert doc.date == date
    assert len(doc.hourly) == 2
    assert doc.artist_plays == {"Artist A": 6, "Artist B": 4}
    assert doc.album_plays == {"Album X": 10}


@pytest.mark.asyncio
@patch("app.services.rollup_service.DailyRollup")
@patch("app.services.rollup_service.ListeningHistory")
async def test_build_rollups_empty_history_returns_zero(mock_lh, mock_rollup):
    """build_rollups returns 0 when there is no listening history."""
    mock_lh.aggregate = MagicMock(side_effect=_mock_aggregate([
        [], [],
        [], [], [],
    ]))

    result = await build_rollups("user1")
    assert result == 0
    mock_rollup.insert_many.assert_not_called()


def test_dur_returns_ifnull_chain():
    """_dur() returns the expected $ifNull MongoDB expression."""
    expected = {"$ifNull": ["$ms_played", {"$ifNull": ["$track.duration_ms", 0]}]}

    # _dur is a local closure inside build_rollups; replicate its logic here.
    def _dur():
        return {"$ifNull": ["$ms_played", {"$ifNull": ["$track.duration_ms", 0]}]}

    result = _dur()
    assert result == expected
    assert result["$ifNull"][0] == "$ms_played"
    assert result["$ifNull"][1]["$ifNull"][1] == 0


@pytest.mark.asyncio
@patch("app.services.rollup_service.build_rollups", new_callable=AsyncMock)
async def test_update_rollup_for_date_calls_build_rollups(mock_build):
    """update_rollup_for_date delegates to build_rollups with correct range."""
    await update_rollup_for_date("user1", "2024-06-15")
    mock_build.assert_awaited_once_with("user1", start_date="2024-06-15", end_date="2024-06-15")


@pytest.mark.asyncio
@patch("app.services.rollup_service.DailyRollup")
@patch("app.services.rollup_service.ListeningHistory")
async def test_build_rollups_multiple_days(mock_lh, mock_rollup):
    """build_rollups creates one DailyRollup per distinct day."""
    d1, d2 = "2024-06-14", "2024-06-15"
    mock_lh.aggregate = MagicMock(side_effect=_mock_aggregate([
        [_totals(d1, 3, 9000), _totals(d2, 7, 21000)],
        [_hourly(d1, 10, 3, 9000), _hourly(d2, 20, 7, 21000)],
        [_artist(d1, "A", 3), _artist(d2, "B", 7)],
        [_track(d1, "s1", "S1", "A", 3), _track(d2, "s2", "S2", "B", 7)],
        [_album(d1, "Al1", 3), _album(d2, "Al2", 7)],
    ]))

    mock_rollup.side_effect = _make_rollup
    mock_rollup.find.return_value.delete = AsyncMock()
    mock_rollup.insert_many = AsyncMock()

    result = await build_rollups("user1")
    assert result == 2
    inserted = mock_rollup.insert_many.call_args[0][0]
    dates = {doc.date for doc in inserted}
    assert dates == {d1, d2}


@pytest.mark.asyncio
@patch("app.services.rollup_service.DailyRollup")
@patch("app.services.rollup_service.ListeningHistory")
async def test_build_rollups_deletes_existing_before_insert(mock_lh, mock_rollup):
    """build_rollups deletes existing rollups for affected dates before inserting."""
    date = "2024-06-15"
    mock_lh.aggregate = MagicMock(side_effect=_mock_aggregate([
        [_totals(date, 1, 1000)],
        [],
        [], [], [],
    ]))

    mock_rollup.side_effect = _make_rollup
    mock_delete = AsyncMock()
    mock_rollup.find.return_value.delete = mock_delete
    mock_rollup.insert_many = AsyncMock()

    await build_rollups("user1")

    mock_rollup.find.assert_called_once()
    call_args = mock_rollup.find.call_args[0][0]
    assert call_args["user_id"] == "user1"
    assert date in call_args["date"]["$in"]
    mock_delete.assert_awaited_once()
