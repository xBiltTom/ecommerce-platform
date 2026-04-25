"""
Schemas de pagos.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class PagoCreateRequest(BaseModel):
    metodo: str = Field(..., pattern="^(tarjeta|transferencia|efectivo|paypal|otro)$")
    referencia_externa: str | None = Field(None, max_length=150)


class PagoResponse(BaseModel):
    id: str
    pedido_id: str
    metodo: str
    estado: str
    monto: float
    moneda: str
    referencia_externa: str | None = None
    fecha_pago: datetime | None = None
    fecha_creacion: datetime

    model_config = {"from_attributes": True}
