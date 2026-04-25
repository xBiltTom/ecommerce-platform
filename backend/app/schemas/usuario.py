"""
Schemas de usuario (perfil, listados admin).
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UsuarioResponse(BaseModel):
    """Datos públicos de un usuario."""
    id: str
    email: EmailStr
    nombre: str
    apellido: str
    telefono: str | None = None
    rol: str
    activo: bool
    fecha_creacion: datetime

    model_config = {"from_attributes": True}


class UsuarioDetailResponse(UsuarioResponse):
    """Detalle de usuario para admin (incluye último login)."""
    ultimo_login: datetime | None = None
    fecha_actualizacion: datetime

    model_config = {"from_attributes": True}


class UsuarioUpdateRequest(BaseModel):
    """Datos actualizables del perfil."""
    nombre: str | None = Field(None, min_length=1, max_length=100)
    apellido: str | None = Field(None, min_length=1, max_length=100)
    telefono: str | None = Field(None, max_length=30)


class UsuarioEstadoRequest(BaseModel):
    """Request para activar/desactivar usuario (admin)."""
    activo: bool
