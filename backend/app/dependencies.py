"""
Dependencies de FastAPI para autenticación y autorización.
"""

from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions import UnauthorizedException, ForbiddenException
from app.models.usuario import Usuario
from app.repositories.usuario_repo import UsuarioRepository
from app.utils.security import decode_token

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    """Obtiene el usuario autenticado a partir del JWT."""
    if not credentials:
        raise UnauthorizedException("Token de acceso requerido")

    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise UnauthorizedException("Token inválido o expirado")

    if payload.get("type") != "access":
        raise UnauthorizedException("Token no es de tipo access")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Token sin identificador de usuario")

    repo = UsuarioRepository(db)
    usuario = await repo.get_by_id(user_id)
    if not usuario:
        raise UnauthorizedException("Usuario no encontrado")
    if not usuario.activo:
        raise UnauthorizedException("Cuenta desactivada")

    return usuario


async def require_admin(
    current_user: Usuario = Depends(get_current_user),
) -> Usuario:
    """Verifica que el usuario autenticado sea admin."""
    if current_user.rol != "admin":
        raise ForbiddenException("Se requiere rol de administrador")
    return current_user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Usuario | None:
    """Retorna el usuario si está autenticado, None si no."""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            return None
        repo = UsuarioRepository(db)
        return await repo.get_by_id(payload.get("sub", ""))
    except Exception:
        return None
