"""
Schemas de direcciones.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class DireccionCreateRequest(BaseModel):
    titulo: str = Field("Casa", max_length=50)
    destinatario_nombre: str | None = Field(None, max_length=120)
    telefono_contacto: str | None = Field(None, max_length=30)
    direccion: str = Field(..., min_length=1)
    ciudad: str = Field(..., min_length=1, max_length=100)
    pais: str = Field(..., min_length=1, max_length=100)
    codigo_postal: str | None = Field(None, max_length=20)
    referencia: str | None = None
    es_principal: bool = False


class DireccionUpdateRequest(BaseModel):
    titulo: str | None = Field(None, max_length=50)
    destinatario_nombre: str | None = Field(None, max_length=120)
    telefono_contacto: str | None = Field(None, max_length=30)
    direccion: str | None = None
    ciudad: str | None = Field(None, max_length=100)
    pais: str | None = Field(None, max_length=100)
    codigo_postal: str | None = Field(None, max_length=20)
    referencia: str | None = None


class DireccionResponse(BaseModel):
    id: int
    titulo: str
    destinatario_nombre: str | None = None
    telefono_contacto: str | None = None
    direccion: str
    ciudad: str
    pais: str
    codigo_postal: str | None = None
    referencia: str | None = None
    es_principal: bool
    fecha_creacion: datetime

    model_config = {"from_attributes": True}
