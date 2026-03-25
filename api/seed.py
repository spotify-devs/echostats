"""Seed script — populate MongoDB with realistic test data for local development."""

import asyncio
import random
from datetime import datetime, timedelta

from motor.motor_asyncio import AsyncIOMotorClient

# ── Sample Data ──────────────────────────────────────────────────────────────

ARTISTS = [
    {"id": "06HL4z0CvFAxyc27GXpf02", "name": "Taylor Swift", "genres": ["pop", "country pop"], "popularity": 100, "followers": 115000000, "image": "https://i.scdn.co/image/ab6761610000e5eb859e4c14fa59296c8649e0e4"},
    {"id": "3TVXtAsR1Inumwj472S9r4", "name": "Drake", "genres": ["canadian hip hop", "rap", "hip hop"], "popularity": 96, "followers": 78000000, "image": "https://i.scdn.co/image/ab6761610000e5eb4293385d429c35823ae0da1c"},
    {"id": "1Xyo4u8uXC1ZmMpatF05PJ", "name": "The Weeknd", "genres": ["canadian pop", "pop", "r&b"], "popularity": 95, "followers": 55000000, "image": "https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26f5e0"},
    {"id": "66CXWjxzNUsdJxJ2JdwvnR", "name": "Ariana Grande", "genres": ["pop", "dance pop"], "popularity": 93, "followers": 90000000, "image": "https://i.scdn.co/image/ab6761610000e5ebcdce7620dc940db079bf4952"},
    {"id": "6eUKZXaKkcviH0Ku9w2n3V", "name": "Ed Sheeran", "genres": ["pop", "singer-songwriter", "uk pop"], "popularity": 92, "followers": 120000000, "image": "https://i.scdn.co/image/ab6761610000e5eb3bcef85e105dfc42399ef0ba"},
    {"id": "4q3ewBCX7sLwd24euuV69X", "name": "Bad Bunny", "genres": ["reggaeton", "latin trap", "urbano latino"], "popularity": 95, "followers": 68000000, "image": "https://i.scdn.co/image/ab6761610000e5eb9ad50e478a469e81e7bfdac1"},
    {"id": "1uNFoZAHBGtllmzznpCI3s", "name": "Justin Bieber", "genres": ["canadian pop", "pop", "dance pop"], "popularity": 91, "followers": 72000000, "image": "https://i.scdn.co/image/ab6761610000e5eb8ae7f2aaa9817a704a87ea36"},
    {"id": "5K4W6rqBFWDnAN6FQUkS6x", "name": "Kanye West", "genres": ["hip hop", "rap", "chicago rap"], "popularity": 94, "followers": 52000000, "image": "https://i.scdn.co/image/ab6761610000e5eb6e835a500e791bf9c5f8b2e0"},
    {"id": "0du5cEVh5yTK9QJze8zA0C", "name": "Bruno Mars", "genres": ["pop", "r&b", "funk"], "popularity": 90, "followers": 45000000, "image": "https://i.scdn.co/image/ab6761610000e5ebc36dd9eb55fb0db4911f25dd"},
    {"id": "4dpARuHxo51G3z768sgnrY", "name": "Adele", "genres": ["pop", "british soul", "uk pop"], "popularity": 88, "followers": 55000000, "image": "https://i.scdn.co/image/ab6761610000e5eb68f6e5892075d7f22615bd17"},
    {"id": "7dGJo4pcD2V6oG08qCgod6", "name": "Eminem", "genres": ["detroit hip hop", "hip hop", "rap"], "popularity": 92, "followers": 68000000, "image": "https://i.scdn.co/image/ab6761610000e5eba00b11c129f27a75e0000c36"},
    {"id": "6M2wZ9GZgrQXHCFfjv46we", "name": "Dua Lipa", "genres": ["dance pop", "pop", "uk pop"], "popularity": 89, "followers": 42000000, "image": "https://i.scdn.co/image/ab6761610000e5eb1bbee4a02f85ecc58d385c30"},
    {"id": "3Nrfpe0tUJi4K4DXYWgMUX", "name": "BTS", "genres": ["k-pop", "k-pop boy group", "pop"], "popularity": 90, "followers": 74000000, "image": "https://i.scdn.co/image/ab6761610000e5ebd642648235ebf3460d2d1f34"},
    {"id": "0EmeFodog0BfCgMzAIvKQp", "name": "Shakira", "genres": ["colombian pop", "latin pop", "dance pop"], "popularity": 87, "followers": 35000000, "image": "https://i.scdn.co/image/ab6761610000e5eb7daf4abf8c6c1bc2e2ab5112"},
    {"id": "1McMsnEElThX1knmY4oliG", "name": "Olivia Rodrigo", "genres": ["pop", "alt pop"], "popularity": 88, "followers": 38000000, "image": "https://i.scdn.co/image/ab6761610000e5ebe03a98785f3658f0b6461ec4"},
]

