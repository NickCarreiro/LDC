from functools import lru_cache
from pathlib import Path

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    app_env: str = "local"
    database_url: str = "postgresql+psycopg://ldc:ldc_dev_password@localhost:5432/ldc"
    backend_cors_origins: str = "http://localhost:3000"
    field_encryption_key: str = Field(default="")

    oidc_issuer: str = "http://localhost:8080/realms/ldc"
    oidc_audience: str = "ldc-api"
    dev_auth_enabled: bool = True

    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_from: str = "organizers@example.org"

    @property
    def cors_origins(self) -> list[str | AnyHttpUrl]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
