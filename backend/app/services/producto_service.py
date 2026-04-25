"""
Servicio de gestión de productos.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundException, ConflictException
from app.repositories.producto_repo import ProductoRepository
from app.utils.slug import generate_slug


class ProductoService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProductoRepository(db)

    async def create(self, data: dict):
        # Verificar SKU único
        existing = await self.repo.get_by_sku(data["sku"])
        if existing:
            raise ConflictException(f"Ya existe un producto con el SKU '{data['sku']}'")

        slug = generate_slug(data["nombre"])
        existing_slug = await self.repo.get_by_slug(slug)
        if existing_slug:
            slug = f"{slug}-{data['sku'].lower()}"

        especificaciones = data.pop("especificaciones", None)

        producto = await self.repo.create(slug=slug, **data)

        if especificaciones:
            for esp in especificaciones:
                await self.repo.add_especificacion(producto.id, esp["clave"], esp["valor"])

        return producto

    async def update(self, producto_id: int, data: dict):
        producto = await self.repo.get_by_id(producto_id)
        if not producto:
            raise NotFoundException("Producto no encontrado")

        if "nombre" in data and data["nombre"]:
            new_slug = generate_slug(data["nombre"])
            existing_slug = await self.repo.get_by_slug(new_slug)
            if existing_slug and existing_slug.id != producto_id:
                new_slug = f"{new_slug}-{producto.sku.lower()}"
            data["slug"] = new_slug

        especificaciones = data.pop("especificaciones", None)
        filtered = {k: v for k, v in data.items() if v is not None}
        await self.repo.update(producto, **filtered)

        if especificaciones is not None:
            for esp in especificaciones:
                await self.repo.add_especificacion(producto.id, esp["clave"], esp["valor"])

        return await self.repo.get_by_id(producto_id)

    async def get_by_id(self, producto_id: int):
        producto = await self.repo.get_by_id(producto_id)
        if not producto:
            raise NotFoundException("Producto no encontrado")
        return producto

    async def get_by_slug(self, slug: str):
        producto = await self.repo.get_by_slug(slug)
        if not producto:
            raise NotFoundException("Producto no encontrado")
        return producto

    async def list_all(self, **kwargs):
        return await self.repo.list_all(**kwargs)

    async def soft_delete(self, producto_id: int):
        producto = await self.repo.get_by_id(producto_id)
        if not producto:
            raise NotFoundException("Producto no encontrado")
        return await self.repo.update(producto, activo=False)

    async def update_imagen(self, producto_id: int, imagen_url: str):
        producto = await self.repo.get_by_id(producto_id)
        if not producto:
            raise NotFoundException("Producto no encontrado")
        producto.imagen_url = imagen_url
        await self.db.flush()
        return producto

    async def add_especificacion(self, producto_id: int, clave: str, valor: str):
        producto = await self.repo.get_by_id(producto_id)
        if not producto:
            raise NotFoundException("Producto no encontrado")
        return await self.repo.add_especificacion(producto_id, clave, valor)

    async def delete_especificacion(self, producto_id: int, clave: str):
        producto = await self.repo.get_by_id(producto_id)
        if not producto:
            raise NotFoundException("Producto no encontrado")
        deleted = await self.repo.delete_especificacion(producto_id, clave)
        if not deleted:
            raise NotFoundException("Especificación no encontrada")
