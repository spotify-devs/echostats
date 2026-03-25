"""MongoDB connection management using Beanie ODM."""

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings

client: AsyncIOMotorClient | None = None


async def init_db() -> None:
    """Initialize MongoDB connection and Beanie ODM."""
    global client
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.mongo_db]

    from app.models import ALL_MODELS

    await init_beanie(database=db, document_models=ALL_MODELS)


async def close_db() -> None:
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
