"""ARQ background worker configuration."""

from datetime import UTC, datetime

from arq import cron
from arq.connections import RedisSettings

from app.config import settings


async def startup(ctx: dict) -> None:
    """Worker startup — initialize database."""
    import structlog

    from app.database import init_db

    logger = structlog.get_logger()
    logger.info("Worker starting", redis_host=_parse_redis_url().host, redis_has_password=bool(_parse_redis_url().password))
    await init_db()
    ctx["db_initialized"] = True


async def shutdown(ctx: dict) -> None:
    """Worker shutdown — close connections."""
    from app.database import close_db

    await close_db()


async def sync_all_users(ctx: dict) -> None:
    """Periodic task: sync recently played for all users."""
    import structlog

    from app.models.sync_job import SyncJob
    from app.models.user import User
    from app.services.analytics_service import compute_analytics_snapshot
    from app.services.spotify_client import SpotifyClient
    from app.services.sync_service import enrich_audio_features, sync_recently_played
    from app.services.token_service import get_valid_access_token

    logger = structlog.get_logger()
    users = await User.find_all().to_list()
    logger.info("Starting periodic sync", user_count=len(users))

    for user in users:
        user_id = str(user.id)
        job = SyncJob(
            user_id=user_id,
            job_type="periodic",
            status="running",
            started_at=datetime.now(tz=UTC),
        )
        await job.insert()

        try:
            token = await get_valid_access_token(user)
            if not token:
                logger.warning("No valid token for user", user_id=user_id)
                job.status = "failed"
                job.error_message = "No valid Spotify token — re-login required"
                job.completed_at = datetime.now(tz=UTC)
                await job.save()
                continue

            client = SpotifyClient(token, user_id=user_id)
            try:
                count = await sync_recently_played(client, user_id)
                if count > 0:
                    count += await enrich_audio_features(client, batch_size=50)
                job.status = "completed"
                job.items_processed = count
                job.completed_at = datetime.now(tz=UTC)
                logger.info("Periodic sync complete", user_id=user_id, new_tracks=count)
            finally:
                await client.close()

            # Refresh analytics after successful sync
            if count > 0:
                for period in ["week", "month", "all_time"]:
                    try:
                        await compute_analytics_snapshot(user_id, period)
                    except Exception:
                        pass

        except Exception as e:
            logger.error("Periodic sync failed for user", user_id=user_id, error=str(e))
            job.status = "failed"
            job.error_message = str(e)[:500]
            job.completed_at = datetime.now(tz=UTC)

        await job.save()


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
    return RedisSettings.from_dsn(settings.redis_url)


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
