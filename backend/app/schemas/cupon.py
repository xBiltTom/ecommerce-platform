"""
Schemas Pydantic para cupones de descuento.
"""

from datetime import datetime
from pydantic import BaseModel, Field


class CuponCreateRequest(BaseModel):
    """Request para crear un cupón de descuento (admin)."""
    codigo: str = Field(..., min_length=3, max_length=50)
    tipo_descuento: str = Field(..., pattern="^(porcentaje|monto_fijo)$")
    valor: float = Field(..., gt=0)
    dias_expiracion: int = Field(..., ge=1, le=365)


class CuponResponse(BaseModel):
    """Respuesta con datos de un cupón."""
    id: str
    codigo: str
    tipo_descuento: str
    valor: float
    fecha_expiracion: datetime
    usado: bool
    pedido_id: str | None = None
    fecha_uso: datetime | None = None
    creado_por: str
    fecha_creacion: datetime

    model_config = {"from_attributes": True}


class CuponAplicarRequest(BaseModel):
    """Request para aplicar un cupón a un pedido."""
    codigo: str = Field(..., min_length=1, max_length=50)


class CuponAplicarResponse(BaseModel):
    """Respuesta tras aplicar un cupón."""
    descuento_aplicado: float
    nuevo_total: float
    tipo_descuento: str
    valor: float
    mensaje: str
