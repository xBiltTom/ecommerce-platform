"""
Servicio del carrito de compras.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundException, InsufficientStockException, BadRequestException
from app.repositories.carrito_repo import CarritoRepository
from app.repositories.producto_repo import ProductoRepository


class CarritoService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.carrito_repo = CarritoRepository(db)
        self.producto_repo = ProductoRepository(db)

    async def get_active_cart(self, usuario_id: str):
        return await self.carrito_repo.get_or_create_active(usuario_id)

    async def add_item(self, usuario_id: str, producto_id: int, cantidad: int):
        producto = await self.producto_repo.get_by_id(producto_id)
        if not producto or not producto.activo:
            raise NotFoundException("Producto no encontrado o inactivo")

        stock_disponible = producto.stock_fisico - producto.stock_reservado
        carrito = await self.carrito_repo.get_or_create_active(usuario_id)

        # Verificar si ya existe el producto en el carrito
        existing = await self.carrito_repo.get_item_by_product(carrito.id, producto_id)
        if existing:
            nueva_cantidad = existing.cantidad + cantidad
            if nueva_cantidad > stock_disponible:
                raise InsufficientStockException(
                    f"Stock insuficiente. Disponible: {stock_disponible}, solicitado: {nueva_cantidad}"
                )
            existing.cantidad = nueva_cantidad
            existing.precio_unitario = float(producto.precio_oferta or producto.precio)
            await self.db.flush()
            return carrito
        else:
            if cantidad > stock_disponible:
                raise InsufficientStockException(
                    f"Stock insuficiente. Disponible: {stock_disponible}"
                )
            precio = float(producto.precio_oferta or producto.precio)
            await self.carrito_repo.add_item(
                carrito_id=carrito.id,
                producto_id=producto_id,
                cantidad=cantidad,
                precio_unitario=precio,
            )

        # Refrescar carrito con items actualizados
        return await self.carrito_repo.get_or_create_active(usuario_id)

    async def update_item(self, usuario_id: str, item_id: int, cantidad: int):
        carrito = await self.carrito_repo.get_active_by_user(usuario_id)
        if not carrito:
            raise NotFoundException("No tiene un carrito activo")

        item = await self.carrito_repo.get_item(item_id, carrito.id)
        if not item:
            raise NotFoundException("Item no encontrado en el carrito")

        producto = await self.producto_repo.get_by_id(item.producto_id)
        if producto:
            stock_disponible = producto.stock_fisico - producto.stock_reservado
            if cantidad > stock_disponible:
                raise InsufficientStockException(
                    f"Stock insuficiente. Disponible: {stock_disponible}"
                )

        item.cantidad = cantidad
        await self.db.flush()
        return await self.carrito_repo.get_active_by_user(usuario_id)

    async def remove_item(self, usuario_id: str, item_id: int):
        carrito = await self.carrito_repo.get_active_by_user(usuario_id)
        if not carrito:
            raise NotFoundException("No tiene un carrito activo")

        item = await self.carrito_repo.get_item(item_id, carrito.id)
        if not item:
            raise NotFoundException("Item no encontrado en el carrito")

        await self.carrito_repo.delete_item(item)
        return await self.carrito_repo.get_active_by_user(usuario_id)

    async def clear_cart(self, usuario_id: str):
        carrito = await self.carrito_repo.get_active_by_user(usuario_id)
        if not carrito:
            raise NotFoundException("No tiene un carrito activo")
        await self.carrito_repo.clear_items(carrito)
