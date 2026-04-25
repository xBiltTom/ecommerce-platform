"""
Servicio de gestión de marcas.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundException, ConflictException
from app.repositories.marca_repo import MarcaRepository
from app.utils.slug import generate_slug


class MarcaService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = MarcaRepository(db)

    async def create(self, nombre: str):
        slug = generate_slug(nombre)
        existing = await self.repo.get_by_slug(slug)
        if existing:
            raise ConflictException(f"Ya existe una marca con el slug '{slug}'")
        return await self.repo.create(nombre=nombre, slug=slug)

    async def update(self, marca_id: int, **kwargs):
        marca = await self.repo.get_by_id(marca_id)
        if not marca:
            raise NotFoundException("Marca no encontrada")

        if "nombre" in kwargs and kwargs["nombre"]:
            new_slug = generate_slug(kwargs["nombre"])
            existing = await self.repo.get_by_slug(new_slug)
            if existing and existing.id != marca_id:
                raise ConflictException(f"Ya existe una marca con el slug '{new_slug}'")
            kwargs["slug"] = new_slug

        return await self.repo.update(marca, **kwargs)

    async def get(self, marca_id: int):
        marca = await self.repo.get_by_id(marca_id)
        if not marca:
            raise NotFoundException("Marca no encontrada")
        return marca

    async def list_all(self, page=1, page_size=50, solo_activos=True):
        return await self.repo.list_all(page, page_size, solo_activos)

    async def soft_delete(self, marca_id: int):
        marca = await self.repo.get_by_id(marca_id)
        if not marca:
            raise NotFoundException("Marca no encontrada")
        return await self.repo.update(marca, activo=False)
