"""
Repositorio de consultas agregadas para el panel de administración.
"""

from sqlalchemy import select, func, text, case, literal_column
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pedido import Pedido, PedidoItem
from app.models.producto import Producto


class AdminRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_ventas_totales(self) -> float:
        """Total de ventas de pedidos pagados/entregados."""
        result = await self.db.execute(
            select(func.coalesce(func.sum(Pedido.total), 0)).where(
                Pedido.estado.in_(["pagado", "en_preparacion", "enviado", "entregado"])
            )
        )
        return float(result.scalar() or 0)

    async def get_total_pedidos(self) -> int:
        result = await self.db.execute(select(func.count()).select_from(Pedido))
        return result.scalar() or 0

    async def get_pedidos_por_estado(self) -> list[dict]:
        result = await self.db.execute(
            select(Pedido.estado, func.count().label("cantidad"))
            .group_by(Pedido.estado)
            .order_by(func.count().desc())
        )
        return [{"estado": row.estado, "cantidad": row.cantidad} for row in result.all()]

    async def get_ventas_por_periodo(self, periodo: str = "dia") -> list[dict]:
        """Ventas agrupadas por periodo (dia, semana, mes)."""
        trunc_map = {"dia": "day", "semana": "week", "mes": "month"}
        trunc = trunc_map.get(periodo, "day")

        result = await self.db.execute(
            select(
                func.date_trunc(trunc, Pedido.fecha_creacion).label("periodo"),
                func.coalesce(func.sum(Pedido.total), 0).label("total"),
                func.count().label("cantidad_pedidos"),
            )
            .where(Pedido.estado.in_(["pagado", "en_preparacion", "enviado", "entregado"]))
            .group_by(literal_column("periodo"))
            .order_by(literal_column("periodo").desc())
            .limit(30)
        )
        return [
            {
                "periodo": str(row.periodo),
                "total": float(row.total),
                "cantidad_pedidos": row.cantidad_pedidos,
            }
            for row in result.all()
        ]

    async def get_productos_top(self, limit: int = 10) -> list[dict]:
        result = await self.db.execute(
            select(
                PedidoItem.producto_id,
                PedidoItem.nombre_producto,
                PedidoItem.sku_producto,
                func.sum(PedidoItem.cantidad).label("cantidad_vendida"),
                func.sum(PedidoItem.subtotal).label("ingresos"),
            )
            .join(Pedido, PedidoItem.pedido_id == Pedido.id)
            .where(Pedido.estado.in_(["pagado", "en_preparacion", "enviado", "entregado"]))
            .group_by(PedidoItem.producto_id, PedidoItem.nombre_producto, PedidoItem.sku_producto)
            .order_by(func.sum(PedidoItem.cantidad).desc())
            .limit(limit)
        )
        return [
            {
                "producto_id": row.producto_id,
                "nombre": row.nombre_producto,
                "sku": row.sku_producto,
                "cantidad_vendida": int(row.cantidad_vendida),
                "ingresos": float(row.ingresos),
            }
            for row in result.all()
        ]
