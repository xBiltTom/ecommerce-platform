"""
Servicio de gestión de direcciones.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundException, ForbiddenException
from app.repositories.direccion_repo import DireccionRepository


class DireccionService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DireccionRepository(db)

    async def create(self, usuario_id: str, data: dict):
        if data.get("es_principal"):
            await self.repo.unset_principal(usuario_id)

        return await self.repo.create(usuario_id=usuario_id, **data)

    async def update(self, direccion_id: int, usuario_id: str, data: dict):
        direccion = await self.repo.get_by_id_and_user(direccion_id, usuario_id)
        if not direccion:
            raise NotFoundException("Dirección no encontrada")

        filtered = {k: v for k, v in data.items() if v is not None}
        return await self.repo.update(direccion, **filtered)

    async def delete(self, direccion_id: int, usuario_id: str):
        direccion = await self.repo.get_by_id_and_user(direccion_id, usuario_id)
        if not direccion:
            raise NotFoundException("Dirección no encontrada")
        await self.repo.delete(direccion)

    async def list_by_user(self, usuario_id: str):
        return await self.repo.list_by_user(usuario_id)

    async def set_principal(self, direccion_id: int, usuario_id: str):
        direccion = await self.repo.get_by_id_and_user(direccion_id, usuario_id)
        if not direccion:
            raise NotFoundException("Dirección no encontrada")

        await self.repo.unset_principal(usuario_id)
        direccion.es_principal = True
        await self.db.flush()
        return direccion
