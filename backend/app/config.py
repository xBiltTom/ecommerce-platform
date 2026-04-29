"""
Configuración centralizada de la aplicación.
Usa pydantic-settings para cargar variables de entorno desde .env.
"""

import json
import os
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración de la aplicación cargada desde variables de entorno."""

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Proyecto ──────────────────────────────────────────
    PROJECT_NAME: str = "Ecommerce Platform API"
    API_PREFIX: str = "/api/v1"
    API_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    ENABLE_DOCS: bool | None = None

    # ── Base de datos ─────────────────────────────────────
    DATABASE_URL: str

    # ── JWT ────────────────────────────────────────────────
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Stripe ─────────────────────────────────────────────
    STRIPE_SECRET_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None
    STRIPE_BUSINESS_NAME: str = "ProTech"
    STRIPE_CHECKOUT_LOCALE: str = "es"

    # ── Servidor ───────────────────────────────────────────
    BASE_URL: str = "http://localhost:8000"

    # ── Uploads ────────────────────────────────────────────
    UPLOAD_DIR: str = "static/uploads/productos"
    ALLOWED_IMAGE_EXTENSIONS: set[str] = {"jpg", "jpeg", "png", "webp"}
    MAX_IMAGE_SIZE_MB: int = 5

    # ── CORS ───────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:4200", "http://localhost:3000"]
    CORS_ORIGIN_REGEX: str | None = None
    TRUSTED_HOSTS: list[str] = ["localhost", "127.0.0.1"]
    GZIP_MINIMUM_SIZE: int = 1000

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Normaliza URLs de Postgres para usar asyncpg en runtime."""
        if not isinstance(value, str):
            return value

        normalized = value.strip()
        if normalized.startswith("postgres://"):
            return normalized.replace("postgres://", "postgresql+asyncpg://", 1)
        if normalized.startswith("postgresql://"):
            return normalized.replace("postgresql://", "postgresql+asyncpg://", 1)
        if normalized.startswith("postgresql+psycopg2://"):
            return normalized.replace("+psycopg2", "+asyncpg", 1)
        return normalized

    @field_validator("CORS_ORIGINS", "TRUSTED_HOSTS", mode="before")
    @classmethod
    def parse_list_env(cls, value: str | list[str]) -> str | list[str]:
        """Acepta listas JSON o valores separados por coma en variables de entorno."""
        if not isinstance(value, str):
            return value

        normalized = value.strip()
        if not normalized:
            return []
        if normalized.startswith("["):
            return json.loads(normalized)
        return [item.strip() for item in normalized.split(",") if item.strip()]

    @property
    def project_root(self) -> Path:
        return Path(os.path.dirname(os.path.dirname(__file__)))

    @property
    def static_path(self) -> Path:
        return self.project_root / "static"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def should_enable_docs(self) -> bool:
        if self.ENABLE_DOCS is not None:
            return self.ENABLE_DOCS
        return not self.is_production

    @property
    def upload_path(self) -> Path:
        """Ruta absoluta al directorio de uploads."""
        return self.project_root / self.UPLOAD_DIR

    @property
    def max_image_bytes(self) -> int:
        return self.MAX_IMAGE_SIZE_MB * 1024 * 1024

    @property
    def database_url_sync(self) -> str:
        """URL de BD con driver síncrono (para Alembic)."""
        if "+asyncpg" in self.DATABASE_URL:
            return self.DATABASE_URL.replace("+asyncpg", "+psycopg2", 1)
        if self.DATABASE_URL.startswith("postgresql://"):
            return self.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
        if self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
        return self.DATABASE_URL


settings = Settings()
