"""
Configuración del engine y sesiones async de SQLAlchemy.
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


import sys
from sqlalchemy import pool

kwargs = {
    "echo": settings.ENVIRONMENT == "development",
    "pool_pre_ping": True,
}

# Deshabilitar connection pooling en tests para evitar problemas con pytest-asyncio event loops
if "pytest" in sys.modules:
    kwargs["poolclass"] = pool.NullPool
else:
    kwargs["pool_size"] = 10
    kwargs["max_overflow"] = 20

engine = create_async_engine(
    settings.DATABASE_URL,
    **kwargs
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Clase base para todos los modelos ORM."""
    pass


async def get_db():
    """Dependency que provee una sesión de BD por request."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
