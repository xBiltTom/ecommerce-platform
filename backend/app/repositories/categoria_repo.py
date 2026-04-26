"""
Repositorio de acceso a datos para categorías.
"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.categoria import Categoria


class CategoriaRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, categoria_id: int) -> Categoria | None:
        result = await self.db.execute(select(Categoria).where(Categoria.id == categoria_id))
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Categoria | None:
        result = await self.db.execute(select(Categoria).where(Categoria.slug == slug))
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Categoria:
        categoria = Categoria(**kwargs)
        self.db.add(categoria)
        await self.db.flush()
        return categoria

    async def update(self, categoria: Categoria, **kwargs) -> Categoria:
        for key, value in kwargs.items():
            if value is not None:
                setattr(categoria, key, value)
        await self.db.flush()
        return categoria

    async def list_all(self, page: int = 1, page_size: int = 50, solo_activos: bool = True, activo: bool | None = None) -> tuple[list[Categoria], int]:
        query = select(Categoria)
        count_query = select(func.count()).select_from(Categoria)

        if activo is not None:
            query = query.where(Categoria.activo == activo)
            count_query = count_query.where(Categoria.activo == activo)
        elif solo_activos:
            query = query.where(Categoria.activo == True)
            count_query = count_query.where(Categoria.activo == True)  # noqa: E712

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(Categoria.nombre.asc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total
