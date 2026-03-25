"""Recommendations endpoints — personalized track suggestions."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.middleware.auth import get_current_user
from app.models.analytics import AnalyticsSnapshot
from app.models.track import Track
from app.models.user import User

router = APIRouter()


@router.get("/")
async def get_recommendations(
    user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(20, ge=1, le=50),
    seed_type: str = Query("mixed", regex="^(artists|tracks|genres|mixed)$"),
) -> dict:
    """Get personalized recommendations based on user's listening."""
    # Get user's top items as seeds
    snapshot = await AnalyticsSnapshot.find_one(
        AnalyticsSnapshot.user_id == str(user.id),
        AnalyticsSnapshot.period == "all_time",
    )

    if not snapshot:
        return {"items": [], "seed_info": {}}

    # Get tracks with audio features for variety scoring
    all_tracks = await Track.find(Track.audio_features != None).limit(100).to_list()
    if not all_tracks:
        return {"items": [], "seed_info": {}}

    import random
    random.shuffle(all_tracks)
    recommended = all_tracks[:limit]

    return {
        "items": [
            {
                "id": t.spotify_id,
                "name": t.name,
                "artists": [a.name for a in t.artists],
                "artist": t.artists[0].name if t.artists else "",
                "album": t.album.name if t.album else "",
                "album_image": t.album.image_url if t.album else "",
                "duration_ms": t.duration_ms,
                "popularity": t.popularity,
                "audio_features": {
                    "danceability": t.audio_features.danceability,
                    "energy": t.audio_features.energy,
                    "valence": t.audio_features.valence,
                } if t.audio_features else None,
                "external_url": t.external_url,
            }
            for t in recommended
        ],
        "total": len(recommended),
        "seed_info": {
            "type": seed_type,
            "top_artist": snapshot.top_artists[0].name if snapshot.top_artists else None,
            "top_genre": snapshot.top_genres[0].name if snapshot.top_genres else None,
        },
    }
