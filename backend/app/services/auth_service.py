from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import Usuario
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.user_repository = UserRepository(session)

    async def register(self, payload: RegisterRequest) -> TokenResponse:
        existing_user = await self.user_repository.get_by_email(payload.email)
        if existing_user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya esta registrado")

        user = Usuario(
            email=payload.email,
            password_hash=hash_password(payload.password),
            nombre=payload.nombre,
            apellido=payload.apellido,
        )
        created_user = await self.user_repository.create(user)
        return TokenResponse(
            access_token=create_access_token(str(created_user.id)),
            refresh_token=create_refresh_token(str(created_user.id)),
        )

    async def login(self, payload: LoginRequest) -> TokenResponse:
        user = await self.user_repository.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")
        if not user.activo:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")

        user.ultimo_login = datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(user)
        return TokenResponse(
            access_token=create_access_token(str(user.id)),
            refresh_token=create_refresh_token(str(user.id)),
        )
