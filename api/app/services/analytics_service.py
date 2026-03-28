"""Analytics computation service."""

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
from app.models.track import Track

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
    """Compute analytics using MongoDB aggregation pipelines (handles 100K+ records)."""
    period_start, period_end = _get_period_range(period)

    # Build match filter
    match_filter: dict[str, Any] = {"user_id": user_id}
    date_filter: dict[str, Any] = {}
    if period_start:
        date_filter["$gte"] = period_start
    if period_end:
        date_filter["$lte"] = period_end
    if date_filter:
        match_filter["played_at"] = date_filter

    match = {"$match": match_filter}
    dur = {"$ifNull": ["$ms_played", {"$ifNull": ["$track.duration_ms", 0]}]}

    try:
        # Run aggregation pipelines sequentially for reliability
        stats_res = await ListeningHistory.aggregate([
            match,
            {"$group": {
                "_id": None,
                "total": {"$sum": 1},
                "ms": {"$sum": dur},
                "tracks": {"$addToSet": "$track.spotify_id"},
                "artists": {"$addToSet": "$track.artist_name"},
                "albums": {"$addToSet": "$track.album_name"},
            }},
            {"$project": {
                "total": 1, "ms": 1,
                "n_tracks": {"$size": "$tracks"},
                "n_artists": {"$size": "$artists"},
                "n_albums": {"$size": "$albums"},
                "track_ids": "$tracks",
            }},
        ]).to_list()

        if not stats_res:
            snapshot = AnalyticsSnapshot(
                user_id=user_id, period=period,
                period_start=period_start, period_end=period_end,
            )
            await _upsert_snapshot(snapshot)
            return snapshot

        artist_res = await ListeningHistory.aggregate([
            match,
            {"$group": {"_id": "$track.artist_name", "c": {"$sum": 1}}},
            {"$sort": {"c": -1}},
        ]).to_list()

        track_res = await ListeningHistory.aggregate([
            match,
            {"$group": {
                "_id": {"s": "$track.spotify_id", "n": "$track.name", "a": "$track.artist_name"},
                "c": {"$sum": 1},
            }},
            {"$sort": {"c": -1}},
            {"$limit": 50},
        ]).to_list()

        hourly_res = await ListeningHistory.aggregate([
            match,
            {"$group": {"_id": {"$hour": "$played_at"}, "c": {"$sum": 1}, "ms": {"$sum": dur}}},
            {"$sort": {"_id": 1}},
        ]).to_list()

        daily_res = await ListeningHistory.aggregate([
            match,
            {"$group": {"_id": {"$dayOfWeek": "$played_at"}, "c": {"$sum": 1}, "ms": {"$sum": dur}}},
            {"$sort": {"_id": 1}},
        ]).to_list()

        dates_res = await ListeningHistory.aggregate([
            match,
            {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$played_at"}}}},
            {"$sort": {"_id": -1}},
        ]).to_list()

    except Exception as e:
        logger.error("Aggregation pipeline failed", user_id=user_id, period=period, error=str(e))
        raise

    s = stats_res[0]

    # Batch-load artist docs for images + genre analysis
    all_artist_names = [r["_id"] for r in artist_res]
    artist_docs = await Artist.find({"name": {"$in": all_artist_names}}).to_list()
    artist_by_name: dict[str, Artist] = {a.name: a for a in artist_docs}

    # Top artists
    top_artist_items = []
    for rank, r in enumerate(artist_res[:50], 1):
        name = r["_id"]
        a = artist_by_name.get(name)
        top_artist_items.append(TopItem(
            spotify_id=a.spotify_id if a else "", name=name,
            play_count=r["c"], rank=rank, image_url=a.image_url if a else "",
        ))

    # Top tracks — batch-load track docs
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
    play_dates = [d["_id"] for d in dates_res]
    streak = _calculate_streak(play_dates)

    # Audio features
    avg_features = await _compute_avg_audio_features(s.get("track_ids", []))

    # MongoDB $dayOfWeek: 1=Sun..7=Sat → Python weekday: 0=Mon..6=Sun
    mongo_to_py = {1: 6, 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5}

    snapshot = AnalyticsSnapshot(
        user_id=user_id,
        period=period,
        period_start=period_start,
        period_end=period_end,
        total_tracks_played=s["total"],
        total_ms_played=s["ms"],
        unique_tracks=s["n_tracks"],
        unique_artists=s["n_artists"],
        unique_albums=s["n_albums"],
        unique_genres=len(genre_counts),
        listening_streak_days=streak,
        top_artists=top_artist_items[:20],
        top_tracks=top_track_items[:20],
        top_genres=top_genres[:20],
        hourly_distribution=[
            ListeningHour(hour=r["_id"], count=r["c"], total_ms=r["ms"])
            for r in hourly_res
        ],
        daily_distribution=sorted(
            [ListeningDay(day=mongo_to_py.get(r["_id"], 0), count=r["c"], total_ms=r["ms"])
             for r in daily_res],
            key=lambda x: x.day,
        ),
        avg_audio_features=avg_features,
    )

    await _upsert_snapshot(snapshot)
    logger.info("Analytics snapshot computed", user_id=user_id, period=period, tracks=s["total"])
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