TRACKS = [
    {"id": "3n3Ppam7vgaVa1iaRUc9Lp", "name": "Mr. Brightside", "artist_idx": 0, "album": "Hot Fuss", "duration_ms": 222000, "popularity": 85},
    {"id": "7qiZfU4dY1lWllzX7mPBI3", "name": "Shape of You", "artist_idx": 4, "album": "÷ (Divide)", "duration_ms": 233000, "popularity": 92},
    {"id": "0VjIjW4GlUZAMYd2vXMi3b", "name": "Blinding Lights", "artist_idx": 2, "album": "After Hours", "duration_ms": 200000, "popularity": 95},
    {"id": "2LBqCSwhJGcFQeTHnSfJrE", "name": "Anti-Hero", "artist_idx": 0, "album": "Midnights", "duration_ms": 200000, "popularity": 90},
    {"id": "3KkXRkHbMCARz0aVfEt68P", "name": "Sunflower", "artist_idx": 8, "album": "Spider-Man Soundtrack", "duration_ms": 158000, "popularity": 88},
    {"id": "6DCZcSspjsKoFjzjrWoCdn", "name": "God's Plan", "artist_idx": 1, "album": "Scorpion", "duration_ms": 198000, "popularity": 91},
    {"id": "5XeFesFbtLpXzIVDNQP22n", "name": "Levitating", "artist_idx": 11, "album": "Future Nostalgia", "duration_ms": 203000, "popularity": 89},
    {"id": "4Dvkj6JhhA12EX05fT5y5e", "name": "As It Was", "artist_idx": 4, "album": "Harry's House", "duration_ms": 167000, "popularity": 93},
    {"id": "3spdoTYpuCpmq19tuD0bOe", "name": "Dakiti", "artist_idx": 5, "album": "El Último Tour Del Mundo", "duration_ms": 205000, "popularity": 87},
    {"id": "2VxeLyX666F8uXCJ0dZF8B", "name": "Shallow", "artist_idx": 9, "album": "A Star Is Born", "duration_ms": 215000, "popularity": 86},
    {"id": "7MXVkk9YMctg9IZV0a4cOV", "name": "Vampire", "artist_idx": 14, "album": "GUTS", "duration_ms": 219000, "popularity": 88},
    {"id": "3E7dfMvvCLUddWissuqMwr", "name": "drivers license", "artist_idx": 14, "album": "SOUR", "duration_ms": 242000, "popularity": 85},
    {"id": "4LRPiXqCikLlN15c3yImP7", "name": "One Dance", "artist_idx": 1, "album": "Views", "duration_ms": 173000, "popularity": 90},
    {"id": "2xLMifQCjDGFmkHkpNLD9h", "name": "HUMBLE.", "artist_idx": 7, "album": "DAMN.", "duration_ms": 177000, "popularity": 89},
    {"id": "2b8fOow8UzyDFAE27YhOZM", "name": "Peaches", "artist_idx": 6, "album": "Justice", "duration_ms": 198000, "popularity": 84},
    {"id": "0e7ipj03S05BNilyu5bRzt", "name": "Cruel Summer", "artist_idx": 0, "album": "Lover", "duration_ms": 178000, "popularity": 94},
    {"id": "7x9aauaA9cu6tyfpHnqDLo", "name": "Don't Start Now", "artist_idx": 11, "album": "Future Nostalgia", "duration_ms": 183000, "popularity": 87},
    {"id": "2Fxmhks0bxGSBdJ92vM42m", "name": "bad guy", "artist_idx": 0, "album": "WHEN WE ALL FALL ASLEEP", "duration_ms": 194000, "popularity": 91},
    {"id": "6AI3ezQ4o3HUoP6Dhudph3", "name": "See You Again", "artist_idx": 8, "album": "Furious 7 Soundtrack", "duration_ms": 237000, "popularity": 85},
    {"id": "6habFhsOp2NvshLv26DqMb", "name": "Someone Like You", "artist_idx": 9, "album": "21", "duration_ms": 285000, "popularity": 88},
    {"id": "7qEHsqek33rTcFNT9PFqLf", "name": "Someone You Loved", "artist_idx": 4, "album": "Divinely Uninspired", "duration_ms": 182000, "popularity": 86},
    {"id": "1zi7xx7UVEFkmKfv06H8x0", "name": "Dynamite", "artist_idx": 12, "album": "BE", "duration_ms": 199000, "popularity": 87},
    {"id": "3a1lNhkSLSkpJE4MSHpDu9", "name": "Hips Don't Lie", "artist_idx": 13, "album": "Oral Fixation Vol. 2", "duration_ms": 218000, "popularity": 83},
    {"id": "3USxtqRwSYz57Ewm5wWRLw", "name": "thank u, next", "artist_idx": 3, "album": "thank u, next", "duration_ms": 207000, "popularity": 86},
    {"id": "5IgjP7X4th6nMNDh4akUHb", "name": "positions", "artist_idx": 3, "album": "Positions", "duration_ms": 172000, "popularity": 84},
]

