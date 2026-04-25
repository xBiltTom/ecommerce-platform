"""
Schemas de autenticación (login, registro, tokens).
"""

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Datos para registro de nuevo cliente."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    nombre: str = Field(..., min_length=1, max_length=100)
    apellido: str = Field(..., min_length=1, max_length=100)
    telefono: str | None = Field(None, max_length=30)


class LoginRequest(BaseModel):
    """Datos para inicio de sesión."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Respuesta con tokens de acceso y refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Request para renovar el access token."""
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    """Request para cambiar contraseña."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
