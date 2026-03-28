"""ARQ background worker configuration."""

from datetime import UTC, datetime, timedelta

from arq import cron
from arq.connections import RedisSettings

from app.config import settings


async def startup(ctx: dict) -> None:
    """Worker startup — initialize database and clean up stale jobs."""
    import structlog

    from app.database import init_db

    logger = structlog.get_logger()
    logger.info("Worker starting", redis_host=_parse_redis_url().host, redis_has_password=bool(_parse_redis_url().password))
    await init_db()
    ctx["db_initialized"] = True

    # Clean up jobs stuck in "running" from a previous crash
    cleaned = await _reap_stale_jobs()
    if cleaned:
        logger.info("Cleaned up stale jobs on startup", count=cleaned)


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
    from app.services.sync_service import (
        enrich_audio_features,
        sync_playlists,
        sync_recently_played,
        sync_top_items,
    )
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

                # Step 3: Sync playlists
                step_pl = SyncStep(action="sync_playlists", detail="Syncing playlists from Spotify")
                try:
                    pl_count = await sync_playlists(client, user_id)
                    step_pl.status = "completed"
                    step_pl.items = pl_count
                    step_pl.detail = f"Synced {pl_count} playlist{'s' if pl_count != 1 else ''}"
                except Exception as e:
                    step_pl.status = "failed"
                    step_pl.error = str(e)[:200]
                    step_pl.detail = "Failed to sync playlists"
                step_pl.completed_at = datetime.now(tz=UTC)
                job.steps.append(step_pl)

                # Step 4: Sync top artists & tracks (refreshes artist genres)
                step_top = SyncStep(action="sync_top_items", detail="Syncing top artists & tracks from Spotify")
                try:
                    top_counts = await sync_top_items(client, user_id)
                    top_total = top_counts["artists"] + top_counts["tracks"]
                    step_top.status = "completed"
                    step_top.items = top_total
                    step_top.detail = f"Synced {top_counts['artists']} artists, {top_counts['tracks']} tracks"
                except Exception as e:
                    step_top.status = "failed"
                    step_top.error = str(e)[:200]
                    step_top.detail = "Failed to sync top items"
                step_top.completed_at = datetime.now(tz=UTC)
                job.steps.append(step_top)

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


async def periodic_rollup_build(ctx: dict) -> None:
    """Periodic task: build missing rollups for all users.

    Compares rollup day count vs listening history day count and rebuilds
    when there are unprocessed days.
    """
    import structlog

    from app.models.sync_job import SyncJob, SyncStep
    from app.models.user import User
    from app.services.rollup_service import build_rollups, get_rollup_status

    logger = structlog.get_logger()
    users = await User.find_all().to_list()
    logger.info("Starting periodic rollup build", user_count=len(users))

    for user in users:
        user_id = str(user.id)

        try:
            status = await get_rollup_status(user_id)

            # Skip if already building or fully up to date
            if status["is_building"]:
                logger.info("Rollup build already running, skipping", user_id=user_id)
                continue
            if status["history_days"] == 0:
                continue
            if status["rollup_days"] >= status["history_days"]:
                logger.debug("Rollups up to date", user_id=user_id)
                continue

            missing = status["history_days"] - status["rollup_days"]
            logger.info(
                "Building missing rollups",
                user_id=user_id,
                rollup_days=status["rollup_days"],
                history_days=status["history_days"],
                missing=missing,
            )

            job = SyncJob(
                user_id=user_id,
                job_type="rollup_build",
                status="running",
                started_at=datetime.now(tz=UTC),
                items_total=status["history_days"],
            )
            await job.insert()

            step = SyncStep(
                action="build_rollups",
                detail=f"Building rollups for {missing} missing day(s)",
            )

            try:
                days_built = await build_rollups(user_id)
                step.status = "completed"
                step.items = days_built
                step.detail = f"Built rollups for {days_built} day(s)"
                step.completed_at = datetime.now(tz=UTC)
                job.status = "completed"
                job.items_processed = days_built
                logger.info("Periodic rollup build complete", user_id=user_id, days=days_built)
            except Exception as e:
                step.status = "failed"
                step.error = str(e)[:500]
                step.completed_at = datetime.now(tz=UTC)
                job.status = "failed"
                job.error_message = str(e)[:500]
                logger.error("Periodic rollup build failed", user_id=user_id, error=str(e))

            job.steps.append(step)
            job.completed_at = datetime.now(tz=UTC)
            await job.save()

        except Exception as e:
            logger.error("Periodic rollup build error", user_id=user_id, error=str(e))


# Max time a job can stay in "running" before being considered stale
STALE_JOB_TIMEOUT_MINUTES = 30


async def _reap_stale_jobs() -> int:
    """Mark jobs stuck in 'running' or 'pending' for too long as failed.

    Returns the number of jobs cleaned up.
    """
    from app.models.sync_job import SyncJob

    cutoff = datetime.now(tz=UTC) - timedelta(minutes=STALE_JOB_TIMEOUT_MINUTES)

    stale_jobs = await SyncJob.find(
        {"status": {"$in": ["running", "pending"]}, "created_at": {"$lt": cutoff}},
    ).to_list()

    for job in stale_jobs:
        job.status = "failed"
        job.error_message = (
            f"Job timed out — stuck for >{STALE_JOB_TIMEOUT_MINUTES} minutes "
            f"(likely due to a worker restart)"
        )
        job.completed_at = datetime.now(tz=UTC)
        await job.save()

    return len(stale_jobs)


async def cleanup_stale_jobs(ctx: dict) -> None:
    """Periodic task: reap jobs stuck in running/pending state."""
    import structlog

    logger = structlog.get_logger()
    cleaned = await _reap_stale_jobs()
    if cleaned:
        logger.info("Cleaned up stale jobs", count=cleaned)


def _parse_redis_url() -> RedisSettings:
    """Parse Redis URL into ARQ RedisSettings."""
    return RedisSettings.from_dsn(settings.redis_url)


class WorkerSettings:
    """ARQ worker settings."""

    functions = [sync_all_users, refresh_analytics, build_user_rollups, periodic_rollup_build, cleanup_stale_jobs]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = _parse_redis_url()
    cron_jobs = [
        cron(sync_all_users, minute={0, 15, 30, 45}),  # Every 15 minutes
        cron(refresh_analytics, hour={0, 6, 12, 18}, minute=30),  # Every 6 hours
        cron(periodic_rollup_build, hour={3, 15}, minute=0),  # Every 12 hours
        cron(cleanup_stale_jobs, minute={5, 20, 35, 50}),  # Every 15 minutes (offset from sync)
    ]
    max_jobs = 5
    job_timeout = 600  # 10 minutes (rollup builds can be large)
