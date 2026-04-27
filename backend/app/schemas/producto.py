"""
Schemas de productos.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class EspecificacionSchema(BaseModel):
    clave: str = Field(..., min_length=1, max_length=100)
    valor: str = Field(..., min_length=1, max_length=255)


class ProductoCreateRequest(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50)
    nombre: str = Field(..., min_length=1, max_length=255)
    descripcion: str | None = None
    precio: float = Field(..., ge=0)
    precio_oferta: float | None = Field(None, ge=0)
    stock_fisico: int = Field(0, ge=0)
    stock_minimo: int = Field(0, ge=0)
    categoria_id: int | None = None
    marca_id: int | None = None
    imagen_url: str | None = None
    especificaciones: list[EspecificacionSchema] | None = None


class ProductoUpdateRequest(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=255)
    descripcion: str | None = None
    precio: float | None = Field(None, ge=0)
    precio_oferta: float | None = Field(None, ge=0)
    stock_fisico: int | None = Field(None, ge=0)
    stock_minimo: int | None = Field(None, ge=0)
    categoria_id: int | None = None
    marca_id: int | None = None
    imagen_url: str | None = None
    activo: bool | None = None
    especificaciones: list[EspecificacionSchema] | None = None


class ProductoResponse(BaseModel):
    id: int
    sku: str
    nombre: str
    slug: str
    descripcion: str | None = None
    precio: float
    precio_oferta: float | None = None
    stock_fisico: int
    stock_reservado: int
    stock_disponible: int
    stock_minimo: int
    categoria_id: int | None = None
    marca_id: int | None = None
    categoria_nombre: str | None = None
    marca_nombre: str | None = None
    imagen_url: str | None = None
    activo: bool
    especificaciones: list[EspecificacionSchema] = []
    fecha_creacion: datetime

    model_config = {"from_attributes": True}


class ProductoListResponse(BaseModel):
    """Versión reducida para listados."""
    id: int
    sku: str
    nombre: str
    slug: str
    precio: float
    precio_oferta: float | None = None
    stock_disponible: int
    stock_minimo: int
    categoria_nombre: str | None = None
    marca_nombre: str | None = None
    imagen_url: str | None = None
    activo: bool

    model_config = {"from_attributes": True}
