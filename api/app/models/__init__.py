"""MongoDB document models for EchoStats."""

from app.models.user import User, SpotifyTokens
from app.models.track import Track, AudioFeatures
from app.models.artist import Artist
from app.models.album import Album
from app.models.listening_history import ListeningHistory
from app.models.playlist import Playlist, PlaylistTrack
from app.models.analytics import AnalyticsSnapshot, GenreDistribution
from app.models.sync_job import SyncJob
from app.models.api_log import ApiLog

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
