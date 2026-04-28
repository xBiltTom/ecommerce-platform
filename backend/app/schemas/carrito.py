"""
Schemas del carrito de compras.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class CarritoItemAddRequest(BaseModel):
    producto_id: int
    cantidad: int = Field(..., gt=0)


class CarritoItemUpdateRequest(BaseModel):
    cantidad: int = Field(..., gt=0)


class CarritoItemResponse(BaseModel):
    id: int
    producto_id: int
    producto_nombre: str | None = None
    producto_sku: str | None = None
    producto_imagen: str | None = None
    producto_stock_disponible: int | None = None
    cantidad: int
    precio_unitario: float
    subtotal: float
    fecha_creacion: datetime

    model_config = {"from_attributes": True}


class CarritoResponse(BaseModel):
    id: int
    estado: str
    items: list[CarritoItemResponse] = []
    total: float = 0.0
    fecha_creacion: datetime

    model_config = {"from_attributes": True}
