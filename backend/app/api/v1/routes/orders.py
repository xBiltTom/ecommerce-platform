from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db_session
from app.models.order import Pedido
from app.models.user import Usuario
from app.schemas.order import OrderResponse


router = APIRouter()


@router.get("", response_model=list[OrderResponse])
async def get_my_orders(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> list[OrderResponse]:
    result = await db.execute(
        select(Pedido).where(Pedido.usuario_id == current_user.id).order_by(Pedido.fecha_creacion.desc()).limit(50)
    )
    orders = result.scalars().all()
    return [OrderResponse(id=str(order.id), estado=order.estado.value, total=float(order.total)) for order in orders]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_my_order_detail(
    order_id: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> OrderResponse:
    result = await db.execute(select(Pedido).where(Pedido.id == order_id, Pedido.usuario_id == current_user.id))
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")
    return OrderResponse(id=str(order.id), estado=order.estado.value, total=float(order.total))


@router.post("/checkout", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def checkout_placeholder(
    _: Annotated[AsyncSession, Depends(get_db_session)],
    __: Annotated[Usuario, Depends(get_current_user)],
) -> OrderResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Checkout sera implementado en la siguiente iteracion con transacciones e inventario reservado",
    )
