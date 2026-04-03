"""Analytics service tests."""

import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.analytics_service import (
    _calculate_streak,
    _get_period_range,
    compute_analytics_snapshot,
    get_or_compute_snapshot,
)

# -- _get_period_range ---------------------------------------------------------


class TestGetPeriodRange:
    def test_week_returns_7_days(self):
        start, end = _get_period_range("week")
        assert start is not None
        assert end is not None
        diff = end - start
        assert diff.days == 7

    def test_month_returns_30_days(self):
        start, end = _get_period_range("month")
        assert start is not None
        assert end is not None
        assert (end - start).days == 30

    def test_quarter_returns_90_days(self):
        start, end = _get_period_range("quarter")
        assert start is not None
        assert end is not None
        assert (end - start).days == 90

    def test_year_returns_365_days(self):
        start, end = _get_period_range("year")
        assert start is not None
        assert end is not None
        assert (end - start).days == 365

    def test_all_time_start_is_none(self):
        start, end = _get_period_range("all_time")
        assert start is None
        assert end is not None

    def test_unknown_period_returns_none_start(self):
        start, end = _get_period_range("unknown")
        assert start is None
        assert end is not None


# -- _calculate_streak ---------------------------------------------------------


class TestCalculateStreak:
    def test_empty_dates(self):
        assert _calculate_streak([]) == 0

    def test_single_day_today(self):
        today = datetime.utcnow().strftime("%Y-%m-%d")
        assert _calculate_streak([today]) == 1

    def test_single_day_yesterday(self):
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        assert _calculate_streak([yesterday]) == 1

    def test_old_date_returns_zero(self):
        old = (datetime.utcnow() - timedelta(days=5)).strftime("%Y-%m-%d")
        assert _calculate_streak([old]) == 0

    def test_consecutive_days(self):
        today = datetime.utcnow()
        dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(5)]
        assert _calculate_streak(dates) == 5

    def test_gap_breaks_streak(self):
        today = datetime.utcnow()
        dates = [
            today.strftime("%Y-%m-%d"),
            (today - timedelta(days=1)).strftime("%Y-%m-%d"),
            (today - timedelta(days=3)).strftime("%Y-%m-%d"),
        ]
        assert _calculate_streak(dates) == 2


# -- compute_analytics_snapshot ------------------------------------------------


@pytest.mark.asyncio
@patch("app.services.analytics_service._upsert_snapshot", new_callable=AsyncMock)
@patch("app.services.analytics_service.AnalyticsSnapshot")
@patch("app.services.analytics_service.Track")
@patch("app.services.analytics_service.Artist")
@patch("app.services.analytics_service.ListeningHistory")
@patch("app.services.analytics_service.DailyRollup")
@patch("app.services.analytics_service.ensure_rollups_exist", new_callable=AsyncMock)
async def test_compute_snapshot_empty_data(
    mock_ensure, mock_rollup, mock_lh, mock_artist, mock_track,
    mock_snap_cls, mock_upsert,
):
    """When rollup aggregation returns empty results, snapshot has zero totals."""
    empty_agg = MagicMock()
    empty_agg.to_list = AsyncMock(return_value=[])
    mock_rollup.aggregate.return_value = empty_agg

    snap_instance = MagicMock()
    snap_instance.total_tracks_played = 0
    snap_instance.user_id = "user1"
    snap_instance.period = "week"
    mock_snap_cls.return_value = snap_instance

    result = await compute_analytics_snapshot("user1", "week")
    assert result.total_tracks_played == 0
    assert result.user_id == "user1"
    assert result.period == "week"
    mock_upsert.assert_awaited_once()


