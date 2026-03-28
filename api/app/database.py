"""MongoDB connection management using Beanie ODM."""

from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.config import settings

client: AsyncMongoClient | None = None


async def init_db() -> None:
    """Initialize MongoDB connection and Beanie ODM."""
    global client
    client = AsyncMongoClient(settings.mongo_uri)
    db = client[settings.mongo_db]

    from app.models import ALL_MODELS

    await init_beanie(database=db, document_models=ALL_MODELS)


async def close_db() -> None:
    """Close MongoDB connection."""
    global client
    if client:
        await client.close()