AUDIO_FEATURES_PRESETS = [
    {"danceability": 0.72, "energy": 0.85, "valence": 0.65, "acousticness": 0.08, "instrumentalness": 0.0, "liveness": 0.12, "speechiness": 0.04, "tempo": 120.0},
    {"danceability": 0.85, "energy": 0.75, "valence": 0.80, "acousticness": 0.15, "instrumentalness": 0.0, "liveness": 0.09, "speechiness": 0.05, "tempo": 96.0},
    {"danceability": 0.55, "energy": 0.60, "valence": 0.40, "acousticness": 0.45, "instrumentalness": 0.02, "liveness": 0.15, "speechiness": 0.03, "tempo": 110.0},
    {"danceability": 0.68, "energy": 0.90, "valence": 0.70, "acousticness": 0.05, "instrumentalness": 0.0, "liveness": 0.20, "speechiness": 0.08, "tempo": 130.0},
    {"danceability": 0.90, "energy": 0.70, "valence": 0.85, "acousticness": 0.10, "instrumentalness": 0.0, "liveness": 0.06, "speechiness": 0.12, "tempo": 105.0},
]

PLAYLISTS = [
    {"id": "pl_chill_vibes", "name": "Chill Vibes ☁️", "description": "Mellow tunes for relaxing", "total_tracks": 45},
    {"id": "pl_workout", "name": "Workout Bangers 💪", "description": "High energy tracks for the gym", "total_tracks": 62},
    {"id": "pl_driving", "name": "Late Night Drive 🌙", "description": "Perfect for cruising", "total_tracks": 38},
    {"id": "pl_throwback", "name": "Throwback Hits 🕺", "description": "Best of the 2010s", "total_tracks": 80},
    {"id": "pl_discover", "name": "Weekly Discoveries 🔍", "description": "New finds this week", "total_tracks": 25},
]


