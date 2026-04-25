"""
Servicio del panel de administración (KPIs y auditoría).
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin_repo import AdminRepository
from app.repositories.producto_repo import ProductoRepository
from app.repositories.usuario_repo import UsuarioRepository
from app.repositories.inventario_repo import AdminAuditoriaRepository


class AdminService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.admin_repo = AdminRepository(db)
        self.producto_repo = ProductoRepository(db)
        self.usuario_repo = UsuarioRepository(db)
        self.audit_repo = AdminAuditoriaRepository(db)

    async def get_kpis(self) -> dict:
        ventas = await self.admin_repo.get_ventas_totales()
        total_pedidos = await self.admin_repo.get_total_pedidos()
        ticket_promedio = ventas / total_pedidos if total_pedidos > 0 else 0
        usuarios_total = await self.usuario_repo.count_total()
        usuarios_nuevos = await self.usuario_repo.count_new_this_month()
        productos_activos = await self.producto_repo.count_activos()
        bajo_stock_list, bajo_stock_count = await self.producto_repo.get_bajo_stock(page_size=1)

        return {
            "ventas_totales": ventas,
            "total_pedidos": total_pedidos,
            "ticket_promedio": round(ticket_promedio, 2),
            "usuarios_registrados": usuarios_total,
            "usuarios_nuevos_mes": usuarios_nuevos,
            "productos_activos": productos_activos,
            "productos_bajo_stock": bajo_stock_count,
        }

    async def get_ventas_por_periodo(self, periodo: str = "dia"):
        return await self.admin_repo.get_ventas_por_periodo(periodo)

    async def get_productos_top(self, limit: int = 10):
        return await self.admin_repo.get_productos_top(limit)

    async def get_productos_bajo_stock(self, page=1, page_size=20):
        return await self.producto_repo.get_bajo_stock(page, page_size)

    async def get_pedidos_por_estado(self):
        return await self.admin_repo.get_pedidos_por_estado()

    async def log_action(
        self, admin_id: str, entidad: str, entidad_id: str, accion: str,
        detalle: dict | None = None, ip: str | None = None
    ):
        await self.audit_repo.create(
            admin_usuario_id=admin_id,
            entidad=entidad,
            entidad_id=entidad_id,
            accion=accion,
            detalle=detalle,
            ip_address=ip,
        )

    async def get_auditoria(self, page=1, page_size=20):
        return await self.audit_repo.list_all(page, page_size)
