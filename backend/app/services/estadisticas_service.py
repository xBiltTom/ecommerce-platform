"""
Servicio de estadísticas del dashboard administrativo.

Orquesta las consultas del repositorio y devuelve
la estructura unificada EstadisticasDashboard.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.estadisticas_repo import EstadisticasRepository
from app.schemas.estadisticas import (
    EstadisticasDashboard,
    FrecuenciaCompra,
    MetricasGenerales,
    VentasPorCategoria,
    VentasTimeline,
)


class EstadisticasService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = EstadisticasRepository(db)

    async def get_dashboard(self, periodo: str = "mes") -> EstadisticasDashboard:
        """
        Construye el dashboard completo con los 4 bloques.

        Args:
            periodo: Granularidad temporal – 'dia', 'semana' o 'mes'.
        """
        trunc_map = {"dia": "day", "semana": "week", "mes": "month"}
        truncar = trunc_map.get(periodo, "month")

        # Ejecutar todas las queries
        ventas_totales = await self.repo.get_ventas_totales()
        total_pedidos = await self.repo.get_total_pedidos()
        total_clientes = await self.repo.get_total_clientes()
        productos_activos = await self.repo.get_productos_activos()
        ventas_categoria = await self.repo.get_ventas_por_categoria()
        ventas_timeline = await self.repo.get_ventas_timeline(truncar)
        frecuencia = await self.repo.get_frecuencia_compras()

        ticket_promedio = ventas_totales / total_pedidos if total_pedidos > 0 else 0.0

        return EstadisticasDashboard(
            metricas=MetricasGenerales(
                ventas_totales=round(ventas_totales, 2),
                total_pedidos=total_pedidos,
                ticket_promedio=round(ticket_promedio, 2),
                total_clientes=total_clientes,
                productos_activos=productos_activos,
            ),
            ventas_por_categoria=[
                VentasPorCategoria(**vc) for vc in ventas_categoria
            ],
            ventas_timeline=[
                VentasTimeline(**vt) for vt in ventas_timeline
            ],
            frecuencia_compras=[
                FrecuenciaCompra(**fc) for fc in frecuencia
            ],
        )
