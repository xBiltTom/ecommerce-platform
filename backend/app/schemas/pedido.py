"""
Schemas de pedidos.
"""

from datetime import datetime

from pydantic import BaseModel, Field
from app.schemas.pago import PagoGatewayResponse, PagoSimuladoRequest


class CheckoutRequest(BaseModel):
    """Request para crear un pedido desde el carrito activo."""
    direccion_id: int
    metodo_pago: str = Field(..., pattern="^(tarjeta|transferencia|efectivo|paypal|otro)$")
    comentario: str | None = None
    pago_simulado: PagoSimuladoRequest | None = None
    cupon_codigo: str | None = Field(None, max_length=50)


class PedidoItemResponse(BaseModel):
    id: int
    producto_id: int | None = None
    sku_producto: str
    nombre_producto: str
    cantidad: int
    precio_unitario: float
    subtotal: float

    model_config = {"from_attributes": True}


class PedidoHistorialResponse(BaseModel):
    id: int
    estado_anterior: str | None = None
    estado_nuevo: str
    comentario: str | None = None
    fecha_registro: datetime

    model_config = {"from_attributes": True}


class PedidoResponse(BaseModel):
    id: str
    nombre_destinatario: str
    direccion_envio: str
    ciudad_envio: str
    pais_envio: str
    subtotal: float
    descuento: float
    costo_envio: float
    total: float
    estado: str
    items: list[PedidoItemResponse] = []
    pago: PagoGatewayResponse | None = None
    fecha_creacion: datetime

    model_config = {"from_attributes": True}


class PedidoListResponse(BaseModel):
    """Versión reducida para listados."""
    id: str
    total: float
    estado: str
    fecha_creacion: datetime
    total_items: int = 0

    model_config = {"from_attributes": True}


class PedidoEstadoRequest(BaseModel):
    """Request para cambiar estado de un pedido (admin)."""
    estado: str = Field(
        ...,
        pattern="^(pendiente|pagado|en_preparacion|enviado|entregado|cancelado)$",
    )
    comentario: str | None = None
