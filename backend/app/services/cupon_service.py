"""
Servicio de gestión de cupones de descuento.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import BadRequestException, NotFoundException, ForbiddenException
from app.models.cupon import CuponDescuento
from app.models.pedido import Pedido
from app.repositories.cupon_repo import CuponRepository
from app.repositories.pedido_repo import PedidoRepository


class CuponService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.cupon_repo = CuponRepository(db)
        self.pedido_repo = PedidoRepository(db)

    async def crear_cupon(
        self,
        codigo: str,
        tipo_descuento: str,
        valor: float,
        dias_expiracion: int,
        admin_id: str,
    ) -> CuponDescuento:
        # Validar que no exista código duplicado
        existente = await self.cupon_repo.get_by_codigo(codigo)
        if existente:
            raise BadRequestException("Ya existe un cupón con ese código")

        fecha_expiracion = datetime.now(timezone.utc) + timedelta(days=dias_expiracion)

        return await self.cupon_repo.create(
            codigo=codigo.strip().upper(),
            tipo_descuento=tipo_descuento,
            valor=Decimal(str(valor)),
            fecha_expiracion=fecha_expiracion,
            creado_por=admin_id,
        )

    async def listar_cupones(self, page: int = 1, page_size: int = 20):
        return await self.cupon_repo.list_all(page, page_size)

    async def aplicar_cupon_a_pedido(
        self,
        pedido_id: str,
        codigo: str,
        usuario_id: str,
    ) -> dict:
        """
        Aplica un cupón a un pedido pendiente. Bloquea la fila del cupón
        para evitar race conditions.
        """
        # 1. Verificar que el pedido existe y pertenece al usuario
        pedido = await self.pedido_repo.get_by_id_and_user(pedido_id, usuario_id)
        if not pedido:
            # Admin puede aplicar cupones a cualquier pedido? No, por ahora solo dueño.
            raise NotFoundException("Pedido no encontrado")

        if pedido.estado != "pendiente":
            raise BadRequestException("Solo se pueden aplicar cupones a pedidos pendientes")

        if pedido.cupon_id:
            raise BadRequestException("Este pedido ya tiene un cupón aplicado")

        # 2. Buscar y bloquear cupón
        cupon = await self.cupon_repo.get_by_codigo_for_update(codigo)
        if not cupon:
            raise BadRequestException("Código de descuento no válido")

        if cupon.usado:
            raise BadRequestException("El cupón ya ha sido utilizado")

        if cupon.fecha_expiracion < datetime.now(timezone.utc):
            raise BadRequestException("El cupón ha expirado")

        # 3. Calcular descuento
        subtotal = Decimal(str(pedido.subtotal))
        if cupon.tipo_descuento == "porcentaje":
            descuento = subtotal * (Decimal(str(cupon.valor)) / Decimal("100"))
        else:
            descuento = Decimal(str(cupon.valor))

        # Capar descuento al subtotal (total no puede ser negativo)
        descuento = min(descuento, subtotal)
        nuevo_total = float(subtotal - descuento + Decimal(str(pedido.costo_envio)))

        # 4. Actualizar pedido
        pedido.descuento = float(descuento)
        pedido.total = nuevo_total
        pedido.cupon_id = cupon.id
        await self.db.flush()

        # 5. Marcar cupón como usado
        cupon.usado = True
        cupon.fecha_uso = datetime.now(timezone.utc)
        cupon.pedido_id = pedido.id
        await self.db.flush()

        return {
            "descuento_aplicado": float(descuento),
            "nuevo_total": nuevo_total,
            "tipo_descuento": cupon.tipo_descuento,
            "valor": float(cupon.valor),
            "mensaje": f"Cupón {cupon.codigo} aplicado correctamente",
        }

    async def obtener_cupon_por_id(self, cupon_id: str) -> CuponDescuento | None:
        return await self.cupon_repo.get_by_id(cupon_id)
