"""
Repositorio de consultas agregadas para el dashboard de estadísticas.

Todas las consultas usan SQLAlchemy sobre los modelos ORM existentes.
"""

from sqlalchemy import select, func, case, literal_column
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pedido import Pedido, PedidoItem
from app.models.producto import Producto
from app.models.categoria import Categoria
from app.models.usuario import Usuario

# Estados de pedido que representan ventas efectivas
_ESTADOS_VENTA = ("pagado", "en_preparacion", "enviado", "entregado")


class EstadisticasRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Bloque 1: Métricas generales ──

    async def get_ventas_totales(self) -> float:
        """Suma total de pedidos efectivos."""
        result = await self.db.execute(
            select(func.coalesce(func.sum(Pedido.total), 0)).where(
                Pedido.estado.in_(_ESTADOS_VENTA)
            )
        )
        return float(result.scalar() or 0)

    async def get_total_pedidos(self) -> int:
        """Cantidad total de pedidos (todos los estados)."""
        result = await self.db.execute(select(func.count()).select_from(Pedido))
        return result.scalar() or 0

    async def get_total_clientes(self) -> int:
        """Clientes únicos que han realizado al menos un pedido."""
        result = await self.db.execute(
            select(func.count(func.distinct(Pedido.usuario_id))).select_from(Pedido)
        )
        return result.scalar() or 0

    async def get_productos_activos(self) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Producto).where(Producto.activo == True)  # noqa: E712
        )
        return result.scalar() or 0

    # ── Bloque 2: Distribución por categoría ──

    async def get_ventas_por_categoria(self) -> list[dict]:
        """
        JOIN entre pedido_items → productos → categorías para obtener
        qué categorías generan más ventas.
        """
        result = await self.db.execute(
            select(
                func.coalesce(Categoria.nombre, "Sin categoría").label("categoria"),
                func.sum(PedidoItem.cantidad).label("cantidad_vendida"),
                func.sum(PedidoItem.subtotal).label("ingresos"),
            )
            .join(Pedido, PedidoItem.pedido_id == Pedido.id)
            .outerjoin(Producto, PedidoItem.producto_id == Producto.id)
            .outerjoin(Categoria, Producto.categoria_id == Categoria.id)
            .where(Pedido.estado.in_(_ESTADOS_VENTA))
            .group_by(Categoria.nombre)
            .order_by(func.sum(PedidoItem.subtotal).desc())
        )
        return [
            {
                "categoria": row.categoria,
                "cantidad_vendida": int(row.cantidad_vendida or 0),
                "ingresos": float(row.ingresos or 0),
            }
            for row in result.all()
        ]

    # ── Bloque 3: Evolución temporal de ventas ──

    async def get_ventas_timeline(self, truncar: str = "day") -> list[dict]:
        """
        Agrupación por fecha truncada (day, week, month) para línea de tiempo.
        """
        result = await self.db.execute(
            select(
                func.date_trunc(truncar, Pedido.fecha_creacion).label("fecha"),
                func.coalesce(func.sum(Pedido.total), 0).label("ingresos"),
                func.count().label("cantidad_pedidos"),
            )
            .where(Pedido.estado.in_(_ESTADOS_VENTA))
            .group_by(literal_column("fecha"))
            .order_by(literal_column("fecha").asc())
            .limit(60)
        )
        return [
            {
                "fecha": str(row.fecha),
                "ingresos": float(row.ingresos),
                "cantidad_pedidos": row.cantidad_pedidos,
            }
            for row in result.all()
        ]

    # ── Bloque 4: Frecuencia de compras ──

    async def get_frecuencia_compras(self) -> list[dict]:
        """
        Distribución de clientes por número de pedidos.
        Agrupa en rangos: 1 compra, 2-3, 4-5, 6+.
        """
        # Sub-query: contar pedidos por usuario
        pedidos_por_usuario = (
            select(
                Pedido.usuario_id,
                func.count().label("num_pedidos"),
            )
            .group_by(Pedido.usuario_id)
            .subquery()
        )

        # Clasificar en rangos
        rango_expr = case(
            (pedidos_por_usuario.c.num_pedidos == 1, "1 compra"),
            (pedidos_por_usuario.c.num_pedidos.between(2, 3), "2-3 compras"),
            (pedidos_por_usuario.c.num_pedidos.between(4, 5), "4-5 compras"),
            else_="6+ compras",
        )

        result = await self.db.execute(
            select(
                rango_expr.label("rango"),
                func.count().label("cantidad_clientes"),
            )
            .select_from(pedidos_por_usuario)
            .group_by(rango_expr)
            .order_by(rango_expr)
        )

        # Garantizar que todos los rangos estén presentes (aunque con 0)
        rangos_orden = ["1 compra", "2-3 compras", "4-5 compras", "6+ compras"]
        data = {row.rango: row.cantidad_clientes for row in result.all()}
        return [
            {"rango": r, "cantidad_clientes": data.get(r, 0)}
            for r in rangos_orden
        ]
