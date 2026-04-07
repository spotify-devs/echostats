"""Custom Prometheus metrics for EchoStats business logic."""

from prometheus_client import Counter, Gauge, Histogram

# Sync metrics
tracks_synced_total = Counter(
    "echostats_tracks_synced_total",
    "Total number of tracks synced from Spotify",
    ["user_id"],
)
sync_duration_seconds = Histogram(
    "echostats_sync_duration_seconds",
    "Duration of sync operations",
    ["job_type"],
    buckets=[1, 5, 10, 30, 60, 120, 300],
)
sync_failures_total = Counter(
    "echostats_sync_failures_total",
    "Total number of failed sync operations",
    ["job_type"],
)

# Token metrics
token_refreshes_total = Counter(
    "echostats_token_refreshes_total",
    "Total number of Spotify token refreshes",
    ["status"],  # "success", "failed", "revoked"
)

# User metrics
active_users_gauge = Gauge(
    "echostats_active_users",
    "Number of users with valid tokens",
)
