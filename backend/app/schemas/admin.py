"""
Schemas del panel de administración y KPIs.
"""

from datetime import datetime

from pydantic import BaseModel


class DashboardKPIs(BaseModel):
    ventas_totales: float
    total_pedidos: int
    ticket_promedio: float
    usuarios_registrados: int
    usuarios_nuevos_mes: int
    productos_activos: int
    productos_bajo_stock: int


class VentasPorPeriodo(BaseModel):
    periodo: str
    total: float
    cantidad_pedidos: int


class ProductoTop(BaseModel):
    producto_id: int
    nombre: str
    sku: str
    cantidad_vendida: int
    ingresos: float


class ProductoBajoStock(BaseModel):
    id: int
    sku: str
    nombre: str
    stock_fisico: int
    stock_reservado: int
    stock_disponible: int
    stock_minimo: int


class PedidosPorEstado(BaseModel):
    estado: str
    cantidad: int


class AuditoriaResponse(BaseModel):
    id: int
    admin_email: str | None = None
    entidad: str
    entidad_id: str
    accion: str
    detalle: dict | None = None
    ip_address: str | None = None
    fecha_creacion: datetime

    model_config = {"from_attributes": True}
