"""
Repositorio de acceso a datos para direcciones.
"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.direccion import Direccion


class DireccionRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, direccion_id: int) -> Direccion | None:
        result = await self.db.execute(select(Direccion).where(Direccion.id == direccion_id))
        return result.scalar_one_or_none()

    async def get_by_id_and_user(self, direccion_id: int, usuario_id: str) -> Direccion | None:
        result = await self.db.execute(
            select(Direccion).where(Direccion.id == direccion_id, Direccion.usuario_id == usuario_id)
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Direccion:
        direccion = Direccion(**kwargs)
        self.db.add(direccion)
        await self.db.flush()
        return direccion

    async def update(self, direccion: Direccion, **kwargs) -> Direccion:
        for key, value in kwargs.items():
            if value is not None:
                setattr(direccion, key, value)
        await self.db.flush()
        return direccion

    async def delete(self, direccion: Direccion) -> None:
        await self.db.delete(direccion)
        await self.db.flush()

    async def list_by_user(self, usuario_id: str) -> list[Direccion]:
        result = await self.db.execute(
            select(Direccion)
            .where(Direccion.usuario_id == usuario_id)
            .order_by(Direccion.es_principal.desc(), Direccion.fecha_creacion.desc())
        )
        return list(result.scalars().all())

    async def unset_principal(self, usuario_id: str) -> None:
        """Quita la marca de principal de todas las direcciones del usuario."""
        result = await self.db.execute(
            select(Direccion).where(
                Direccion.usuario_id == usuario_id, Direccion.es_principal == True  # noqa: E712
            )
        )
        for d in result.scalars().all():
            d.es_principal = False
        await self.db.flush()
