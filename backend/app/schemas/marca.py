"""
Schemas de marcas.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class MarcaCreateRequest(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)


class MarcaUpdateRequest(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=100)
    activo: bool | None = None


class MarcaResponse(BaseModel):
    id: int
    nombre: str
    slug: str
    activo: bool
    fecha_creacion: datetime

    model_config = {"from_attributes": True}
