"""
Repositorio de acceso a datos para inventario y auditoría.
"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventario import MovimientoInventario
from app.models.auditoria import AdminAuditoria


class InventarioRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_movimiento(self, **kwargs) -> MovimientoInventario:
        mov = MovimientoInventario(**kwargs)
        self.db.add(mov)
        await self.db.flush()
        return mov

    async def list_movimientos(
        self, page: int = 1, page_size: int = 20, producto_id: int | None = None
    ) -> tuple[list[MovimientoInventario], int]:
        query = select(MovimientoInventario)
        count_query = select(func.count()).select_from(MovimientoInventario)

        if producto_id:
            query = query.where(MovimientoInventario.producto_id == producto_id)
            count_query = count_query.where(MovimientoInventario.producto_id == producto_id)

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(MovimientoInventario.fecha_creacion.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total


class AdminAuditoriaRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs) -> AdminAuditoria:
        audit = AdminAuditoria(**kwargs)
        self.db.add(audit)
        await self.db.flush()
        return audit

    async def list_all(
        self, page: int = 1, page_size: int = 20
    ) -> tuple[list[AdminAuditoria], int]:
        count_query = select(func.count()).select_from(AdminAuditoria)
        total = (await self.db.execute(count_query)).scalar() or 0

        query = (
            select(AdminAuditoria)
            .order_by(AdminAuditoria.fecha_creacion.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all()), total
