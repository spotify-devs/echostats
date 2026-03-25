"""Spotify Web API client with rate limiting and error handling."""

import time
from datetime import datetime, timedelta
from typing import Any

import httpx
import structlog

from app.config import settings
from app.models.api_log import ApiLog

logger = structlog.get_logger()

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1"

SCOPES = [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played",
    "user-library-read",
    "user-read-currently-playing",
    "user-read-playback-state",
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-public",
    "playlist-modify-private",
]


class SpotifyClientError(Exception):
    """Spotify API error."""

    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"Spotify API error {status_code}: {message}")


class SpotifyClient:
    """Async Spotify Web API client."""

    def __init__(self, access_token: str, user_id: str = ""):
        self.access_token = access_token
        self.user_id = user_id
        self._client = httpx.AsyncClient(
            base_url=SPOTIFY_API_BASE,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30.0,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def _request(
        self, method: str, endpoint: str, **kwargs: Any
    ) -> dict[str, Any]:
        """Make an API request with logging."""
        start = time.monotonic()
        status_code = 0
        error_msg = ""

        try:
            response = await self._client.request(method, endpoint, **kwargs)
            status_code = response.status_code

            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", "5"))
                logger.warning("Rate limited by Spotify", retry_after=retry_after)
                raise SpotifyClientError(429, f"Rate limited, retry after {retry_after}s")

            if response.status_code >= 400:
                body = response.text
                error_msg = body[:500]
                raise SpotifyClientError(response.status_code, body)

            return response.json() if response.content else {}
        except httpx.HTTPError as e:
            error_msg = str(e)
            raise SpotifyClientError(0, str(e)) from e
        finally:
            latency = (time.monotonic() - start) * 1000
            try:
                await ApiLog(
                    user_id=self.user_id,
                    service="spotify",
                    method=method.upper(),
                    endpoint=endpoint,
                    status_code=status_code,
                    latency_ms=latency,
                    error=error_msg,
                ).insert()
            except Exception:
                pass  # Don't fail on log errors

    async def get(
        self, endpoint: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        return await self._request("GET", endpoint, params=params)

    async def post(
        self, endpoint: str, json: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        return await self._request("POST", endpoint, json=json)

    async def put(
        self, endpoint: str, json: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        return await self._request("PUT", endpoint, json=json)

    async def delete(self, endpoint: str) -> dict[str, Any]:
        return await self._request("DELETE", endpoint)

    # ── User endpoints ──────────────────────────────────────────────────────

    async def get_current_user(self) -> dict[str, Any]:
        return await self.get("/me")

    async def get_top_items(
        self,
        item_type: str = "artists",
        time_range: str = "medium_term",
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        """Get user's top artists or tracks."""
        return await self.get(
            f"/me/top/{item_type}",
            params={"time_range": time_range, "limit": limit, "offset": offset},
        )

    async def get_recently_played(
        self, limit: int = 50, after: int | None = None
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"limit": limit}
        if after:
            params["after"] = after
        return await self.get("/me/player/recently-played", params=params)

    async def get_saved_tracks(
        self, limit: int = 50, offset: int = 0
    ) -> dict[str, Any]:
        return await self.get(
            "/me/tracks", params={"limit": limit, "offset": offset}
        )

    async def get_current_playback(self) -> dict[str, Any]:
        return await self.get("/me/player")

    # ── Track endpoints ─────────────────────────────────────────────────────

    async def get_track(self, track_id: str) -> dict[str, Any]:
        return await self.get(f"/tracks/{track_id}")

    async def get_tracks(self, track_ids: list[str]) -> dict[str, Any]:
        return await self.get(
            "/tracks", params={"ids": ",".join(track_ids[:50])}
        )

    async def get_audio_features(self, track_ids: list[str]) -> dict[str, Any]:
        return await self.get(
            "/audio-features", params={"ids": ",".join(track_ids[:100])}
        )

    # ── Artist endpoints ────────────────────────────────────────────────────

    async def get_artist(self, artist_id: str) -> dict[str, Any]:
        return await self.get(f"/artists/{artist_id}")

    async def get_artists(self, artist_ids: list[str]) -> dict[str, Any]:
        return await self.get(
            "/artists", params={"ids": ",".join(artist_ids[:50])}
        )

    async def get_related_artists(self, artist_id: str) -> dict[str, Any]:
        return await self.get(f"/artists/{artist_id}/related-artists")

    # ── Album endpoints ─────────────────────────────────────────────────────

    async def get_album(self, album_id: str) -> dict[str, Any]:
        return await self.get(f"/albums/{album_id}")

    # ── Playlist endpoints ──────────────────────────────────────────────────

    async def get_user_playlists(
        self, limit: int = 50, offset: int = 0
    ) -> dict[str, Any]:
        return await self.get(
            "/me/playlists", params={"limit": limit, "offset": offset}
        )

    async def get_playlist(self, playlist_id: str) -> dict[str, Any]:
        return await self.get(f"/playlists/{playlist_id}")

    async def get_playlist_tracks(
        self, playlist_id: str, limit: int = 100, offset: int = 0
    ) -> dict[str, Any]:
        return await self.get(
            f"/playlists/{playlist_id}/tracks",
            params={"limit": limit, "offset": offset},
        )

    async def create_playlist(
        self,
        user_id: str,
        name: str,
        description: str = "",
        public: bool = True,
    ) -> dict[str, Any]:
        return await self.post(
            f"/users/{user_id}/playlists",
            json={"name": name, "description": description, "public": public},
        )

    async def add_tracks_to_playlist(
        self, playlist_id: str, track_uris: list[str]
    ) -> dict[str, Any]:
        return await self.post(
            f"/playlists/{playlist_id}/tracks",
            json={"uris": track_uris},
        )

    async def remove_tracks_from_playlist(
        self, playlist_id: str, track_uris: list[str]
    ) -> dict[str, Any]:
        return await self.delete(f"/playlists/{playlist_id}/tracks")

    # ── Recommendations ─────────────────────────────────────────────────────

    async def get_recommendations(
        self,
        seed_artists: list[str] | None = None,
        seed_tracks: list[str] | None = None,
        seed_genres: list[str] | None = None,
        limit: int = 20,
        **kwargs: Any,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"limit": limit}
        if seed_artists:
            params["seed_artists"] = ",".join(seed_artists[:5])
        if seed_tracks:
            params["seed_tracks"] = ",".join(seed_tracks[:5])
        if seed_genres:
            params["seed_genres"] = ",".join(seed_genres[:5])
        params.update(kwargs)
        return await self.get("/recommendations", params=params)

    async def get_available_genres(self) -> dict[str, Any]:
        return await self.get("/recommendations/available-genre-seeds")

    # ── Search ──────────────────────────────────────────────────────────────

    async def search(
        self, query: str, types: list[str] | None = None, limit: int = 20
    ) -> dict[str, Any]:
        return await self.get(
            "/search",
            params={
                "q": query,
                "type": ",".join(types or ["track"]),
                "limit": limit,
            },
        )

    # ── Artist extended endpoints ───────────────────────────────────────

    async def get_artist_top_tracks(self, artist_id: str, market: str = "US") -> dict[str, Any]:
        """Get an artist's top tracks."""
        return await self.get(f"/artists/{artist_id}/top-tracks", params={"market": market})

    async def get_artist_albums(
        self, artist_id: str, include_groups: str = "album,single", limit: int = 50, offset: int = 0
    ) -> dict[str, Any]:
        """Get an artist's albums."""
        return await self.get(
            f"/artists/{artist_id}/albums",
            params={"include_groups": include_groups, "limit": limit, "offset": offset},
        )

    # ── Album extended endpoints ────────────────────────────────────────

    async def get_albums(self, album_ids: list[str]) -> dict[str, Any]:
        """Get multiple albums."""
        return await self.get("/albums", params={"ids": ",".join(album_ids[:20])})

    async def get_album_tracks(self, album_id: str, limit: int = 50, offset: int = 0) -> dict[str, Any]:
        """Get album tracks."""
        return await self.get(f"/albums/{album_id}/tracks", params={"limit": limit, "offset": offset})

    async def get_new_releases(self, limit: int = 20, offset: int = 0) -> dict[str, Any]:
        """Get new album releases."""
        return await self.get("/browse/new-releases", params={"limit": limit, "offset": offset})

    # ── Library endpoints ───────────────────────────────────────────────

    async def get_saved_albums(self, limit: int = 50, offset: int = 0) -> dict[str, Any]:
        """Get user's saved albums."""
        return await self.get("/me/albums", params={"limit": limit, "offset": offset})

    async def save_tracks(self, track_ids: list[str]) -> dict[str, Any]:
        """Save tracks to user's library."""
        return await self.put("/me/tracks", json={"ids": track_ids})

    async def remove_saved_tracks(self, track_ids: list[str]) -> dict[str, Any]:
        """Remove tracks from user's library."""
        return await self._request("DELETE", "/me/tracks", json={"ids": track_ids})

    async def check_saved_tracks(self, track_ids: list[str]) -> dict[str, Any]:
        """Check if tracks are saved in user's library."""
        return await self.get("/me/tracks/contains", params={"ids": ",".join(track_ids[:50])})

    async def save_albums(self, album_ids: list[str]) -> dict[str, Any]:
        """Save albums to user's library."""
        return await self.put("/me/albums", json={"ids": album_ids})

    async def check_saved_albums(self, album_ids: list[str]) -> dict[str, Any]:
        """Check if albums are saved."""
        return await self.get("/me/albums/contains", params={"ids": ",".join(album_ids[:20])})

    # ── Player/Playback Control ─────────────────────────────────────────

    async def get_devices(self) -> dict[str, Any]:
        """Get user's available playback devices."""
        return await self.get("/me/player/devices")

    async def get_playback_state(self) -> dict[str, Any]:
        """Get current playback state."""
        return await self.get("/me/player")

    async def get_currently_playing(self) -> dict[str, Any]:
        """Get currently playing track."""
        return await self.get("/me/player/currently-playing")

    async def start_playback(
        self, device_id: str | None = None, context_uri: str | None = None,
        uris: list[str] | None = None, offset: dict | None = None
    ) -> dict[str, Any]:
        """Start or resume playback."""
        body: dict[str, Any] = {}
        if context_uri:
            body["context_uri"] = context_uri
        if uris:
            body["uris"] = uris
        if offset:
            body["offset"] = offset
        params = {"device_id": device_id} if device_id else None
        return await self.put("/me/player/play", json=body if body else None)

    async def pause_playback(self, device_id: str | None = None) -> dict[str, Any]:
        """Pause playback."""
        params = {"device_id": device_id} if device_id else None
        return await self.put("/me/player/pause")

    async def skip_next(self, device_id: str | None = None) -> dict[str, Any]:
        """Skip to next track."""
        return await self.post("/me/player/next")

    async def skip_previous(self, device_id: str | None = None) -> dict[str, Any]:
        """Skip to previous track."""
        return await self.post("/me/player/previous")

    async def seek(self, position_ms: int) -> dict[str, Any]:
        """Seek to position in current track."""
        return await self.put("/me/player/seek", json=None)

    async def set_volume(self, volume_percent: int) -> dict[str, Any]:
        """Set playback volume."""
        return await self.put("/me/player/volume")

    async def set_repeat(self, state: str = "off") -> dict[str, Any]:
        """Set repeat mode: off, track, context."""
        return await self.put("/me/player/repeat")

    async def set_shuffle(self, state: bool = False) -> dict[str, Any]:
        """Toggle shuffle."""
        return await self.put("/me/player/shuffle")

    async def get_queue(self) -> dict[str, Any]:
        """Get user's playback queue."""
        return await self.get("/me/player/queue")

    async def add_to_queue(self, uri: str) -> dict[str, Any]:
        """Add item to playback queue."""
        return await self.post("/me/player/queue", json=None)

    async def transfer_playback(self, device_id: str, play: bool = False) -> dict[str, Any]:
        """Transfer playback to another device."""
        return await self.put("/me/player", json={"device_ids": [device_id], "play": play})

    # ── Follow endpoints ────────────────────────────────────────────────

    async def get_followed_artists(self, limit: int = 50, after: str | None = None) -> dict[str, Any]:
        """Get user's followed artists."""
        params: dict[str, Any] = {"type": "artist", "limit": limit}
        if after:
            params["after"] = after
        return await self.get("/me/following", params=params)

    async def follow_artists(self, artist_ids: list[str]) -> dict[str, Any]:
        """Follow artists."""
        return await self.put("/me/following", json={"ids": artist_ids})

    async def unfollow_artists(self, artist_ids: list[str]) -> dict[str, Any]:
        """Unfollow artists."""
        return await self._request("DELETE", "/me/following", json={"ids": artist_ids})

    async def check_following(self, artist_ids: list[str]) -> dict[str, Any]:
        """Check if following artists."""
        return await self.get("/me/following/contains", params={"type": "artist", "ids": ",".join(artist_ids)})

    # ── Browse/Categories ───────────────────────────────────────────────

    async def get_categories(self, limit: int = 50) -> dict[str, Any]:
        """Get browse categories."""
        return await self.get("/browse/categories", params={"limit": limit})

    async def get_category_playlists(self, category_id: str, limit: int = 20) -> dict[str, Any]:
        """Get playlists for a category."""
        return await self.get(f"/browse/categories/{category_id}/playlists", params={"limit": limit})

    async def get_featured_playlists(self, limit: int = 20) -> dict[str, Any]:
        """Get featured playlists."""
        return await self.get("/browse/featured-playlists", params={"limit": limit})

    # ── Markets ─────────────────────────────────────────────────────────

    async def get_markets(self) -> dict[str, Any]:
        """Get available markets."""
        return await self.get("/markets")

    # ── Shows/Podcasts ──────────────────────────────────────────────────

    async def get_saved_shows(self, limit: int = 50, offset: int = 0) -> dict[str, Any]:
        """Get user's saved shows/podcasts."""
        return await self.get("/me/shows", params={"limit": limit, "offset": offset})

    async def get_show(self, show_id: str) -> dict[str, Any]:
        """Get show details."""
        return await self.get(f"/shows/{show_id}")

    async def get_show_episodes(self, show_id: str, limit: int = 50) -> dict[str, Any]:
        """Get show episodes."""
        return await self.get(f"/shows/{show_id}/episodes", params={"limit": limit})

    async def get_saved_episodes(self, limit: int = 50, offset: int = 0) -> dict[str, Any]:
        """Get user's saved episodes."""
        return await self.get("/me/episodes", params={"limit": limit, "offset": offset})


async def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    """Exchange authorization code for access and refresh tokens."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.spotify_redirect_uri,
                "client_id": settings.spotify_client_id,
                "client_secret": settings.spotify_client_secret,
            },
        )
        response.raise_for_status()
        return response.json()


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    """Refresh an access token using a refresh token."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            SPOTIFY_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": settings.spotify_client_id,
                "client_secret": settings.spotify_client_secret,
            },
        )
        response.raise_for_status()
        return response.json()
