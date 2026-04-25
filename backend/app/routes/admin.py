"""
Rutas del panel de administración.
"""

import math

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioDetailResponse, UsuarioEstadoRequest
from app.schemas.pedido import PedidoResponse, PedidoListResponse, PedidoEstadoRequest, PedidoItemResponse
from app.schemas.admin import (
    DashboardKPIs, VentasPorPeriodo, ProductoTop, ProductoBajoStock,
    PedidosPorEstado, AuditoriaResponse,
)
from app.schemas.inventario import AjusteInventarioRequest, MovimientoInventarioResponse
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.admin_service import AdminService
from app.services.usuario_service import UsuarioService
from app.services.pedido_service import PedidoService
from app.services.inventario_service import InventarioService
from app.services.pdf_service import PDFService

router = APIRouter(prefix="/admin", tags=["Administración"])


# ── Dashboard KPIs ──

@router.get("/dashboard/kpis", response_model=DashboardKPIs)
async def get_kpis(
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    return DashboardKPIs(**(await service.get_kpis()))


@router.get("/dashboard/ventas", response_model=list[VentasPorPeriodo])
async def get_ventas(
    periodo: str = Query("dia", pattern="^(dia|semana|mes)$"),
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    data = await service.get_ventas_por_periodo(periodo)
    return [VentasPorPeriodo(**v) for v in data]


@router.get("/dashboard/productos-top", response_model=list[ProductoTop])
async def get_productos_top(
    limit: int = Query(10, ge=1, le=50),
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    data = await service.get_productos_top(limit)
    return [ProductoTop(**p) for p in data]


@router.get("/dashboard/productos-bajo-stock", response_model=PaginatedResponse[ProductoBajoStock])
async def get_productos_bajo_stock(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    items, total = await service.get_productos_bajo_stock(page, page_size)
    return PaginatedResponse(
        items=[ProductoBajoStock(
            id=p.id, sku=p.sku, nombre=p.nombre,
            stock_fisico=p.stock_fisico, stock_reservado=p.stock_reservado,
            stock_disponible=p.stock_fisico - p.stock_reservado,
            stock_minimo=p.stock_minimo,
        ) for p in items],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/dashboard/pedidos-por-estado", response_model=list[PedidosPorEstado])
async def get_pedidos_por_estado(
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    data = await service.get_pedidos_por_estado()
    return [PedidosPorEstado(**p) for p in data]


# ── Usuarios ──

@router.get("/usuarios", response_model=PaginatedResponse[UsuarioDetailResponse])
async def list_usuarios(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    rol: str | None = None,
    activo: bool | None = None,
    buscar: str | None = None,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = UsuarioService(db)
    items, total = await service.list_users(page, page_size, rol, activo, buscar)
    return PaginatedResponse(
        items=[UsuarioDetailResponse.model_validate(u) for u in items],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/usuarios/{usuario_id}", response_model=UsuarioDetailResponse)
async def get_usuario(
    usuario_id: str,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = UsuarioService(db)
    return await service.get_user_detail(usuario_id)


@router.put("/usuarios/{usuario_id}/estado", response_model=MessageResponse)
async def toggle_usuario_estado(
    usuario_id: str,
    body: UsuarioEstadoRequest,
    request: Request,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = UsuarioService(db)
    await service.toggle_estado(usuario_id, body.activo)

    admin_service = AdminService(db)
    await admin_service.log_action(
        admin_id=admin.id, entidad="usuario", entidad_id=usuario_id,
        accion="activar" if body.activo else "desactivar",
        ip=request.client.host if request.client else None,
    )
    status = "activado" if body.activo else "desactivado"
    return MessageResponse(message=f"Usuario {status}")


# ── Pedidos (admin) ──

@router.get("/pedidos", response_model=PaginatedResponse[PedidoListResponse])
async def list_all_pedidos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    estado: str | None = None,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PedidoService(db)
    items, total = await service.list_all(page, page_size, estado)
    return PaginatedResponse(
        items=[PedidoListResponse(
            id=p.id, total=float(p.total), estado=p.estado,
            fecha_creacion=p.fecha_creacion,
            total_items=len(p.items) if p.items else 0,
        ) for p in items],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.put("/pedidos/{pedido_id}/estado", response_model=MessageResponse)
async def update_pedido_estado(
    pedido_id: str,
    body: PedidoEstadoRequest,
    request: Request,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PedidoService(db)
    await service.update_estado(pedido_id, body.estado, body.comentario, admin.id)

    admin_service = AdminService(db)
    await admin_service.log_action(
        admin_id=admin.id, entidad="pedido", entidad_id=pedido_id,
        accion=f"cambio_estado_a_{body.estado}",
        detalle={"comentario": body.comentario},
        ip=request.client.host if request.client else None,
    )
    return MessageResponse(message=f"Estado del pedido actualizado a '{body.estado}'")


# ── Inventario ──

@router.get("/inventario/movimientos", response_model=PaginatedResponse[MovimientoInventarioResponse])
async def list_movimientos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    producto_id: int | None = None,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = InventarioService(db)
    items, total = await service.list_movimientos(page, page_size, producto_id)
    return PaginatedResponse(
        items=[MovimientoInventarioResponse(
            id=m.id, producto_id=m.producto_id,
            producto_nombre=m.producto.nombre if m.producto else None,
            tipo=m.tipo, cantidad=m.cantidad,
            stock_fisico_anterior=m.stock_fisico_anterior,
            stock_fisico_nuevo=m.stock_fisico_nuevo,
            stock_reservado_anterior=m.stock_reservado_anterior,
            stock_reservado_nuevo=m.stock_reservado_nuevo,
            motivo=m.motivo, fecha_creacion=m.fecha_creacion,
        ) for m in items],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/inventario/ajuste", response_model=MessageResponse)
async def ajuste_inventario(
    body: AjusteInventarioRequest,
    request: Request,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = InventarioService(db)
    await service.ajuste_manual(
        body.producto_id, body.tipo, body.cantidad, body.motivo, admin.id
    )

    admin_service = AdminService(db)
    await admin_service.log_action(
        admin_id=admin.id, entidad="producto", entidad_id=str(body.producto_id),
        accion=f"ajuste_inventario_{body.tipo}",
        detalle={"cantidad": body.cantidad, "motivo": body.motivo},
        ip=request.client.host if request.client else None,
    )
    return MessageResponse(message="Ajuste de inventario realizado")


# ── Auditoría ──

@router.get("/auditoria", response_model=PaginatedResponse[AuditoriaResponse])
async def list_auditoria(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = AdminService(db)
    items, total = await service.get_auditoria(page, page_size)
    return PaginatedResponse(
        items=[AuditoriaResponse(
            id=a.id, admin_email=a.admin.email if a.admin else None,
            entidad=a.entidad, entidad_id=a.entidad_id,
            accion=a.accion, detalle=a.detalle,
            ip_address=a.ip_address, fecha_creacion=a.fecha_creacion,
        ) for a in items],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


# ── Reportes PDF ──

@router.get("/reportes/ventas/pdf")
async def download_ventas_pdf(
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PDFService(db)
    pdf_bytes = await service.generar_reporte_ventas()

    import io
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=reporte_ventas.pdf"},
    )
