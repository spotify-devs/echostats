"""ARQ background worker configuration."""

from arq import cron
from arq.connections import RedisSettings

from app.config import settings


async def startup(ctx: dict) -> None:
    """Worker startup — initialize database."""
    from app.database import init_db

    await init_db()
    ctx["db_initialized"] = True


async def shutdown(ctx: dict) -> None:
    """Worker shutdown — close connections."""
    from app.database import close_db

    await close_db()


async def sync_all_users(ctx: dict) -> None:
    """Periodic task: sync recently played for all users."""
    import structlog

    from app.models.user import User
    from app.services.spotify_client import SpotifyClient
    from app.services.sync_service import enrich_audio_features, sync_recently_played
    from app.services.token_service import get_valid_access_token

    logger = structlog.get_logger()
    users = await User.find_all().to_list()
    logger.info("Starting periodic sync", user_count=len(users))

    for user in users:
        try:
            token = await get_valid_access_token(user)
            if not token:
                logger.warning("No valid token for user", user_id=str(user.id))
                continue

            client = SpotifyClient(token, user_id=str(user.id))
            try:
                count = await sync_recently_played(client, str(user.id))
                if count > 0:
                    await enrich_audio_features(client, batch_size=50)
                logger.info("Periodic sync complete", user_id=str(user.id), new_tracks=count)
            finally:
                await client.close()
        except Exception as e:
            logger.error("Periodic sync failed for user", user_id=str(user.id), error=str(e))


async def refresh_analytics(ctx: dict) -> None:
    """Periodic task: recompute analytics snapshots."""
    import structlog

    from app.models.user import User
    from app.services.analytics_service import compute_analytics_snapshot

    logger = structlog.get_logger()
    users = await User.find_all().to_list()

    for user in users:
        try:
            for period in ["week", "month", "year", "all_time"]:
                await compute_analytics_snapshot(str(user.id), period)
            logger.info("Analytics refreshed", user_id=str(user.id))
        except Exception as e:
            logger.error("Analytics refresh failed", user_id=str(user.id), error=str(e))


def _parse_redis_url() -> RedisSettings:
    """Parse Redis URL into ARQ RedisSettings."""
    from urllib.parse import urlparse

    parsed = urlparse(settings.redis_url)
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or "0"),
        password=parsed.password or None,
        username=parsed.username or None,
    )


class WorkerSettings:
    """ARQ worker settings."""

    functions = [sync_all_users, refresh_analytics]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = _parse_redis_url()
    cron_jobs = [
        cron(sync_all_users, minute={0, 15, 30, 45}),  # Every 15 minutes
        cron(refresh_analytics, hour={0, 6, 12, 18}, minute=30),  # Every 6 hours
    ]
    max_jobs = 5
    job_timeout = 300  # 5 minutes
