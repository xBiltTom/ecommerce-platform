"""
Servicio de gestión de categorías.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundException, ConflictException
from app.repositories.categoria_repo import CategoriaRepository
from app.utils.slug import generate_slug


class CategoriaService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = CategoriaRepository(db)

    async def create(self, nombre: str, descripcion: str | None = None):
        slug = generate_slug(nombre)
        existing = await self.repo.get_by_slug(slug)
        if existing:
            raise ConflictException(f"Ya existe una categoría con el slug '{slug}'")

        return await self.repo.create(nombre=nombre, slug=slug, descripcion=descripcion)

    async def update(self, categoria_id: int, **kwargs):
        categoria = await self.repo.get_by_id(categoria_id)
        if not categoria:
            raise NotFoundException("Categoría no encontrada")

        if "nombre" in kwargs and kwargs["nombre"]:
            new_slug = generate_slug(kwargs["nombre"])
            existing = await self.repo.get_by_slug(new_slug)
            if existing and existing.id != categoria_id:
                raise ConflictException(f"Ya existe una categoría con el slug '{new_slug}'")
            kwargs["slug"] = new_slug

        return await self.repo.update(categoria, **kwargs)

    async def get(self, categoria_id: int):
        categoria = await self.repo.get_by_id(categoria_id)
        if not categoria:
            raise NotFoundException("Categoría no encontrada")
        return categoria

    async def list_all(self, page=1, page_size=50, solo_activos=True, activo: bool | None = None):
        return await self.repo.list_all(page, page_size, solo_activos, activo)

    async def soft_delete(self, categoria_id: int):
        categoria = await self.repo.get_by_id(categoria_id)
        if not categoria:
            raise NotFoundException("Categoría no encontrada")
        return await self.repo.update(categoria, activo=False)
