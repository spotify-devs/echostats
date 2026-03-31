"""MongoDB connection management using Beanie ODM."""

import asyncio

import structlog
from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.config import settings

logger = structlog.get_logger()

client: AsyncMongoClient | None = None

MAX_RETRIES = 10
RETRY_DELAY = 3  # seconds


async def init_db() -> None:
    """Initialize MongoDB connection and Beanie ODM with retry logic."""
    global client
    from app.models import ALL_MODELS

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            client = AsyncMongoClient(
                settings.mongo_uri,
                maxPoolSize=10,
                minPoolSize=2,
                maxIdleTimeMS=30000,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=30000,
            )
            db = client[settings.mongo_db]
            await init_beanie(database=db, document_models=ALL_MODELS)
            if attempt > 1:
                logger.info("Database connected after retry", attempt=attempt)
            return
        except Exception as exc:
            if attempt == MAX_RETRIES:
                logger.error(
                    "Database connection failed after all retries",
                    attempts=MAX_RETRIES,
                    error=str(exc),
                )
                raise
            logger.warning(
                "Database not ready, retrying...",
                attempt=attempt,
                max_retries=MAX_RETRIES,
                delay=RETRY_DELAY,
                error=str(exc),
            )
            # Close failed client before retrying
            if client:
                try:
                    await client.close()
                except Exception:
                    pass
                client = None
            await asyncio.sleep(RETRY_DELAY)


async def close_db() -> None:
    """Close MongoDB connection."""
    global client
    if client:
        await client.close()
