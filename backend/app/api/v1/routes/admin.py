from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_db_session
from app.models.order import Pedido
from app.models.product import Producto
from app.models.user import Usuario


class AdminKpiResponse(BaseModel):
    total_productos_activos: int
    total_pedidos: int
    venta_total: float


router = APIRouter()


@router.get("/kpis", response_model=AdminKpiResponse)
async def get_admin_kpis(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: Annotated[Usuario, Depends(require_admin)],
) -> AdminKpiResponse:
    products_result = await db.execute(select(func.count()).select_from(Producto).where(Producto.activo.is_(True)))
    orders_result = await db.execute(select(func.count()).select_from(Pedido))
    sales_result = await db.execute(select(func.coalesce(func.sum(Pedido.total), 0)).select_from(Pedido))

    return AdminKpiResponse(
        total_productos_activos=int(products_result.scalar_one() or 0),
        total_pedidos=int(orders_result.scalar_one() or 0),
        venta_total=float(sales_result.scalar_one() or 0),
    )
