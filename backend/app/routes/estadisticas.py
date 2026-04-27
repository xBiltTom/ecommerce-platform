"""
Rutas del módulo de estadísticas y reportes del panel administrativo.

Endpoints:
  GET /admin/estadisticas/dashboard       → JSON con los 4 bloques del dashboard
  GET /admin/reportes/operacional         → PDF tabla de pedidos por rango de fechas
  GET /admin/reportes/gestion             → PDF KPIs estratégicos por rango de fechas
"""

import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.usuario import Usuario
from app.schemas.estadisticas import EstadisticasDashboard
from app.services.estadisticas_service import EstadisticasService
from app.services.pdf_service import PDFService

router = APIRouter(prefix="/admin", tags=["Estadísticas y Reportes"])


# ── Dashboard de estadísticas ──

@router.get("/estadisticas/dashboard", response_model=EstadisticasDashboard)
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


# ── Reporte Operacional (PDF) ──

@router.get("/reportes/operacional")
async def download_reporte_operacional(
    fecha_inicio: str = Query(..., description="Fecha de inicio en formato YYYY-MM-DD"),
    fecha_fin:    str = Query(..., description="Fecha de fin en formato YYYY-MM-DD"),
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Descarga un reporte PDF operacional con el listado de pedidos en el rango
    de fechas indicado. Incluye: ID, cliente, email, fecha, estado y total.

    Parámetros:
    - fecha_inicio: YYYY-MM-DD
    - fecha_fin:    YYYY-MM-DD
    """
    fi = datetime.fromisoformat(fecha_inicio).replace(
        hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
    )
    ff = datetime.fromisoformat(fecha_fin).replace(
        hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc
    )

    service = PDFService(db)
    pdf_bytes = await service.generar_reporte_operacional(fi, ff)

    nombre_archivo = f"reporte_operacional_{fecha_inicio}_{fecha_fin}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"},
    )


# ── Reporte de Gestión (PDF) ──

@router.get("/reportes/gestion")
async def download_reporte_gestion(
    fecha_inicio: str = Query(..., description="Fecha de inicio en formato YYYY-MM-DD"),
    fecha_fin:    str = Query(..., description="Fecha de fin en formato YYYY-MM-DD"),
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Descarga un reporte PDF de gestión con KPIs estratégicos del periodo:
    ingresos totales, producto más vendido, ticket promedio,
    clientes nuevos vs recurrentes y rentabilidad estimada.

    Parámetros:
    - fecha_inicio: YYYY-MM-DD
    - fecha_fin:    YYYY-MM-DD
    """
    fi = datetime.fromisoformat(fecha_inicio).replace(
        hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
    )
    ff = datetime.fromisoformat(fecha_fin).replace(
        hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc
    )

    service = PDFService(db)
    pdf_bytes = await service.generar_reporte_gestion(fi, ff)

    nombre_archivo = f"reporte_gestion_{fecha_inicio}_{fecha_fin}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"},
    )
