"""Analytics computation service."""

import asyncio
import copy
from collections import Counter
from datetime import datetime, timedelta
from typing import Any

import structlog

from app.models.analytics import (
    AnalyticsSnapshot,
    AudioFeatureAvg,
    ListeningDay,
    ListeningHour,
    TopItem,
)
from app.models.artist import Artist
from app.models.listening_history import ListeningHistory
from app.models.rollup import DailyRollup
from app.models.track import Track
from app.services.rollup_service import ensure_rollups_exist

logger = structlog.get_logger()


def _get_period_range(period: str) -> tuple[datetime | None, datetime | None]:
    """Get start/end datetimes for a period."""
    now = datetime.utcnow()
    if period == "week":
        return now - timedelta(days=7), now
    if period == "month":
        return now - timedelta(days=30), now
    if period == "quarter":
        return now - timedelta(days=90), now
    if period == "year":
        return now - timedelta(days=365), now
    if period == "all_time":
        return None, now
    return None, now


async def get_or_compute_snapshot(user_id: str, period: str = "all_time") -> AnalyticsSnapshot:
    """Return cached snapshot if data hasn't changed, otherwise recompute."""
    snapshot = await AnalyticsSnapshot.find_one(
        AnalyticsSnapshot.user_id == user_id,
        AnalyticsSnapshot.period == period,
    )

    if snapshot:
        # Lightweight staleness check: compare total record count
        total = await ListeningHistory.find(
            ListeningHistory.user_id == user_id
        ).count()
        all_time_snap = (
            snapshot
            if period == "all_time"
            else await AnalyticsSnapshot.find_one(
                AnalyticsSnapshot.user_id == user_id,
                AnalyticsSnapshot.period == "all_time",
            )
        )
        if all_time_snap and all_time_snap.total_tracks_played == total:
            return snapshot

    return await compute_analytics_snapshot(user_id, period)


