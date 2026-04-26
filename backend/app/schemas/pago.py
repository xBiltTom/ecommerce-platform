"""
Schemas de pagos.
"""

from typing import Any
from datetime import datetime

from pydantic import BaseModel, Field


class PagoSimuladoRequest(BaseModel):
    titular: str | None = Field(None, max_length=120)
    numero_tarjeta: str | None = Field(None, max_length=32)
    vencimiento: str | None = Field(None, max_length=7)
    cvv: str | None = Field(None, max_length=4)
    email_pagador: str | None = Field(None, max_length=150)
    banco: str | None = Field(None, max_length=80)
    documento: str | None = Field(None, max_length=20)


class PagoCreateRequest(BaseModel):
    metodo: str = Field(..., pattern="^(tarjeta|transferencia|efectivo|paypal|otro)$")
    referencia_externa: str | None = Field(None, max_length=150)
    simulacion: PagoSimuladoRequest | None = None


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
