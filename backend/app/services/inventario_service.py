"""
Servicio de inventario y ajustes manuales.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundException, BadRequestException
from app.repositories.inventario_repo import InventarioRepository
from app.repositories.producto_repo import ProductoRepository


class InventarioService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.inv_repo = InventarioRepository(db)
        self.producto_repo = ProductoRepository(db)

    async def ajuste_manual(
        self, producto_id: int, tipo: str, cantidad: int, motivo: str, admin_id: str
    ):
        producto = await self.producto_repo.get_by_id(producto_id)
        if not producto:
            raise NotFoundException("Producto no encontrado")

        fisico_ant = producto.stock_fisico
        reservado_ant = producto.stock_reservado

        if tipo == "entrada":
            producto.stock_fisico += cantidad
        elif tipo == "salida":
            if cantidad > (producto.stock_fisico - producto.stock_reservado):
                raise BadRequestException("No se puede sacar más stock del disponible")
            producto.stock_fisico -= cantidad
        elif tipo == "ajuste":
            producto.stock_fisico = cantidad
        else:
            raise BadRequestException(f"Tipo de movimiento inválido: {tipo}")

        await self.db.flush()

        movimiento = await self.inv_repo.create_movimiento(
            producto_id=producto.id,
            tipo=tipo,
            cantidad=cantidad,
            stock_fisico_anterior=fisico_ant,
            stock_fisico_nuevo=producto.stock_fisico,
            stock_reservado_anterior=reservado_ant,
            stock_reservado_nuevo=producto.stock_reservado,
            motivo=motivo,
            realizado_por=admin_id,
        )

        return movimiento

    async def list_movimientos(self, page=1, page_size=20, producto_id=None):
        return await self.inv_repo.list_movimientos(page, page_size, producto_id)
