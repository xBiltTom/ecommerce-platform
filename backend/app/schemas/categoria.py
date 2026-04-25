"""
Schemas de categorías.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class CategoriaCreateRequest(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    descripcion: str | None = None


class CategoriaUpdateRequest(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=100)
    descripcion: str | None = None
    activo: bool | None = None


class CategoriaResponse(BaseModel):
    id: int
    nombre: str
    slug: str
    descripcion: str | None = None
    activo: bool
    fecha_creacion: datetime

    model_config = {"from_attributes": True}
