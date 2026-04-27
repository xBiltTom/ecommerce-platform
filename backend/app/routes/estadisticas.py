"""
Rutas del módulo de estadísticas del dashboard administrativo.

Endpoint principal: GET /admin/estadisticas/dashboard
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.usuario import Usuario
from app.schemas.estadisticas import EstadisticasDashboard
from app.services.estadisticas_service import EstadisticasService

router = APIRouter(prefix="/admin/estadisticas", tags=["Estadísticas Admin"])


@router.get("/dashboard", response_model=EstadisticasDashboard)
async def get_estadisticas_dashboard(
    periodo: str = Query("mes", pattern="^(dia|semana|mes)$"),
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Devuelve el dashboard unificado de estadísticas con cuatro bloques:
    - Métricas generales (ventas totales, pedidos, ticket promedio, clientes, productos).
    - Distribución de ventas por categoría.
    - Evolución temporal de ventas (agrupada por dia/semana/mes).
    - Frecuencia de compras por cliente.

    Solo accesible con rol admin.
    """
    service = EstadisticasService(db)
    return await service.get_dashboard(periodo)
