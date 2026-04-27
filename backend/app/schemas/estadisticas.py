"""
Schemas para el dashboard de estadísticas.

Estructura unificada que devuelve el endpoint GET /admin/estadisticas/dashboard
con cuatro bloques:
  1. Métricas generales (totales numéricos).
  2. Distribución por categorías (pares nombre-categoría y cantidad).
  3. Evolución de ventas (fechas con ingresos).
  4. Frecuencia de compras (distribución de pedidos por cliente).
"""

from pydantic import BaseModel


# ── Bloque 1: Métricas generales ──

class MetricasGenerales(BaseModel):
    """KPIs numéricos globales del negocio."""
    ventas_totales: float
    total_pedidos: int
    ticket_promedio: float
    total_clientes: int
    productos_activos: int


# ── Bloque 2: Distribución por categoría ──

class VentasPorCategoria(BaseModel):
    """Unidades e ingresos agrupados por categoría de producto."""
    categoria: str
    cantidad_vendida: int
    ingresos: float


# ── Bloque 3: Evolución temporal de ventas ──

class VentasTimeline(BaseModel):
    """Punto en la línea de tiempo de ventas."""
    fecha: str
    ingresos: float
    cantidad_pedidos: int


# ── Bloque 4: Frecuencia de compras ──

class FrecuenciaCompra(BaseModel):
    """Cuántos clientes realizaron N compras."""
    rango: str              # e.g. "1 compra", "2-3 compras", "4-5 compras", "6+ compras"
    cantidad_clientes: int


# ── Schema unificado del dashboard ──

class EstadisticasDashboard(BaseModel):
    """Respuesta completa del endpoint de estadísticas."""
    metricas: MetricasGenerales
    ventas_por_categoria: list[VentasPorCategoria]
    ventas_timeline: list[VentasTimeline]
    frecuencia_compras: list[FrecuenciaCompra]
