"""
Repositorio de acceso a datos para pedidos.
"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.pedido import Pedido, PedidoItem, PedidoHistorial


class PedidoRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, pedido_id: str) -> Pedido | None:
        result = await self.db.execute(select(Pedido).where(Pedido.id == pedido_id))
        return result.scalar_one_or_none()

    async def get_by_id_and_user(self, pedido_id: str, usuario_id: str) -> Pedido | None:
        result = await self.db.execute(
            select(Pedido)
            .options(selectinload(Pedido.items))
            .where(Pedido.id == pedido_id, Pedido.usuario_id == usuario_id)
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Pedido:
        pedido = Pedido(**kwargs)
        self.db.add(pedido)
        await self.db.flush()
        return pedido

    async def add_item(self, **kwargs) -> PedidoItem:
        item = PedidoItem(**kwargs)
        self.db.add(item)
        await self.db.flush()
        return item

    async def add_historial(self, **kwargs) -> PedidoHistorial:
        historial = PedidoHistorial(**kwargs)
        self.db.add(historial)
        await self.db.flush()
        return historial

    async def update(self, pedido: Pedido, **kwargs) -> Pedido:
        for key, value in kwargs.items():
            if value is not None:
                setattr(pedido, key, value)
        await self.db.flush()
        return pedido

    async def list_by_user(
        self, usuario_id: str, page: int = 1, page_size: int = 20
    ) -> tuple[list[Pedido], int]:
        query = select(Pedido).where(Pedido.usuario_id == usuario_id)
        count_query = select(func.count()).select_from(Pedido).where(Pedido.usuario_id == usuario_id)

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(Pedido.fecha_creacion.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def list_all(
        self,
        page: int = 1,
        page_size: int = 20,
        estado: str | None = None,
    ) -> tuple[list[Pedido], int]:
        query = select(Pedido)
        count_query = select(func.count()).select_from(Pedido)

        if estado:
            query = query.where(Pedido.estado == estado)
            count_query = count_query.where(Pedido.estado == estado)

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(Pedido.fecha_creacion.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def get_historial(self, pedido_id: str) -> list[PedidoHistorial]:
        result = await self.db.execute(
            select(PedidoHistorial)
            .where(PedidoHistorial.pedido_id == pedido_id)
            .order_by(PedidoHistorial.fecha_registro.asc())
        )
        return list(result.scalars().all())
