"""
Repositorio de acceso a datos para marcas.
"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.marca import Marca


class MarcaRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, marca_id: int) -> Marca | None:
        result = await self.db.execute(select(Marca).where(Marca.id == marca_id))
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Marca | None:
        result = await self.db.execute(select(Marca).where(Marca.slug == slug))
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Marca:
        marca = Marca(**kwargs)
        self.db.add(marca)
        await self.db.flush()
        return marca

    async def update(self, marca: Marca, **kwargs) -> Marca:
        for key, value in kwargs.items():
            if value is not None:
                setattr(marca, key, value)
        await self.db.flush()
        return marca

    async def list_all(
        self, page: int = 1, page_size: int = 50, solo_activos: bool = True
    ) -> tuple[list[Marca], int]:
        query = select(Marca)
        count_query = select(func.count()).select_from(Marca)

        if solo_activos:
            query = query.where(Marca.activo == True)  # noqa: E712
            count_query = count_query.where(Marca.activo == True)  # noqa: E712

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(Marca.nombre.asc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total
