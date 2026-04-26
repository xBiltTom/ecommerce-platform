"""
Rutas de autenticación.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.usuario import Usuario
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ChangePasswordRequest,
)
from app.schemas.usuario import UsuarioResponse, UsuarioUpdateRequest
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService
from app.services.usuario_service import UsuarioService

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/register", response_model=MessageResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    await service.register(
        email=body.email,
        password=body.password,
        nombre=body.nombre,
        apellido=body.apellido,
        telefono=body.telefono,
    )
    return MessageResponse(message="Usuario registrado exitosamente")


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.login(
        email=body.email,
        password=body.password,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    return TokenResponse(**result)


@router.post("/refresh")
async def refresh(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.refresh(body.refresh_token)
    return result


@router.post("/logout", response_model=MessageResponse)
async def logout(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    await service.logout(body.refresh_token)
    return MessageResponse(message="Sesión cerrada exitosamente")


@router.get("/me", response_model=UsuarioResponse)
async def get_me(current_user: Usuario = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UsuarioResponse)
async def update_me(
    body: UsuarioUpdateRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = UsuarioService(db)
    return await service.update_profile(
        current_user.id,
        email=body.email,
        nombre=body.nombre,
        apellido=body.apellido,
        telefono=body.telefono,
    )


@router.put("/me/password", response_model=MessageResponse)
async def change_password(
    body: ChangePasswordRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    await service.change_password(current_user.id, body.current_password, body.new_password)
    return MessageResponse(message="Contraseña actualizada exitosamente")
