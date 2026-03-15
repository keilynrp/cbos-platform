from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    app_name: str = "CBOS API"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = False

    # API
    api_prefix: str = "/api/v1"
    allowed_origins: list[str] = ["http://localhost:8080", "http://localhost:3000"]

    # Database
    database_url: str = "postgresql+asyncpg://cbos:cbos@localhost:5432/cbos_dev"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Auth JWT
    secret_key: str = "change-this-in-production-use-256-bit-random-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
