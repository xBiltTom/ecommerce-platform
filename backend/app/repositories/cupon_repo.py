"""
Repositorio de acceso a datos para cupones de descuento.
"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import lazyload

from app.models.cupon import CuponDescuento


class CuponRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, cupon_id: str) -> CuponDescuento | None:
        result = await self.db.execute(select(CuponDescuento).where(CuponDescuento.id == cupon_id))
        return result.scalar_one_or_none()

    async def get_by_codigo(self, codigo: str) -> CuponDescuento | None:
        result = await self.db.execute(
            select(CuponDescuento)
            .where(func.lower(CuponDescuento.codigo) == func.lower(codigo))
        )
        return result.scalar_one_or_none()

    async def get_by_codigo_for_update(self, codigo: str) -> CuponDescuento | None:
        """Obtiene un cupón bloqueando la fila para evitar race conditions."""
        result = await self.db.execute(
            select(CuponDescuento)
            .options(lazyload(CuponDescuento.creador))
            .where(func.lower(CuponDescuento.codigo) == func.lower(codigo))
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> CuponDescuento:
        cupon = CuponDescuento(**kwargs)
        self.db.add(cupon)
        await self.db.flush()
        return cupon

    async def update(self, cupon: CuponDescuento, **kwargs) -> CuponDescuento:
        for key, value in kwargs.items():
            if value is not None:
                setattr(cupon, key, value)
        await self.db.flush()
        return cupon

    async def list_all(
        self, page: int = 1, page_size: int = 20
    ) -> tuple[list[CuponDescuento], int]:
        query = select(CuponDescuento).order_by(CuponDescuento.fecha_creacion.desc())
        count_query = select(func.count()).select_from(CuponDescuento)

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total