@pytest.mark.asyncio
@patch("app.services.analytics_service._upsert_snapshot", new_callable=AsyncMock)
@patch("app.services.analytics_service._compute_avg_audio_features", new_callable=AsyncMock, return_value=None)
@patch("app.services.analytics_service.AnalyticsSnapshot")
@patch("app.services.analytics_service.Track")
@patch("app.services.analytics_service.Artist")
@patch("app.services.analytics_service.DailyRollup")
@patch("app.services.analytics_service.ensure_rollups_exist", new_callable=AsyncMock)
async def test_compute_snapshot_with_data(
    mock_ensure, mock_rollup, mock_artist, mock_track,
    mock_snap_cls, mock_avg, mock_upsert,
):
    """When rollup returns data, snapshot reflects totals correctly."""
    call_count = 0

    def make_agg(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        m = MagicMock()
        if call_count == 1:
            m.to_list = AsyncMock(return_value=[{"_id": None, "plays": 100, "ms": 5_000_000}])
        elif call_count == 2:
            m.to_list = AsyncMock(return_value=[{"_id": 14, "c": 20, "ms": 1_000_000}])
        elif call_count == 3:
            m.to_list = AsyncMock(return_value=[{"_id": 1, "c": 30, "ms": 2_000_000}])
        elif call_count == 4:
            m.to_list = AsyncMock(return_value=[{"date": "2024-06-15"}])
        elif call_count == 5:
            m.to_list = AsyncMock(return_value=[{"_id": "Artist1", "c": 50}])
        elif call_count == 6:
            m.to_list = AsyncMock(return_value=[{"_id": "Album1", "c": 40}])
        elif call_count == 7:
            m.to_list = AsyncMock(return_value=[{"n": 5}])
        elif call_count == 8:
            m.to_list = AsyncMock(return_value=[{"n": 3}])
        elif call_count == 9:
            m.to_list = AsyncMock(return_value=[
                {"_id": {"s": "t1", "n": "Song", "a": "Artist1"}, "c": 25},
            ])
        elif call_count == 10:
            m.to_list = AsyncMock(return_value=[{"n": 10}])
        elif call_count == 11:
            m.to_list = AsyncMock(return_value=[{"_id": "t1"}])
        else:
            m.to_list = AsyncMock(return_value=[])
        return m

    mock_rollup.aggregate.side_effect = make_agg

    artist_find = MagicMock()
    artist_find.to_list = AsyncMock(return_value=[])
    mock_artist.find.return_value = artist_find

    track_find = MagicMock()
    track_find.to_list = AsyncMock(return_value=[])
    mock_track.find.return_value = track_find
    mock_track.find.return_value.limit.return_value = track_find

    snap_instance = MagicMock()
    mock_snap_cls.return_value = snap_instance

    result = await compute_analytics_snapshot("user1", "all_time")
    mock_snap_cls.assert_called_once()
    call_kwargs = mock_snap_cls.call_args[1]
    assert call_kwargs["total_tracks_played"] == 100
    assert call_kwargs["total_ms_played"] == 5_000_000
    assert call_kwargs["unique_artists"] == 5
    assert call_kwargs["unique_albums"] == 3
    assert call_kwargs["unique_tracks"] == 10
    mock_upsert.assert_awaited_once()


# -- get_or_compute_snapshot ---------------------------------------------------


@pytest.mark.asyncio
@patch("app.services.analytics_service.compute_analytics_snapshot", new_callable=AsyncMock)
@patch("app.services.analytics_service.ListeningHistory")
@patch("app.services.analytics_service.AnalyticsSnapshot")
@patch("app.services.analytics_service._get_redis", new_callable=AsyncMock, return_value=None)
async def test_get_or_compute_cache_miss_no_db(mock_redis, mock_snap_cls, mock_lh, mock_compute):
    """When nothing in Redis or DB, compute_analytics_snapshot is called."""
    mock_snap_cls.find_one = AsyncMock(return_value=None)
    expected = MagicMock()
    mock_compute.return_value = expected

    result = await get_or_compute_snapshot("user1", "week")
    assert result is expected
    mock_compute.assert_awaited_once_with("user1", "week")


@pytest.mark.asyncio
@patch("app.services.analytics_service.compute_analytics_snapshot", new_callable=AsyncMock)
@patch("app.services.analytics_service.ListeningHistory")
@patch("app.services.analytics_service.AnalyticsSnapshot")
@patch("app.services.analytics_service._get_redis", new_callable=AsyncMock, return_value=None)
async def test_get_or_compute_db_hit_fresh(mock_redis, mock_snap_cls, mock_lh, mock_compute):
    """When DB snapshot exists and is fresh, return it without recomputing."""
    snap = MagicMock()
    snap.total_tracks_played = 42
    snap.model_dump_json.return_value = "{}"

    mock_snap_cls.find_one = AsyncMock(return_value=snap)

    count_chain = MagicMock()
    count_chain.count = AsyncMock(return_value=42)
    mock_lh.find.return_value = count_chain

    result = await get_or_compute_snapshot("user1", "all_time")
    assert result is snap
    mock_compute.assert_not_awaited()


@pytest.mark.asyncio
@patch("app.services.analytics_service.compute_analytics_snapshot", new_callable=AsyncMock)
@patch("app.services.analytics_service.ListeningHistory")
@patch("app.services.analytics_service.AnalyticsSnapshot")
@patch("app.services.analytics_service._get_redis")
async def test_get_or_compute_redis_cache_hit(mock_get_redis, mock_snap_cls, mock_lh, mock_compute):
    """When Redis has a cached snapshot, return it without hitting DB."""
    cached_data = json.dumps({"user_id": "user1", "period": "week"})

    redis_mock = AsyncMock()
    redis_mock.get = AsyncMock(return_value=cached_data)
    redis_mock.aclose = AsyncMock()
    mock_get_redis.return_value = redis_mock

    snap_from_cache = MagicMock()
    snap_from_cache.user_id = "user1"
    snap_from_cache.period = "week"
    mock_snap_cls.side_effect = lambda **_kw: snap_from_cache

    result = await get_or_compute_snapshot("user1", "week")
    assert result.user_id == "user1"
    assert result.period == "week"
    mock_snap_cls.find_one.assert_not_awaited()
    mock_compute.assert_not_awaited()


@pytest.mark.asyncio
@patch("app.services.analytics_service.compute_analytics_snapshot", new_callable=AsyncMock)
@patch("app.services.analytics_service.ListeningHistory")
@patch("app.services.analytics_service.AnalyticsSnapshot")
@patch("app.services.analytics_service._get_redis")
async def test_get_or_compute_redis_miss_falls_through(
    mock_get_redis, mock_snap_cls, mock_lh, mock_compute,
):
    """When Redis returns None, fall through to DB/compute path."""
    redis_mock = AsyncMock()
    redis_mock.get = AsyncMock(return_value=None)
    redis_mock.set = AsyncMock()
    redis_mock.aclose = AsyncMock()
    mock_get_redis.return_value = redis_mock

    mock_snap_cls.find_one = AsyncMock(return_value=None)
    expected = MagicMock()
    expected.model_dump_json.return_value = "{}"
    mock_compute.return_value = expected

    result = await get_or_compute_snapshot("user1", "month")
    assert result is expected
    mock_compute.assert_awaited_once()
