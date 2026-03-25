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
