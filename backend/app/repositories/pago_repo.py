"""
Repositorio de acceso a datos para pagos.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pago import Pago


class PagoRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, pago_id: str) -> Pago | None:
        result = await self.db.execute(select(Pago).where(Pago.id == pago_id))
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Pago:
        pago = Pago(**kwargs)
        self.db.add(pago)
        await self.db.flush()
        return pago

    async def update(self, pago: Pago, **kwargs) -> Pago:
        for key, value in kwargs.items():
            if value is not None:
                setattr(pago, key, value)
        await self.db.flush()
        return pago

    async def list_by_pedido(self, pedido_id: str) -> list[Pago]:
        result = await self.db.execute(
            select(Pago).where(Pago.pedido_id == pedido_id).order_by(Pago.fecha_creacion.desc())
        )
        return list(result.scalars().all())