async def seed():
    """Insert test data into MongoDB."""
    import os
    mongo_uri = os.environ.get("MONGO_URI", "mongodb://echostats:changeme@localhost:27017/echostats?authSource=admin")
    client = AsyncIOMotorClient(mongo_uri)
    db = client["echostats"]

    # Clear existing seed data
    for coll in ["users", "spotify_tokens", "artists", "tracks", "listening_history",
                 "playlists", "analytics_snapshots", "genre_distributions", "sync_jobs",
                 "api_logs"]:
        await db[coll].delete_many({})

    print("🗑️  Cleared existing data")

    # ── User ────────────────────────────────────────────────────────────────
    user_id_obj = await db["users"].insert_one({
        "spotify_id": "demo_user",
        "display_name": "Demo User",
        "email": "demo@echostats.local",
        "image_url": "",
        "country": "US",
        "product": "premium",
        "created_at": datetime.utcnow() - timedelta(days=90),
        "last_synced_at": datetime.utcnow(),
    })
    user_id = str(user_id_obj.inserted_id)
    print(f"👤 Created demo user: {user_id}")

    # ── Artists ─────────────────────────────────────────────────────────────
    for a in ARTISTS:
        await db["artists"].insert_one({
            "spotify_id": a["id"],
            "name": a["name"],
            "genres": a["genres"],
            "popularity": a["popularity"],
            "followers": a["followers"],
            "images": [{"url": a["image"], "height": 640, "width": 640}],
            "external_url": f"https://open.spotify.com/artist/{a['id']}",
            "fetched_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
    print(f"🎤 Inserted {len(ARTISTS)} artists")

    # ── Tracks ──────────────────────────────────────────────────────────────
    for t in TRACKS:
        artist = ARTISTS[t["artist_idx"]]
        af = random.choice(AUDIO_FEATURES_PRESETS).copy()
        # Add some variance
        for k in af:
            if isinstance(af[k], float) and k != "tempo":
                af[k] = max(0.0, min(1.0, af[k] + random.uniform(-0.15, 0.15)))
            elif k == "tempo":
                af[k] += random.uniform(-15, 15)

        await db["tracks"].insert_one({
            "spotify_id": t["id"],
            "name": t["name"],
            "artists": [{"spotify_id": artist["id"], "name": artist["name"]}],
            "album": {
                "spotify_id": f"album_{t['id'][:8]}",
                "name": t["album"],
                "image_url": artist["image"],
                "release_date": f"{random.randint(2018, 2025)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            },
            "duration_ms": t["duration_ms"],
            "popularity": t["popularity"],
            "explicit": random.random() > 0.7,
            "preview_url": None,
            "external_url": f"https://open.spotify.com/track/{t['id']}",
            "audio_features": {
                **af,
                "key": random.randint(0, 11),
                "loudness": random.uniform(-10, -3),
                "mode": random.choice([0, 1]),
                "duration_ms": t["duration_ms"],
                "time_signature": 4,
            },
            "genres": artist["genres"],
            "fetched_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
    print(f"🎵 Inserted {len(TRACKS)} tracks with audio features")

    # ── Listening History (last 90 days, ~2000 plays) ───────────────────────
    now = datetime.utcnow()
    history_count = 0
    for day_offset in range(90, 0, -1):
        # More plays on weekends, fewer on weekdays
        day_dt = now - timedelta(days=day_offset)
        is_weekend = day_dt.weekday() >= 5
        plays_today = random.randint(15, 35) if is_weekend else random.randint(8, 25)

        for _ in range(plays_today):
            track = random.choice(TRACKS)
            artist = ARTISTS[track["artist_idx"]]

            # Weighted hours — more plays in evening/night
            hour_weights = [1]*6 + [3]*2 + [5]*2 + [4]*2 + [3]*2 + [5]*2 + [8]*3 + [10]*3 + [6]*2
            hour = random.choices(range(24), weights=hour_weights, k=1)[0]
            played_at = day_dt.replace(
                hour=hour,
                minute=random.randint(0, 59),
                second=random.randint(0, 59),
            )

            await db["listening_history"].insert_one({
                "user_id": user_id,
                "track": {
                    "spotify_id": track["id"],
                    "name": track["name"],
                    "artist_name": artist["name"],
                    "album_name": track["album"],
                    "album_image_url": artist["image"],
                    "duration_ms": track["duration_ms"],
                },
                "played_at": played_at,
                "ms_played": track["duration_ms"] - random.randint(0, 30000),
                "source": "seed",
                "context_type": random.choice(["playlist", "album", "artist", ""]),
                "context_uri": "",
            })
            history_count += 1

    print(f"📜 Inserted {history_count} listening history entries (90 days)")

    # ── Playlists ───────────────────────────────────────────────────────────
    for pl in PLAYLISTS:
        sample_tracks = random.sample(TRACKS, min(5, len(TRACKS)))
        await db["playlists"].insert_one({
            "spotify_id": pl["id"],
            "user_id": user_id,
            "name": pl["name"],
            "description": pl["description"],
            "public": True,
            "collaborative": False,
            "images": [{"url": ARTISTS[random.randint(0, len(ARTISTS)-1)]["image"], "height": 640, "width": 640}],
            "owner_id": "demo_user",
            "owner_name": "Demo User",
            "total_tracks": pl["total_tracks"],
            "tracks": [
                {
                    "spotify_id": t["id"],
                    "name": t["name"],
                    "artist_name": ARTISTS[t["artist_idx"]]["name"],
                    "album_name": t["album"],
                    "added_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                    "duration_ms": t["duration_ms"],
                }
                for t in sample_tracks
            ],
            "snapshot_id": "snap_001",
            "external_url": f"https://open.spotify.com/playlist/{pl['id']}",
            "fetched_at": datetime.utcnow(),
        })
    print(f"📋 Inserted {len(PLAYLISTS)} playlists")

    # ── Pre-compute Analytics Snapshot ──────────────────────────────────────
    from collections import Counter, defaultdict

    history = await db["listening_history"].find({"user_id": user_id}).to_list(length=10000)

    artist_counts: Counter = Counter()
    track_counts: Counter = Counter()
    genre_counts: Counter = Counter()
    hourly: defaultdict = defaultdict(lambda: {"count": 0, "ms": 0})
    daily: defaultdict = defaultdict(lambda: {"count": 0, "ms": 0})
    total_ms = 0
    track_ids = set()
    album_names = set()
    play_dates = set()

    for h in history:
        t = h["track"]
        artist_counts[t["artist_name"]] += 1
        track_counts[f"{t['spotify_id']}|{t['name']}|{t['artist_name']}"] += 1
        ms = h.get("ms_played", t.get("duration_ms", 0))
        total_ms += ms
        track_ids.add(t["spotify_id"])
        if t.get("album_name"):
            album_names.add(t["album_name"])

        hr = h["played_at"].hour
        dy = h["played_at"].weekday()
        hourly[hr]["count"] += 1
        hourly[hr]["ms"] += ms
        daily[dy]["count"] += 1
        daily[dy]["ms"] += ms
        play_dates.add(h["played_at"].strftime("%Y-%m-%d"))

    # Artist genres for genre counting
    for name, count in artist_counts.items():
        artist_doc = await db["artists"].find_one({"name": name})
        if artist_doc:
            for g in artist_doc.get("genres", []):
                genre_counts[g] += count

    # Top artists with images
    top_artists = []
    for rank, (name, count) in enumerate(artist_counts.most_common(20), 1):
        artist_doc = await db["artists"].find_one({"name": name})
        img = artist_doc["images"][0]["url"] if artist_doc and artist_doc.get("images") else ""
        sid = artist_doc["spotify_id"] if artist_doc else ""
        top_artists.append({"spotify_id": sid, "name": name, "play_count": count, "rank": rank, "image_url": img, "total_ms": 0})

    # Top tracks
    top_tracks = []
    for rank, (key, count) in enumerate(track_counts.most_common(20), 1):
        parts = key.split("|", 2)
        sid, name, artist = parts[0], parts[1], parts[2] if len(parts) > 2 else ""
        track_doc = await db["tracks"].find_one({"spotify_id": sid})
        img = track_doc["album"]["image_url"] if track_doc and track_doc.get("album") else ""
        top_tracks.append({"spotify_id": sid, "name": f"{name} — {artist}", "play_count": count, "rank": rank, "image_url": img, "total_ms": 0})

    top_genres = [{"spotify_id": "", "name": g, "play_count": c, "rank": r, "image_url": "", "total_ms": 0}
                  for r, (g, c) in enumerate(genre_counts.most_common(20), 1)]

    # Streak
    sorted_dates = sorted(play_dates, reverse=True)
    streak = 1
    for i in range(1, len(sorted_dates)):
        prev = datetime.strptime(sorted_dates[i-1], "%Y-%m-%d")
        curr = datetime.strptime(sorted_dates[i], "%Y-%m-%d")
        if (prev - curr).days == 1:
            streak += 1
        else:
            break

    # Avg audio features
    tracks_with_af = await db["tracks"].find({"audio_features": {"$ne": None}}).to_list(length=1000)
    af_totals = {"danceability": 0, "energy": 0, "valence": 0, "acousticness": 0, "instrumentalness": 0, "liveness": 0, "speechiness": 0, "tempo": 0}
    af_count = 0
    for td in tracks_with_af:
        if td.get("audio_features"):
            for k in af_totals:
                af_totals[k] += td["audio_features"].get(k, 0)
            af_count += 1
    avg_af = {k: round(v / max(af_count, 1), 3) for k, v in af_totals.items()} if af_count else None

    for period in ["week", "month", "year", "all_time"]:
        await db["analytics_snapshots"].insert_one({
            "user_id": user_id,
            "period": period,
            "period_start": now - timedelta(days={"week": 7, "month": 30, "year": 365, "all_time": 3650}[period]),
            "period_end": now,
            "total_tracks_played": len(history),
            "total_ms_played": total_ms,
            "unique_tracks": len(track_ids),
            "unique_artists": len(artist_counts),
            "unique_albums": len(album_names),
            "unique_genres": len(genre_counts),
            "listening_streak_days": streak,
            "top_artists": top_artists,
            "top_tracks": top_tracks,
            "top_genres": top_genres,
            "top_albums": [],
            "hourly_distribution": [{"hour": h, "count": d["count"], "total_ms": d["ms"]} for h, d in sorted(hourly.items())],
            "daily_distribution": [{"day": d, "count": v["count"], "total_ms": v["ms"]} for d, v in sorted(daily.items())],
            "avg_audio_features": avg_af,
            "computed_at": now,
        })

    print("📊 Computed analytics snapshots for 4 periods")

    # ── Sync Job Records (multiple) ────────────────────────────────────────
    sync_types = [
        {"job_type": "initial", "days_ago": 30, "items": history_count},
        {"job_type": "periodic", "days_ago": 7, "items": 45},
        {"job_type": "periodic", "days_ago": 3, "items": 38},
        {"job_type": "periodic", "days_ago": 1, "items": 22},
        {"job_type": "periodic", "days_ago": 0, "items": 15},
    ]
    for sj in sync_types:
        started = now - timedelta(days=sj["days_ago"], minutes=5)
        await db["sync_jobs"].insert_one({
            "user_id": user_id,
            "job_type": sj["job_type"],
            "status": "completed",
            "started_at": started,
            "completed_at": started + timedelta(seconds=random.randint(10, 120)),
            "items_processed": sj["items"],
            "items_total": sj["items"],
            "error_message": "",
            "created_at": started,
        })
    # Add a failed job for realism
    failed_at = now - timedelta(days=5, hours=6)
    await db["sync_jobs"].insert_one({
        "user_id": user_id,
        "job_type": "periodic",
        "status": "failed",
        "started_at": failed_at,
        "completed_at": failed_at + timedelta(seconds=3),
        "items_processed": 0,
        "items_total": 0,
        "error_message": "Spotify API rate limited (429)",
        "created_at": failed_at,
    })
    print(f"✅ Created {len(sync_types) + 1} sync job records")

    # ── API Log Entries ────────────────────────────────────────────────────
    api_endpoints = [
        ("/v1/me/player/recently-played", "GET", 200, 150),
        ("/v1/me/top/artists", "GET", 200, 200),
        ("/v1/me/top/tracks", "GET", 200, 180),
        ("/v1/audio-features", "GET", 200, 120),
        ("/v1/me/player", "GET", 200, 90),
        ("/v1/recommendations", "GET", 200, 250),
        ("/v1/me/playlists", "GET", 200, 170),
        ("/v1/me/following", "GET", 200, 140),
    ]
    api_log_count = 0
    for day_offset in range(30, 0, -1):
        num_calls = random.randint(5, 20)
        for _ in range(num_calls):
            ep = random.choice(api_endpoints)
            is_error = random.random() < 0.05  # 5% error rate
            status = random.choice([429, 500, 503]) if is_error else ep[2]
            latency = ep[3] + random.uniform(-50, 100) if not is_error else random.uniform(500, 3000)
            ts = now - timedelta(days=day_offset, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            await db["api_logs"].insert_one({
                "user_id": user_id,
                "service": "spotify",
                "method": ep[1],
                "endpoint": ep[0],
                "status_code": status,
                "latency_ms": round(latency, 1),
                "error": f"HTTP {status}" if is_error else "",
                "request_id": f"req_{random.randint(100000,999999)}",
                "timestamp": ts,
            })
            api_log_count += 1
    print(f"📡 Inserted {api_log_count} API log entries")

    # ── Genre Distribution (daily snapshots) ───────────────────────────────
    for day_offset in range(30, 0, -1):
        day_dt = now - timedelta(days=day_offset)
        # Vary genres per day
        daily_genres = {}
        for g, c in genre_counts.items():
            daily_genres[g] = max(0, c // 90 + random.randint(-2, 5))
        await db["genre_distributions"].insert_one({
            "user_id": user_id,
            "date": day_dt.replace(hour=0, minute=0, second=0),
            "genres": daily_genres,
            "total_plays": sum(daily_genres.values()),
        })
    print("📊 Inserted 30 daily genre distribution snapshots")

    # Summary
    print(f"\n{'='*50}")
    print("🎵 EchoStats Seed Data Summary")
    print(f"{'='*50}")
    print("  User:      Demo User (demo_user)")
    print(f"  Artists:   {len(ARTISTS)}")
    print(f"  Tracks:    {len(TRACKS)} (with audio features)")
    print(f"  History:   {history_count} plays (90 days)")
    print(f"  Playlists: {len(PLAYLISTS)}")
    print(f"  API Logs:  {api_log_count} entries")
    print(f"  Sync Jobs: {len(sync_types) + 1}")
    print(f"  Genres:    {len(genre_counts)} unique")
    print(f"  Streak:    {streak} days")
    print(f"  Total:     {round(total_ms / 3600000, 1)} hours listened")
    print(f"{'='*50}")
    print("\n🌐 Open http://localhost:3000/dashboard to see the data!")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
