"""
Rutas de pedidos.
"""

import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.usuario import Usuario
from app.schemas.pedido import (
    CheckoutRequest, PedidoResponse, PedidoListResponse,
    PedidoItemResponse,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.pedido_service import PedidoService
from app.services.cupon_service import CuponService

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


def _build_response(p, pago: dict | None = None) -> dict:
    return {
        "id": p.id, "nombre_destinatario": p.nombre_destinatario,
        "direccion_envio": p.direccion_envio, "ciudad_envio": p.ciudad_envio,
        "pais_envio": p.pais_envio, "subtotal": float(p.subtotal),
        "descuento": float(p.descuento), "costo_envio": float(p.costo_envio),
        "total": float(p.total), "estado": p.estado, "pago": pago,
        "items": [PedidoItemResponse.model_validate(i) for i in (p.items or [])],
        "fecha_creacion": p.fecha_creacion,
    }


def _build_list_response(p) -> dict:
    return {
        "id": p.id, "total": float(p.total), "estado": p.estado,
        "fecha_creacion": p.fecha_creacion,
        "total_items": len(p.items) if p.items else 0,
    }


@router.post("", response_model=PedidoResponse, status_code=201)
async def checkout(
    body: CheckoutRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pedido_service = PedidoService(db)
    pedido = await pedido_service.checkout(
        current_user.id, body.direccion_id, body.comentario,
    )

    # Aplicar cupón si se proporcionó
    if body.cupon_codigo:
        cupon_service = CuponService(db)
        await cupon_service.aplicar_cupon_a_pedido(
            pedido.id, body.cupon_codigo, current_user.id
        )

    # Refrescar pedido para obtener descuento aplicado
    pedido = await pedido_service.get_detail(pedido.id)
    return PedidoResponse(**_build_response(pedido))


@router.get("", response_model=PaginatedResponse[PedidoListResponse])
async def list_pedidos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PedidoService(db)
    items, total = await service.list_by_user(current_user.id, page, page_size)
    return PaginatedResponse(
        items=[PedidoListResponse(**_build_list_response(p)) for p in items],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/{pedido_id}", response_model=PedidoResponse)
async def get_pedido(
    pedido_id: str,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PedidoService(db)
    pago_service = PagoService(db)
    pedido = await service.get_detail(pedido_id, current_user.id)
    pagos = await pago_service.list_by_pedido(pedido.id)
    latest_pago = pago_service.build_gateway_response(pagos[0]) if pagos else None
    return PedidoResponse(**_build_response(pedido, latest_pago))


@router.post("/{pedido_id}/cancelar", response_model=MessageResponse)
async def cancel_pedido(
    pedido_id: str,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PedidoService(db)
    await service.cancel_by_user(pedido_id, current_user.id)
    return MessageResponse(message="Pedido cancelado")
