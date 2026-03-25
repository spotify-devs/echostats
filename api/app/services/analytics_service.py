"""Analytics computation service."""

from collections import Counter, defaultdict
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
    elif period == "month":
        return now - timedelta(days=30), now
    elif period == "quarter":
        return now - timedelta(days=90), now
    elif period == "year":
        return now - timedelta(days=365), now
    elif period == "all_time":
        return None, now
    return None, now


async def compute_analytics_snapshot(user_id: str, period: str = "all_time") -> AnalyticsSnapshot:
    """Compute and store analytics for a user over a time period."""
    period_start, period_end = _get_period_range(period)

    # Build query filters
    query_filters: list[Any] = [ListeningHistory.user_id == user_id]
    if period_start:
        query_filters.append(ListeningHistory.played_at >= period_start)
    if period_end:
        query_filters.append(ListeningHistory.played_at <= period_end)

    # Fetch all listening history for the period
    history = await ListeningHistory.find(*query_filters).sort("-played_at").to_list()

    if not history:
        snapshot = AnalyticsSnapshot(
            user_id=user_id,
            period=period,
            period_start=period_start,
            period_end=period_end,
        )
        await _upsert_snapshot(snapshot)
        return snapshot

    # Count stats
    track_ids = set()
    artist_names: Counter[str] = Counter()
    album_names: Counter[str] = Counter()
    track_plays: Counter[str] = Counter()
    total_ms = 0
    hourly: defaultdict[int, dict[str, int]] = defaultdict(lambda: {"count": 0, "ms": 0})
    daily: defaultdict[int, dict[str, int]] = defaultdict(lambda: {"count": 0, "ms": 0})
    play_dates: set[str] = set()

    for entry in history:
        track_ids.add(entry.track.spotify_id)
        artist_names[entry.track.artist_name] += 1
        if entry.track.album_name:
            album_names[entry.track.album_name] += 1
        track_plays[f"{entry.track.spotify_id}|{entry.track.name}|{entry.track.artist_name}"] += 1
        duration = entry.ms_played or entry.track.duration_ms or 0
        total_ms += duration

        hour = entry.played_at.hour
        day = entry.played_at.weekday()
        hourly[hour]["count"] += 1
        hourly[hour]["ms"] += duration
        daily[day]["count"] += 1
        daily[day]["ms"] += duration
        play_dates.add(entry.played_at.strftime("%Y-%m-%d"))

    # Calculate listening streak
    streak = _calculate_streak(sorted(play_dates, reverse=True))

    # Top artists with images
    top_artist_items = []
    for rank, (name, count) in enumerate(artist_names.most_common(50), 1):
        artist = await Artist.find_one(Artist.name == name)
        image_url = ""
        spotify_id = ""
        if artist:
            image_url = artist.image_url
            spotify_id = artist.spotify_id
        top_artist_items.append(
            TopItem(
                spotify_id=spotify_id, name=name, play_count=count,
                rank=rank, image_url=image_url,
            )
        )

    # Top tracks
    top_track_items = []
    for rank, (key, count) in enumerate(track_plays.most_common(50), 1):
        parts = key.split("|", 2)
        sid = parts[0] if len(parts) > 0 else ""
        name = parts[1] if len(parts) > 1 else ""
        artist = parts[2] if len(parts) > 2 else ""
        track = await Track.find_one(Track.spotify_id == sid) if sid else None
        image_url = track.album.image_url if track and track.album else ""
        top_track_items.append(
            TopItem(
                spotify_id=sid, name=f"{name} — {artist}", play_count=count,
                rank=rank, image_url=image_url,
            )
        )

    # Genre analysis from artists
    genre_counts: Counter[str] = Counter()
    for name in artist_names:
        artist = await Artist.find_one(Artist.name == name)
        if artist and artist.genres:
            for genre in artist.genres:
                genre_counts[genre] += artist_names[name]

    top_genres = [
        TopItem(name=genre, play_count=count, rank=rank)
        for rank, (genre, count) in enumerate(genre_counts.most_common(30), 1)
    ]

    # Audio feature averages
    avg_features = await _compute_avg_audio_features(list(track_ids))

    # Unique counts
    unique_artists = len(artist_names)
    unique_albums = len(album_names)

    snapshot = AnalyticsSnapshot(
        user_id=user_id,
        period=period,
        period_start=period_start,
        period_end=period_end,
        total_tracks_played=len(history),
        total_ms_played=total_ms,
        unique_tracks=len(track_ids),
        unique_artists=unique_artists,
        unique_albums=unique_albums,
        unique_genres=len(genre_counts),
        listening_streak_days=streak,
        top_artists=top_artist_items[:20],
        top_tracks=top_track_items[:20],
        top_genres=top_genres[:20],
        hourly_distribution=[
            ListeningHour(hour=h, count=d["count"], total_ms=d["ms"])
            for h, d in sorted(hourly.items())
        ],
        daily_distribution=[
            ListeningDay(day=d, count=v["count"], total_ms=v["ms"])
            for d, v in sorted(daily.items())
        ],
        avg_audio_features=avg_features,
    )

    await _upsert_snapshot(snapshot)
    logger.info("Analytics snapshot computed", user_id=user_id, period=period, tracks=len(history))
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
        prev = datetime.strptime(dates_desc[i - 1], "%Y-%m-%d")  # noqa: DTZ007
        curr = datetime.strptime(dates_desc[i], "%Y-%m-%d")  # noqa: DTZ007
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
