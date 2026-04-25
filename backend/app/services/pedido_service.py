"""
Servicio de gestión de pedidos y checkout.
"""

from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import (
    NotFoundException,
    BadRequestException,
    InsufficientStockException,
)
from app.repositories.carrito_repo import CarritoRepository
from app.repositories.pedido_repo import PedidoRepository
from app.repositories.producto_repo import ProductoRepository
from app.repositories.direccion_repo import DireccionRepository
from app.repositories.inventario_repo import InventarioRepository


class PedidoService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.pedido_repo = PedidoRepository(db)
        self.carrito_repo = CarritoRepository(db)
        self.producto_repo = ProductoRepository(db)
        self.direccion_repo = DireccionRepository(db)
        self.inventario_repo = InventarioRepository(db)

    async def checkout(self, usuario_id: str, direccion_id: int, comentario: str | None = None):
        """Crea un pedido desde el carrito activo. Transacción atómica."""
        # 1. Verificar carrito activo con items
        carrito = await self.carrito_repo.get_active_by_user(usuario_id)
        if not carrito or not carrito.items:
            raise BadRequestException("El carrito está vacío o no existe")

        # 2. Verificar dirección
        direccion = await self.direccion_repo.get_by_id_and_user(direccion_id, usuario_id)
        if not direccion:
            raise NotFoundException("Dirección no encontrada")

        # 3. Validar stock y reservar
        subtotal = Decimal("0")
        pedido_items_data = []

        for item in carrito.items:
            producto = await self.producto_repo.get_by_id(item.producto_id)
            if not producto or not producto.activo:
                raise BadRequestException(f"Producto '{item.producto_id}' no disponible")

            stock_disponible = producto.stock_fisico - producto.stock_reservado
            if item.cantidad > stock_disponible:
                raise InsufficientStockException(
                    f"Stock insuficiente para '{producto.nombre}'. "
                    f"Disponible: {stock_disponible}, solicitado: {item.cantidad}"
                )

            item_subtotal = Decimal(str(item.precio_unitario)) * item.cantidad
            subtotal += item_subtotal

            pedido_items_data.append({
                "producto_id": producto.id,
                "sku_producto": producto.sku,
                "nombre_producto": producto.nombre,
                "cantidad": item.cantidad,
                "precio_unitario": float(item.precio_unitario),
                "subtotal": float(item_subtotal),
            })

            # Reservar stock
            stock_reservado_ant = producto.stock_reservado
            producto.stock_reservado += item.cantidad
            await self.db.flush()

            # Registrar movimiento de inventario
            await self.inventario_repo.create_movimiento(
                producto_id=producto.id,
                tipo="reserva",
                cantidad=item.cantidad,
                stock_fisico_anterior=producto.stock_fisico,
                stock_fisico_nuevo=producto.stock_fisico,
                stock_reservado_anterior=stock_reservado_ant,
                stock_reservado_nuevo=producto.stock_reservado,
                motivo="Reserva por checkout",
                realizado_por=usuario_id,
            )

        # 4. Crear pedido
        total = float(subtotal)
        pedido = await self.pedido_repo.create(
            usuario_id=usuario_id,
            carrito_id=carrito.id,
            direccion_id=direccion.id,
            nombre_destinatario=direccion.destinatario_nombre or f"{direccion.usuario.nombre} {direccion.usuario.apellido}" if hasattr(direccion, 'usuario') and direccion.usuario else "Cliente",
            telefono_contacto=direccion.telefono_contacto,
            direccion_envio=direccion.direccion,
            ciudad_envio=direccion.ciudad,
            pais_envio=direccion.pais,
            codigo_postal_envio=direccion.codigo_postal,
            referencia_envio=direccion.referencia,
            subtotal=total,
            descuento=0,
            costo_envio=0,
            total=total,
        )

        # 5. Crear items del pedido
        for item_data in pedido_items_data:
            await self.pedido_repo.add_item(pedido_id=pedido.id, **item_data)

        # 6. Registrar historial
        await self.pedido_repo.add_historial(
            pedido_id=pedido.id,
            estado_anterior=None,
            estado_nuevo="pendiente",
            comentario=comentario or "Pedido creado desde checkout",
            creado_por=usuario_id,
        )

        # 7. Finalizar carrito
        await self.carrito_repo.finalize(carrito)

        return await self.pedido_repo.get_by_id(pedido.id)

    async def list_by_user(self, usuario_id: str, page=1, page_size=20):
        return await self.pedido_repo.list_by_user(usuario_id, page, page_size)

    async def get_detail(self, pedido_id: str, usuario_id: str | None = None):
        if usuario_id:
            pedido = await self.pedido_repo.get_by_id_and_user(pedido_id, usuario_id)
        else:
            pedido = await self.pedido_repo.get_by_id(pedido_id)

        if not pedido:
            raise NotFoundException("Pedido no encontrado")
        return pedido

    async def update_estado(self, pedido_id: str, estado: str, comentario: str | None, admin_id: str):
        pedido = await self.pedido_repo.get_by_id(pedido_id)
        if not pedido:
            raise NotFoundException("Pedido no encontrado")

        estado_anterior = pedido.estado

        # Validar transiciones de estado
        valid_transitions = {
            "pendiente": ["pagado", "cancelado"],
            "pagado": ["en_preparacion", "cancelado"],
            "en_preparacion": ["enviado", "cancelado"],
            "enviado": ["entregado"],
            "entregado": [],
            "cancelado": [],
        }

        if estado not in valid_transitions.get(estado_anterior, []):
            raise BadRequestException(
                f"No se puede cambiar de '{estado_anterior}' a '{estado}'"
            )

        pedido.estado = estado
        await self.db.flush()

        # Si se cancela, liberar stock reservado
        if estado == "cancelado":
            await self._liberar_stock(pedido, admin_id)

        # Si se entrega, descontar stock físico y liberar reserva
        if estado == "entregado":
            await self._confirmar_salida_stock(pedido, admin_id)

        await self.pedido_repo.add_historial(
            pedido_id=pedido.id,
            estado_anterior=estado_anterior,
            estado_nuevo=estado,
            comentario=comentario,
            creado_por=admin_id,
        )

        return pedido

    async def cancel_by_user(self, pedido_id: str, usuario_id: str):
        pedido = await self.pedido_repo.get_by_id_and_user(pedido_id, usuario_id)
        if not pedido:
            raise NotFoundException("Pedido no encontrado")

        if pedido.estado != "pendiente":
            raise BadRequestException("Solo se pueden cancelar pedidos pendientes")

        pedido.estado = "cancelado"
        await self.db.flush()

        await self._liberar_stock(pedido, usuario_id)

        await self.pedido_repo.add_historial(
            pedido_id=pedido.id,
            estado_anterior="pendiente",
            estado_nuevo="cancelado",
            comentario="Cancelado por el cliente",
            creado_por=usuario_id,
        )
        return pedido

    async def _liberar_stock(self, pedido, user_id: str):
        """Libera el stock reservado de todos los items del pedido."""
        for item in pedido.items:
            producto = await self.producto_repo.get_by_id(item.producto_id)
            if producto:
                reservado_ant = producto.stock_reservado
                producto.stock_reservado = max(0, producto.stock_reservado - item.cantidad)
                await self.db.flush()

                await self.inventario_repo.create_movimiento(
                    producto_id=producto.id,
                    tipo="liberacion_reserva",
                    cantidad=item.cantidad,
                    stock_fisico_anterior=producto.stock_fisico,
                    stock_fisico_nuevo=producto.stock_fisico,
                    stock_reservado_anterior=reservado_ant,
                    stock_reservado_nuevo=producto.stock_reservado,
                    motivo=f"Liberación por cancelación de pedido {pedido.id}",
                    pedido_id=pedido.id,
                    realizado_por=user_id,
                )

    async def _confirmar_salida_stock(self, pedido, admin_id: str):
        """Descuenta stock físico y libera reserva al entregar."""
        for item in pedido.items:
            producto = await self.producto_repo.get_by_id(item.producto_id)
            if producto:
                fisico_ant = producto.stock_fisico
                reservado_ant = producto.stock_reservado
                producto.stock_fisico = max(0, producto.stock_fisico - item.cantidad)
                producto.stock_reservado = max(0, producto.stock_reservado - item.cantidad)
                await self.db.flush()

                await self.inventario_repo.create_movimiento(
                    producto_id=producto.id,
                    tipo="salida",
                    cantidad=item.cantidad,
                    stock_fisico_anterior=fisico_ant,
                    stock_fisico_nuevo=producto.stock_fisico,
                    stock_reservado_anterior=reservado_ant,
                    stock_reservado_nuevo=producto.stock_reservado,
                    motivo=f"Salida por entrega de pedido {pedido.id}",
                    pedido_id=pedido.id,
                    realizado_por=admin_id,
                )

    async def list_all(self, page=1, page_size=20, estado=None):
        return await self.pedido_repo.list_all(page, page_size, estado)

    async def get_historial(self, pedido_id: str):
        return await self.pedido_repo.get_historial(pedido_id)
