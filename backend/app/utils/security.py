"""
Utilidades de seguridad: hashing de contraseñas y manejo de JWT.
"""

import hashlib
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.config import settings

# ── Password hashing ──────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(plain: str) -> str:
    """Hashea una contraseña en texto plano con bcrypt."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verifica una contraseña contra su hash."""
    return pwd_context.verify(plain, hashed)


# ── JWT ────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Crea un JWT de acceso."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Crea un JWT de refresh."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decodifica y valida un JWT. Lanza jwt.PyJWTError si es inválido."""
    return jwt.decode(
        token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )


def hash_token(token: str) -> str:
    """Hashea un token con SHA-256 para almacenamiento seguro en BD."""
    return hashlib.sha256(token.encode()).hexdigest()
