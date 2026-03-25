"""MongoDB document models for EchoStats."""

from app.models.album import Album
from app.models.analytics import AnalyticsSnapshot, GenreDistribution
from app.models.api_log import ApiLog
from app.models.artist import Artist
from app.models.listening_history import ListeningHistory
from app.models.playlist import Playlist
from app.models.playlist import PlaylistTrack as PlaylistTrack
from app.models.sync_job import SyncJob
from app.models.track import AudioFeatures as AudioFeatures
from app.models.track import Track
from app.models.user import SpotifyTokens, User

ALL_MODELS = [
    User,
    SpotifyTokens,
    Track,
    Artist,
    Album,
    ListeningHistory,
    Playlist,
    AnalyticsSnapshot,
    GenreDistribution,
    SyncJob,
    ApiLog,
]
