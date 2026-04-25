"""
Schemas de inventario.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class AjusteInventarioRequest(BaseModel):
    """Request para ajuste manual de stock (admin)."""
    producto_id: int
    tipo: str = Field(..., pattern="^(entrada|salida|ajuste)$")
    cantidad: int = Field(..., gt=0)
    motivo: str = Field(..., min_length=1)


class MovimientoInventarioResponse(BaseModel):
    id: int
    producto_id: int
    producto_nombre: str | None = None
    tipo: str
    cantidad: int
    stock_fisico_anterior: int
    stock_fisico_nuevo: int
    stock_reservado_anterior: int
    stock_reservado_nuevo: int
    motivo: str | None = None
    fecha_creacion: datetime

    model_config = {"from_attributes": True}
