import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import decode_token
from app.models.user import RolUsuario, Usuario


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales invalidas",
    )

    try:
        payload = decode_token(token)
        user_id_raw = payload.get("sub")
        token_type = payload.get("typ")
        if not user_id_raw or token_type != "access":
            raise credentials_exception
        user_id = uuid.UUID(str(user_id_raw))
    except Exception as exc:
        raise credentials_exception from exc

    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.activo:
        raise credentials_exception

    return user


async def require_admin(current_user: Annotated[Usuario, Depends(get_current_user)]) -> Usuario:
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    return current_user
