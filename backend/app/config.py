"""
Configuración centralizada de la aplicación.
Usa pydantic-settings para cargar variables de entorno desde .env.
"""

import os
from pathlib import Path
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
    STRIPE_BUSINESS_NAME: str = "Ecommerce Platform"
    STRIPE_CHECKOUT_LOCALE: str = "es"

    # ── Uploads ────────────────────────────────────────────
    UPLOAD_DIR: str = "static/uploads/productos"
    ALLOWED_IMAGE_EXTENSIONS: set[str] = {"jpg", "jpeg", "png", "webp"}
    MAX_IMAGE_SIZE_MB: int = 5

    # ── CORS ───────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:4200", "http://localhost:3000"]

    @property
    def upload_path(self) -> Path:
        """Ruta absoluta al directorio de uploads."""
        base = Path(os.path.dirname(os.path.dirname(__file__)))
        return base / self.UPLOAD_DIR

    @property
    def max_image_bytes(self) -> int:
        return self.MAX_IMAGE_SIZE_MB * 1024 * 1024

    @property
    def database_url_sync(self) -> str:
        """URL de BD con driver síncrono (para Alembic)."""
        return self.DATABASE_URL.replace("+asyncpg", "+psycopg2")


settings = Settings()
