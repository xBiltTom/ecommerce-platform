"""
Schemas de pagos.
"""

from typing import Any
from datetime import datetime

from pydantic import BaseModel, Field


class StripeCheckoutRequest(BaseModel):
    success_url: str = Field(..., max_length=500)
    cancel_url: str = Field(..., max_length=500)


class StripeCheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str
    pedido_id: str


class PagoConfirmacionRequest(BaseModel):
    stripe_session_id: str = Field(..., max_length=255)


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


class PagoGatewayResponse(BaseModel):
    id: str
    pedido_id: str
    metodo: str
    estado: str
    monto: float
    moneda: str
    referencia_externa: str | None = None
    fecha_pago: datetime | None = None
    pasarela: str | None = None
    codigo_autorizacion: str | None = None
    resumen: str | None = None
    ultimos4: str | None = None
    detalle: dict[str, Any] | None = None
