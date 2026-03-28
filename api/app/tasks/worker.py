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

    from app.models.sync_job import SyncJob, SyncStep
    from app.models.user import User
    from app.services.analytics_service import compute_analytics_snapshot
    from app.services.rollup_service import update_rollup_for_date
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
                job.steps.append(SyncStep(
                    action="get_token", status="failed",
                    detail="Token expired or invalid — re-authentication required",
                    completed_at=datetime.now(tz=UTC), error="No valid token",
                ))
                await job.save()
                continue

            client = SpotifyClient(token, user_id=user_id)
            try:
                # Step 1: Sync recently played
                step1 = SyncStep(action="sync_recently_played", detail="Fetching recently played tracks from Spotify")
                count = await sync_recently_played(client, user_id)
                step1.status = "completed"
                step1.items = count
                step1.detail = f"Fetched {count} new track{'s' if count != 1 else ''} from recently played"
                step1.completed_at = datetime.now(tz=UTC)
                job.steps.append(step1)

                # Step 2: Enrich audio features
                if count > 0:
                    step2 = SyncStep(action="enrich_audio_features", detail="Fetching audio features for new tracks")
                    enriched = await enrich_audio_features(client, batch_size=50)
                    count += enriched
                    step2.status = "completed"
                    step2.items = enriched
                    step2.detail = f"Enriched audio features for {enriched} track{'s' if enriched != 1 else ''}"
                    step2.completed_at = datetime.now(tz=UTC)
                    job.steps.append(step2)

                job.status = "completed"
                job.items_processed = count
                job.completed_at = datetime.now(tz=UTC)
                logger.info("Periodic sync complete", user_id=user_id, new_tracks=count)
            finally:
                await client.close()

            # Step 3: Refresh analytics
            if count > 0:
                step3 = SyncStep(action="refresh_analytics", detail="Updating rollups and analytics snapshots")
                today = datetime.now(tz=UTC).strftime("%Y-%m-%d")
                try:
                    await update_rollup_for_date(user_id, today)
                except Exception:
                    pass
                for period in ["week", "month", "all_time"]:
                    try:
                        await compute_analytics_snapshot(user_id, period)
                    except Exception:
                        pass
                step3.status = "completed"
                step3.detail = "Rollups + analytics refreshed for week, month, all_time"
                step3.completed_at = datetime.now(tz=UTC)
                job.steps.append(step3)

        except Exception as e:
            logger.error("Periodic sync failed for user", user_id=user_id, error=str(e))
            job.status = "failed"
            job.error_message = str(e)[:500]
            job.completed_at = datetime.now(tz=UTC)

        await job.save()


async def refresh_analytics(ctx: dict) -> None:
    """Periodic task: update rollups and recompute analytics snapshots."""
    import structlog

    from app.models.user import User
    from app.services.analytics_service import compute_analytics_snapshot
    from app.services.rollup_service import update_rollup_for_date

    logger = structlog.get_logger()
    users = await User.find_all().to_list()
    today = datetime.now(tz=UTC).strftime("%Y-%m-%d")

    for user in users:
        try:
            await update_rollup_for_date(str(user.id), today)
            for period in ["week", "month", "year", "all_time"]:
                await compute_analytics_snapshot(str(user.id), period)
            logger.info("Analytics refreshed", user_id=str(user.id))
        except Exception as e:
            logger.error("Analytics refresh failed", user_id=str(user.id), error=str(e))


async def build_user_rollups(ctx: dict, user_id: str, job_id: str) -> None:
    """Background task: build DailyRollup documents for a user."""
    import structlog

    from app.models.sync_job import SyncJob
    from app.services.rollup_service import build_rollups

    logger = structlog.get_logger()

    job = await SyncJob.get(job_id)
    if not job:
        logger.error("Rollup build job not found", job_id=job_id)
        return

    job.status = "running"
    job.started_at = datetime.now(tz=UTC)
    await job.save()

    try:
        days_built = await build_rollups(user_id)
        job.status = "completed"
        job.items_processed = days_built
        job.completed_at = datetime.now(tz=UTC)
        logger.info("Rollup build complete", user_id=user_id, days=days_built)
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)[:500]
        job.completed_at = datetime.now(tz=UTC)
        logger.error("Rollup build failed", user_id=user_id, error=str(e))

    await job.save()


def _parse_redis_url() -> RedisSettings:
    """Parse Redis URL into ARQ RedisSettings."""
    return RedisSettings.from_dsn(settings.redis_url)


class WorkerSettings:
    """ARQ worker settings."""

    functions = [sync_all_users, refresh_analytics, build_user_rollups]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = _parse_redis_url()
    cron_jobs = [
        cron(sync_all_users, minute={0, 15, 30, 45}),  # Every 15 minutes
        cron(refresh_analytics, hour={0, 6, 12, 18}, minute=30),  # Every 6 hours
    ]
    max_jobs = 5
    job_timeout = 600  # 10 minutes (rollup builds can be large)
