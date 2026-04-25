"""
Servicio de pagos simulados.
"""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import NotFoundException, BadRequestException
from app.repositories.pago_repo import PagoRepository
from app.repositories.pedido_repo import PedidoRepository


class PagoService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.pago_repo = PagoRepository(db)
        self.pedido_repo = PedidoRepository(db)

    async def create_pago(self, pedido_id: str, usuario_id: str, metodo: str, referencia: str | None = None):
        pedido = await self.pedido_repo.get_by_id_and_user(pedido_id, usuario_id)
        if not pedido:
            raise NotFoundException("Pedido no encontrado")

        if pedido.estado != "pendiente":
            raise BadRequestException("Solo se pueden pagar pedidos pendientes")

        # Simular pago exitoso
        pago = await self.pago_repo.create(
            pedido_id=pedido.id,
            metodo=metodo,
            estado="pagado",
            monto=float(pedido.total),
            referencia_externa=referencia,
            fecha_pago=datetime.now(timezone.utc),
        )

        # Actualizar estado del pedido
        pedido.estado = "pagado"
        await self.db.flush()

        # Registrar historial
        await self.pedido_repo.add_historial(
            pedido_id=pedido.id,
            estado_anterior="pendiente",
            estado_nuevo="pagado",
            comentario=f"Pago simulado via {metodo}",
            creado_por=usuario_id,
        )

        return pago

    async def list_by_pedido(self, pedido_id: str):
        return await self.pago_repo.list_by_pedido(pedido_id)
