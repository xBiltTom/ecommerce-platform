"""
Servicio de autenticación: registro, login, refresh, logout.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.exceptions import (
    ConflictException,
    UnauthorizedException,
    BadRequestException,
)
from app.models.sesion import SesionUsuario
from app.repositories.usuario_repo import UsuarioRepository
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
)


class AuthService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.usuario_repo = UsuarioRepository(db)

    async def register(
        self,
        email: str,
        password: str,
        nombre: str,
        apellido: str,
        telefono: str | None = None,
    ) -> dict:
        existing = await self.usuario_repo.get_by_email(email)
        if existing:
            raise ConflictException("Ya existe un usuario con este email")

        usuario = await self.usuario_repo.create(
            email=email,
            password_hash=hash_password(password),
            nombre=nombre,
            apellido=apellido,
            telefono=telefono,
            rol="cliente",
        )
        return {"id": usuario.id, "email": usuario.email, "nombre": usuario.nombre}

    async def login(
        self, email: str, password: str, user_agent: str | None = None, ip: str | None = None
    ) -> dict:
        usuario = await self.usuario_repo.get_by_email(email)
        if not usuario or not verify_password(password, usuario.password_hash):
            raise UnauthorizedException("Credenciales inválidas")

        if not usuario.activo:
            raise UnauthorizedException("Cuenta desactivada. Contacte al administrador.")

        # Crear tokens
        token_data = {"sub": usuario.id, "rol": usuario.rol}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        # Guardar sesión con refresh token hasheado
        sesion = SesionUsuario(
            usuario_id=usuario.id,
            refresh_token_hash=hash_token(refresh_token),
            user_agent=user_agent,
            ip_address=ip,
            expira_en=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        self.db.add(sesion)

        # Actualizar último login
        await self.usuario_repo.update_last_login(usuario)
        await self.db.flush()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }

    async def refresh(self, refresh_token: str) -> dict:
        try:
            payload = decode_token(refresh_token)
        except Exception:
            raise UnauthorizedException("Refresh token inválido o expirado")

        if payload.get("type") != "refresh":
            raise UnauthorizedException("Token no es de tipo refresh")

        token_hash = hash_token(refresh_token)

        # Buscar sesión activa
        from sqlalchemy import select

        result = await self.db.execute(
            select(SesionUsuario).where(
                SesionUsuario.refresh_token_hash == token_hash,
                SesionUsuario.revocado_en.is_(None),
            )
        )
        sesion = result.scalar_one_or_none()
        if not sesion:
            raise UnauthorizedException("Sesión no encontrada o revocada")

        if sesion.expira_en < datetime.now(timezone.utc):
            raise UnauthorizedException("Refresh token expirado")

        # Generar nuevo access token
        usuario = await self.usuario_repo.get_by_id(payload["sub"])
        if not usuario or not usuario.activo:
            raise UnauthorizedException("Usuario no encontrado o inactivo")

        token_data = {"sub": usuario.id, "rol": usuario.rol}
        new_access_token = create_access_token(token_data)

        return {"access_token": new_access_token, "token_type": "bearer"}

    async def logout(self, refresh_token: str) -> None:
        token_hash = hash_token(refresh_token)

        from sqlalchemy import select

        result = await self.db.execute(
            select(SesionUsuario).where(
                SesionUsuario.refresh_token_hash == token_hash,
                SesionUsuario.revocado_en.is_(None),
            )
        )
        sesion = result.scalar_one_or_none()
        if sesion:
            sesion.revocado_en = datetime.now(timezone.utc)
            await self.db.flush()

    async def change_password(
        self, usuario_id: str, current_password: str, new_password: str
    ) -> None:
        usuario = await self.usuario_repo.get_by_id(usuario_id)
        if not usuario:
            raise UnauthorizedException("Usuario no encontrado")

        if not verify_password(current_password, usuario.password_hash):
            raise BadRequestException("La contraseña actual es incorrecta")

        usuario.password_hash = hash_password(new_password)
        await self.db.flush()
