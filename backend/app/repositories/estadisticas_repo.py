"""
Repositorio de consultas agregadas para el dashboard de estadísticas.

Todas las consultas usan SQLAlchemy sobre los modelos ORM existentes.
"""

from datetime import datetime

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

    # ── Reporte Operacional ──

    async def get_pedidos_por_rango(
        self,
        fecha_inicio: datetime,
        fecha_fin: datetime,
    ) -> list[dict]:
        """
        Lista de pedidos en un rango de fechas para el reporte operacional.
        Incluye id, nombre del cliente, fecha, estado y total.
        """
        result = await self.db.execute(
            select(
                Pedido.id,
                (Usuario.nombre + " " + Usuario.apellido).label("cliente"),
                Usuario.email.label("email"),
                Pedido.fecha_creacion,
                Pedido.estado,
                Pedido.total,
            )
            .join(Usuario, Pedido.usuario_id == Usuario.id)
            .where(
                Pedido.fecha_creacion >= fecha_inicio,
                Pedido.fecha_creacion <= fecha_fin,
            )
            .order_by(Pedido.fecha_creacion.asc())
        )
        return [
            {
                "id": str(row.id)[:8].upper(),     # Mostrar solo los primeros 8 chars del UUID
                "cliente": row.cliente,
                "email": row.email,
                "fecha": row.fecha_creacion,
                "estado": row.estado,
                "total": float(row.total),
            }
            for row in result.all()
        ]

    # ── Reporte de Gestión ──

    async def get_kpis_gestion(
        self,
        fecha_inicio: datetime,
        fecha_fin: datetime,
    ) -> dict:
        """
        KPIs agregados para el reporte de gestión en un rango de fechas.
        Devuelve: ingresos totales, producto más vendido, ticket promedio,
        clientes nuevos vs recurrentes, y rentabilidad estimada.
        """
        # Ingresos totales del periodo
        r_ingresos = await self.db.execute(
            select(func.coalesce(func.sum(Pedido.total), 0))
            .where(
                Pedido.estado.in_(_ESTADOS_VENTA),
                Pedido.fecha_creacion >= fecha_inicio,
                Pedido.fecha_creacion <= fecha_fin,
            )
        )
        ingresos_totales = float(r_ingresos.scalar() or 0)

        # Total pedidos del periodo
        r_pedidos = await self.db.execute(
            select(func.count())
            .select_from(Pedido)
            .where(
                Pedido.estado.in_(_ESTADOS_VENTA),
                Pedido.fecha_creacion >= fecha_inicio,
                Pedido.fecha_creacion <= fecha_fin,
            )
        )
        total_pedidos = r_pedidos.scalar() or 0

        ticket_promedio = ingresos_totales / total_pedidos if total_pedidos > 0 else 0.0

        # Producto más vendido (por unidades) en el periodo
        r_top = await self.db.execute(
            select(
                PedidoItem.nombre_producto,
                PedidoItem.sku_producto,
                func.sum(PedidoItem.cantidad).label("cantidad_total"),
                func.sum(PedidoItem.subtotal).label("ingresos_producto"),
            )
            .join(Pedido, PedidoItem.pedido_id == Pedido.id)
            .where(
                Pedido.estado.in_(_ESTADOS_VENTA),
                Pedido.fecha_creacion >= fecha_inicio,
                Pedido.fecha_creacion <= fecha_fin,
            )
            .group_by(PedidoItem.nombre_producto, PedidoItem.sku_producto)
            .order_by(func.sum(PedidoItem.cantidad).desc())
            .limit(1)
        )
        top_row = r_top.first()
        producto_top = {
            "nombre": top_row.nombre_producto if top_row else "N/A",
            "sku": top_row.sku_producto if top_row else "N/A",
            "cantidad": int(top_row.cantidad_total) if top_row else 0,
            "ingresos": float(top_row.ingresos_producto) if top_row else 0.0,
        }

        # Clientes nuevos vs recurrentes
        # "Nuevo" = primer pedido dentro del rango; "Recurrente" = tenía pedidos anteriores
        primer_pedido_sq = (
            select(
                Pedido.usuario_id,
                func.min(Pedido.fecha_creacion).label("primer_pedido"),
            )
            .group_by(Pedido.usuario_id)
            .subquery()
        )

        r_clientes = await self.db.execute(
            select(
                func.count(func.distinct(Pedido.usuario_id)).label("total_clientes"),
                func.sum(
                    case(
                        (primer_pedido_sq.c.primer_pedido >= fecha_inicio, 1),
                        else_=0,
                    )
                ).label("nuevos"),
            )
            .join(primer_pedido_sq, Pedido.usuario_id == primer_pedido_sq.c.usuario_id)
            .where(
                Pedido.fecha_creacion >= fecha_inicio,
                Pedido.fecha_creacion <= fecha_fin,
            )
        )
        r_cli = r_clientes.first()
        total_clientes_periodo = int(r_cli.total_clientes) if r_cli else 0
        clientes_nuevos = int(r_cli.nuevos or 0) if r_cli else 0
        clientes_recurrentes = total_clientes_periodo - clientes_nuevos

        return {
            "ingresos_totales": round(ingresos_totales, 2),
            "total_pedidos": total_pedidos,
            "ticket_promedio": round(ticket_promedio, 2),
            "producto_top": producto_top,
            "clientes_nuevos": clientes_nuevos,
            "clientes_recurrentes": clientes_recurrentes,
            "total_clientes_periodo": total_clientes_periodo,
            # Rentabilidad estimada: sin estructura de costos usamos ingresos totales como proxy
            "rentabilidad_estimada": round(ingresos_totales * 0.35, 2),  # Margen operativo ~35%
        }
