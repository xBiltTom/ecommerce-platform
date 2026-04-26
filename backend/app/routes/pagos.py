"""
Rutas de pagos.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.usuario import Usuario
from app.schemas.pago import PagoCreateRequest, PagoResponse
from app.services.pago_service import PagoService

router = APIRouter(prefix="/pedidos", tags=["Pagos"])


@router.post("/{pedido_id}/pagar", response_model=PagoResponse)
async def pagar_pedido(
    pedido_id: str,
    body: PagoCreateRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PagoService(db)
    pago = await service.create_pago(
        pedido_id,
        current_user.id,
        body.metodo,
        body.referencia_externa,
        body.simulacion.model_dump(exclude_none=True) if body.simulacion else None,
    )
    return PagoResponse.model_validate(pago)


@router.get("/{pedido_id}/pagos", response_model=list[PagoResponse])
async def list_pagos(
    pedido_id: str,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PagoService(db)
    return await service.list_by_pedido(pedido_id)
