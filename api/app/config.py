"""Application configuration with Pydantic Settings."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Spotify
    spotify_client_id: str = Field(description="Spotify OAuth client ID")
    spotify_client_secret: str = Field(description="Spotify OAuth client secret")
    spotify_redirect_uri: str = Field(
        default="http://localhost:8000/api/v1/auth/callback",
        description="Spotify OAuth redirect URI",
    )

    # MongoDB
    mongo_uri: str = Field(
        default="mongodb://echostats:changeme@localhost:27017/echostats?authSource=admin",
        description="MongoDB connection URI",
    )
    mongo_db: str = Field(default="echostats", description="MongoDB database name")

    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL",
    )

    # Server
    api_host: str = Field(default="0.0.0.0", description="API server host")
    api_port: int = Field(default=8000, description="API server port")
    api_workers: int = Field(default=2, description="Number of Uvicorn workers")
    log_level: str = Field(default="info", description="Log level")
    cors_origins: str = Field(
        default="http://localhost:3000",
        description="Comma-separated CORS origins",
    )

    # Security
    jwt_secret: str = Field(description="JWT signing secret")
    encryption_key: str = Field(description="AES-256-GCM encryption key (64 hex chars)")

    # Sync
    sync_interval_minutes: int = Field(
        default=15, description="Spotify data sync interval in minutes"
    )
    analytics_refresh_hours: int = Field(
        default=6, description="Analytics recomputation interval in hours"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()  # type: ignore[call-arg]
