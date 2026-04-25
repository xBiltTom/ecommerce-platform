"""
Servicio de gestión de usuarios (perfil y admin).
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundException
from app.repositories.usuario_repo import UsuarioRepository


class UsuarioService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UsuarioRepository(db)

    async def get_profile(self, usuario_id: str):
        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario

    async def update_profile(self, usuario_id: str, **kwargs):
        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return await self.repo.update(usuario, **kwargs)

    async def list_users(self, page=1, page_size=20, rol=None, activo=None, buscar=None):
        return await self.repo.list_all(page, page_size, rol, activo, buscar)

    async def get_user_detail(self, usuario_id: str):
        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario

    async def toggle_estado(self, usuario_id: str, activo: bool):
        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return await self.repo.update(usuario, activo=activo)