async def compute_analytics_snapshot(user_id: str, period: str = "all_time") -> AnalyticsSnapshot:
    """Compute analytics from pre-aggregated DailyRollup documents.

    Rollups reduce the query surface from millions of raw records to
    ~18K small documents (one per day over 50 years).
    """
    # Ensure rollups have been built for this user
    await ensure_rollups_exist(user_id)

    period_start, period_end = _get_period_range(period)

    # Build match filter for rollups (date strings, not datetimes)
    match_filter: dict[str, Any] = {"user_id": user_id}
    date_filter: dict[str, Any] = {}
    if period_start:
        date_filter["$gte"] = period_start.strftime("%Y-%m-%d")
    if period_end:
        date_filter["$lte"] = period_end.strftime("%Y-%m-%d")
    if date_filter:
        match_filter["date"] = date_filter

    def _match() -> dict:
        return {"$match": copy.deepcopy(match_filter)}

    agg_opts: dict[str, Any] = {"allowDiskUse": True}

    try:
        # Batch 1: lightweight aggregations (simple $group, no $unwind)
        stats_res, hourly_res, daily_res, dates_res = await asyncio.gather(
            DailyRollup.aggregate([
                _match(),
                {"$group": {"_id": None, "plays": {"$sum": "$total_plays"}, "ms": {"$sum": "$total_ms"}}},
            ], **agg_opts).to_list(),
            DailyRollup.aggregate([
                _match(),
                {"$unwind": "$hourly"},
                {"$group": {
                    "_id": "$hourly.hour",
                    "c": {"$sum": "$hourly.count"},
                    "ms": {"$sum": "$hourly.ms"},
                }},
                {"$sort": {"_id": 1}},
            ], **agg_opts).to_list(),
            DailyRollup.aggregate([
                _match(),
                {"$group": {
                    "_id": "$day_of_week",
                    "c": {"$sum": "$total_plays"},
                    "ms": {"$sum": "$total_ms"},
                }},
                {"$sort": {"_id": 1}},
            ], **agg_opts).to_list(),
            DailyRollup.aggregate([
                _match(),
                {"$match": {"total_plays": {"$gt": 0}}},
                {"$sort": {"date": -1}},
                {"$limit": 1000},
                {"$project": {"_id": 0, "date": 1}},
            ], **agg_opts).to_list(),
        )

        # Batch 2: heavier $objectToArray + $unwind pipelines (top items + counts)
        artist_res, album_res, n_artists_res, n_albums_res = await asyncio.gather(
            DailyRollup.aggregate([
                _match(),
                {"$project": {"a": {"$objectToArray": "$artist_plays"}}},
                {"$unwind": "$a"},
                {"$group": {"_id": "$a.k", "c": {"$sum": "$a.v"}}},
                {"$sort": {"c": -1}},
                {"$limit": 50},
            ], **agg_opts).to_list(),
            DailyRollup.aggregate([
                _match(),
                {"$project": {"a": {"$objectToArray": "$album_plays"}}},
                {"$unwind": "$a"},
                {"$group": {"_id": "$a.k", "c": {"$sum": "$a.v"}}},
                {"$sort": {"c": -1}},
                {"$limit": 50},
            ], **agg_opts).to_list(),
            DailyRollup.aggregate([
                _match(),
                {"$project": {"a": {"$objectToArray": "$artist_plays"}}},
                {"$unwind": "$a"},
                {"$group": {"_id": "$a.k"}},
                {"$count": "n"},
            ], **agg_opts).to_list(),
            DailyRollup.aggregate([
                _match(),
                {"$project": {"a": {"$objectToArray": "$album_plays"}}},
                {"$unwind": "$a"},
                {"$group": {"_id": "$a.k"}},
                {"$count": "n"},
            ], **agg_opts).to_list(),
        )

        # Batch 3: track_plays $unwind pipelines (heaviest — large embedded arrays)
        track_res, n_tracks_res, sample_tracks_res = await asyncio.gather(
            DailyRollup.aggregate([
                _match(),
                {"$unwind": "$track_plays"},
                {"$group": {
                    "_id": {
                        "s": "$track_plays.spotify_id",
                        "n": "$track_plays.name",
                        "a": "$track_plays.artist_name",
                    },
                    "c": {"$sum": "$track_plays.count"},
                }},
                {"$sort": {"c": -1}},
                {"$limit": 50},
            ], **agg_opts).to_list(),
            DailyRollup.aggregate([
                _match(),
                {"$unwind": "$track_plays"},
                {"$group": {"_id": "$track_plays.spotify_id"}},
                {"$count": "n"},
            ], **agg_opts).to_list(),
            DailyRollup.aggregate([
                _match(),
                {"$unwind": "$track_plays"},
                {"$group": {"_id": "$track_plays.spotify_id"}},
                {"$limit": 500},
            ], **agg_opts).to_list(),
        )

    except Exception as e:
        logger.error("Rollup aggregation failed", user_id=user_id, period=period, error=str(e))
        raise

    if not stats_res:
        snapshot = AnalyticsSnapshot(
            user_id=user_id, period=period,
            period_start=period_start, period_end=period_end,
        )
        await _upsert_snapshot(snapshot)
        return snapshot

    s = stats_res[0]
    n_artists = n_artists_res[0]["n"] if n_artists_res else 0
    n_albums = n_albums_res[0]["n"] if n_albums_res else 0
    n_tracks = n_tracks_res[0]["n"] if n_tracks_res else 0

    # Batch-load artist docs for images + genre analysis
    all_artist_names = [r["_id"] for r in artist_res if r["_id"]]
    artist_docs = await Artist.find({"name": {"$in": all_artist_names}}).to_list()
    artist_by_name: dict[str, Artist] = {a.name: a for a in artist_docs}

    top_artist_items = []
    for rank, r in enumerate(artist_res[:50], 1):
        name = r["_id"]
        a = artist_by_name.get(name)
        top_artist_items.append(TopItem(
            spotify_id=a.spotify_id if a else "", name=name or "",
            play_count=r["c"], rank=rank, image_url=a.image_url if a else "",
        ))

    # Batch-load track docs for images
    top_sids = [r["_id"]["s"] for r in track_res if r["_id"].get("s")]
    track_docs = await Track.find({"spotify_id": {"$in": top_sids}}).to_list() if top_sids else []
    track_by_sid: dict[str, Track] = {t.spotify_id: t for t in track_docs}

    top_track_items = []
    for rank, r in enumerate(track_res, 1):
        sid = r["_id"].get("s", "")
        name = r["_id"].get("n", "")
        artist = r["_id"].get("a", "")
        t = track_by_sid.get(sid)
        top_track_items.append(TopItem(
            spotify_id=sid, name=f"{name} — {artist}", play_count=r["c"],
            rank=rank, image_url=t.album.image_url if t and t.album else "",
        ))

    # Build top album items with images from loaded track docs
    album_meta: dict[str, tuple[str, str]] = {}  # album_name -> (image_url, artist_name)
    for t in track_docs:
        if t.album and t.album.name:
            album_meta.setdefault(t.album.name, (
                t.album.image_url or "",
                t.artists[0].name if t.artists else "",
            ))

    # Fetch images for top albums not covered by already-loaded tracks
    missing_names = [r["_id"] for r in album_res[:30] if r["_id"] and r["_id"] not in album_meta]
    if missing_names:
        extra_tracks = await Track.find({"album.name": {"$in": missing_names}}).limit(100).to_list()
        for t in extra_tracks:
            if t.album and t.album.name:
                album_meta.setdefault(t.album.name, (
                    t.album.image_url or "",
                    t.artists[0].name if t.artists else "",
                ))

    top_album_items = []
    for rank, r in enumerate(album_res[:50], 1):
        name = r["_id"] or ""
        img, artist = album_meta.get(name, ("", ""))
        display = f"{name} — {artist}" if artist else name
        top_album_items.append(TopItem(
            name=display, play_count=r["c"], rank=rank, image_url=img,
        ))

    # Genre analysis from batch-loaded artists
    genre_counts: Counter[str] = Counter()
    for r in artist_res:
        a = artist_by_name.get(r["_id"])
        if a and a.genres:
            for g in a.genres:
                genre_counts[g] += r["c"]

    top_genres = [
        TopItem(name=g, play_count=c, rank=i)
        for i, (g, c) in enumerate(genre_counts.most_common(30), 1)
    ]

    # Listening streak
    play_dates = [d["date"] for d in dates_res]
    streak = _calculate_streak(play_dates)

    # Audio features from sampled track IDs
    sample_ids = [r["_id"] for r in sample_tracks_res if r["_id"]]
    avg_features = await _compute_avg_audio_features(sample_ids)

    snapshot = AnalyticsSnapshot(
        user_id=user_id,
        period=period,
        period_start=period_start,
        period_end=period_end,
        total_tracks_played=s["plays"],
        total_ms_played=s["ms"],
        unique_tracks=n_tracks,
        unique_artists=n_artists,
        unique_albums=n_albums,
        unique_genres=len(genre_counts),
        listening_streak_days=streak,
        top_artists=top_artist_items[:20],
        top_tracks=top_track_items[:20],
        top_albums=top_album_items[:20],
        top_genres=top_genres[:20],
        hourly_distribution=[
            ListeningHour(hour=r["_id"], count=r["c"], total_ms=r["ms"])
            for r in hourly_res
        ],
        daily_distribution=sorted(
            [ListeningDay(day=r["_id"], count=r["c"], total_ms=r["ms"])
             for r in daily_res],
            key=lambda x: x.day,
        ),
        avg_audio_features=avg_features,
    )

    await _upsert_snapshot(snapshot)
    logger.info("Analytics snapshot computed from rollups", user_id=user_id, period=period, tracks=s["plays"])
    return snapshot


