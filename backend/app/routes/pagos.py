"""
Rutas de pagos.
"""

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.usuario import Usuario
from app.schemas.pago import (
    PagoConfirmacionRequest,
    PagoGatewayResponse,
    StripeCheckoutRequest,
    StripeCheckoutResponse,
)
from app.services.pago_service import PagoService

router = APIRouter(prefix="/pedidos", tags=["Pagos"])


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="stripe-signature"),
    db: AsyncSession = Depends(get_db),
):
    payload = await request.body()
    service = PagoService(db)
    event = service.construct_webhook_event(payload, stripe_signature)
    return await service.process_webhook_event(event)


@router.post("/{pedido_id}/stripe/checkout", response_model=StripeCheckoutResponse)
async def create_stripe_checkout(
    pedido_id: str,
    body: StripeCheckoutRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PagoService(db)
    result = await service.create_checkout_session(
        pedido_id,
        current_user.id,
        body.success_url,
        body.cancel_url,
    )
    return StripeCheckoutResponse.model_validate(result)


@router.post("/{pedido_id}/stripe/confirmar", response_model=PagoGatewayResponse)
async def confirm_stripe_payment(
    pedido_id: str,
    body: PagoConfirmacionRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PagoService(db)
    pago = await service.confirm_payment(pedido_id, current_user.id, body.stripe_session_id)
    return PagoGatewayResponse.model_validate(service.build_gateway_response(pago))


@router.get("/{pedido_id}/pagos", response_model=list[PagoGatewayResponse])
async def list_pagos(
    pedido_id: str,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = PagoService(db)
    pagos = await service.list_by_pedido(pedido_id)
    return [PagoGatewayResponse.model_validate(service.build_gateway_response(pago)) for pago in pagos]
