"""
Repositorio de acceso a datos para carritos.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.carrito import Carrito, CarritoItem


class CarritoRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    def _query_with_items(self):
        return (
            select(Carrito)
            .options(selectinload(Carrito.items).selectinload(CarritoItem.producto))
            .execution_options(populate_existing=True)
        )

    async def get_by_id(self, carrito_id: int) -> Carrito | None:
        result = await self.db.execute(
            self._query_with_items().where(Carrito.id == carrito_id)
        )
        return result.scalar_one_or_none()

    async def get_active_by_user(self, usuario_id: str) -> Carrito | None:
        result = await self.db.execute(
            self._query_with_items().where(
                Carrito.usuario_id == usuario_id,
                Carrito.estado == "activo",
            )
        )
        return result.scalar_one_or_none()

    async def create(self, usuario_id: str) -> Carrito:
        carrito = Carrito(usuario_id=usuario_id, estado="activo")
        self.db.add(carrito)
        await self.db.flush()
        return carrito

    async def get_or_create_active(self, usuario_id: str) -> Carrito:
        carrito = await self.get_active_by_user(usuario_id)
        if carrito:
            return carrito
        carrito = await self.create(usuario_id)
        loaded_carrito = await self.get_by_id(carrito.id)
        if loaded_carrito:
            return loaded_carrito
        return carrito

    async def finalize(self, carrito: Carrito) -> None:
        carrito.estado = "finalizado"
        await self.db.flush()

    # ── Items ──
    async def get_item(self, item_id: int, carrito_id: int) -> CarritoItem | None:
        result = await self.db.execute(
            select(CarritoItem).where(
                CarritoItem.id == item_id, CarritoItem.carrito_id == carrito_id
            )
        )
        return result.scalar_one_or_none()

    async def get_item_by_product(self, carrito_id: int, producto_id: int) -> CarritoItem | None:
        result = await self.db.execute(
            select(CarritoItem).where(
                CarritoItem.carrito_id == carrito_id,
                CarritoItem.producto_id == producto_id,
            )
        )
        return result.scalar_one_or_none()

    async def add_item(self, **kwargs) -> CarritoItem:
        item = CarritoItem(**kwargs)
        self.db.add(item)
        await self.db.flush()
        return item

    async def update_item(self, item: CarritoItem, **kwargs) -> CarritoItem:
        for key, value in kwargs.items():
            if value is not None:
                setattr(item, key, value)
        await self.db.flush()
        return item

    async def delete_item(self, item: CarritoItem) -> None:
        await self.db.delete(item)
        await self.db.flush()

    async def clear_items(self, carrito: Carrito) -> None:
        for item in list(carrito.items):
            await self.db.delete(item)
        await self.db.flush()
