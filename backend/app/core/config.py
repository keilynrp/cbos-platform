from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
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

    # Portal
    portal_base_url: str = "http://localhost:8101"
    portal_token_expire_hours: int = 72

    # AI — Claude API (Phase 5)
    anthropic_api_key: str | None = None

    # Email (optional — if SMTP_HOST not set, emails are logged in dev mode)
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    from_email: str = "noreply@cbos.local"
    from_name: str = "CBOS Platform"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def email_enabled(self) -> bool:
        return self.smtp_host is not None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