def _calculate_streak(dates_desc: list[str]) -> int:
    """Calculate consecutive listening day streak from sorted dates."""
    if not dates_desc:
        return 0

    streak = 1
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Check if the most recent date is today or yesterday
    if dates_desc[0] != today:
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        if dates_desc[0] != yesterday:
            return 0

    for i in range(1, len(dates_desc)):
        prev = datetime.strptime(dates_desc[i - 1], "%Y-%m-%d")
        curr = datetime.strptime(dates_desc[i], "%Y-%m-%d")
        if (prev - curr).days == 1:
            streak += 1
        else:
            break

    return streak


async def _compute_avg_audio_features(track_ids: list[str]) -> AudioFeatureAvg | None:
    """Compute average audio features for a set of tracks."""
    if not track_ids:
        return None

    tracks = await Track.find(
        {"spotify_id": {"$in": list(track_ids)}, "audio_features": {"$ne": None}}
    ).to_list()

    if not tracks:
        return None

    totals = {
        "danceability": 0.0,
        "energy": 0.0,
        "valence": 0.0,
        "acousticness": 0.0,
        "instrumentalness": 0.0,
        "liveness": 0.0,
        "speechiness": 0.0,
        "tempo": 0.0,
    }
    count = 0
    for track in tracks:
        if track.audio_features:
            af = track.audio_features
            totals["danceability"] += af.danceability
            totals["energy"] += af.energy
            totals["valence"] += af.valence
            totals["acousticness"] += af.acousticness
            totals["instrumentalness"] += af.instrumentalness
            totals["liveness"] += af.liveness
            totals["speechiness"] += af.speechiness
            totals["tempo"] += af.tempo
            count += 1

    if count == 0:
        return None

    return AudioFeatureAvg(**{k: v / count for k, v in totals.items()})


async def _upsert_snapshot(snapshot: AnalyticsSnapshot) -> None:
    """Create or update an analytics snapshot."""
    existing = await AnalyticsSnapshot.find_one(
        AnalyticsSnapshot.user_id == snapshot.user_id,
        AnalyticsSnapshot.period == snapshot.period,
    )
    if existing:
        # Update all fields
        for field in snapshot.model_fields:
            if field != "id":
                setattr(existing, field, getattr(snapshot, field))
        existing.computed_at = datetime.utcnow()
        await existing.save()
    else:
        await snapshot.insert()
