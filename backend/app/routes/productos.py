"""
Rutas de productos.
"""

import math

from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin, get_optional_user
from app.models.usuario import Usuario
from app.schemas.producto import (
    ProductoCreateRequest, ProductoUpdateRequest, ProductoResponse,
    ProductoListResponse, EspecificacionSchema,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.producto_service import ProductoService
from app.services.imagen_service import ImagenService

router = APIRouter(prefix="/productos", tags=["Productos"])


def _build_response(p) -> dict:
    """Construye un dict de respuesta desde un modelo Producto."""
    return {
        "id": p.id, "sku": p.sku, "nombre": p.nombre, "slug": p.slug,
        "descripcion": p.descripcion, "precio": float(p.precio),
        "precio_oferta": float(p.precio_oferta) if p.precio_oferta else None,
        "stock_fisico": p.stock_fisico, "stock_reservado": p.stock_reservado,
        "stock_disponible": p.stock_fisico - p.stock_reservado,
        "stock_minimo": p.stock_minimo,
        "categoria_id": p.categoria_id, "marca_id": p.marca_id,
        "categoria_nombre": p.categoria.nombre if p.categoria else None,
        "marca_nombre": p.marca.nombre if p.marca else None,
        "imagen_url": p.imagen_url, "activo": p.activo,
        "especificaciones": [{"clave": e.clave, "valor": e.valor} for e in (p.especificaciones or [])],
        "fecha_creacion": p.fecha_creacion,
    }


def _build_list_response(p) -> dict:
    return {
        "id": p.id, "sku": p.sku, "nombre": p.nombre, "slug": p.slug,
        "precio": float(p.precio),
        "precio_oferta": float(p.precio_oferta) if p.precio_oferta else None,
        "stock_disponible": p.stock_fisico - p.stock_reservado,
        "stock_minimo": p.stock_minimo,
        "categoria_nombre": p.categoria.nombre if p.categoria else None,
        "marca_nombre": p.marca.nombre if p.marca else None,
        "imagen_url": p.imagen_url, "activo": p.activo,
    }


@router.get("", response_model=PaginatedResponse[ProductoListResponse])
async def list_productos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    categoria_id: int | None = None,
    marca_id: int | None = None,
    precio_min: float | None = None,
    precio_max: float | None = None,
    en_oferta: bool | None = None,
    buscar: str | None = None,
    orden: str = "reciente",
    activo: bool | None = None,
    user: Usuario | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    is_admin = user and user.rol == "admin"
    if not is_admin:
        solo_activos = True
        activo = True
    else:
        solo_activos = (activo is not None)

    service = ProductoService(db)
    items, total, meta = await service.list_all(
        page=page, page_size=page_size, categoria_id=categoria_id,
        marca_id=marca_id, precio_min=precio_min, precio_max=precio_max,
        buscar=buscar, orden=orden, solo_activos=solo_activos, activo=activo,
        en_oferta=en_oferta,
    )
    return PaginatedResponse(
        items=[ProductoListResponse(**_build_list_response(p)) for p in items],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
        meta=meta
    )


@router.get("/{slug}", response_model=ProductoResponse)
async def get_producto(slug: str, db: AsyncSession = Depends(get_db)):
    service = ProductoService(db)
    p = await service.get_by_slug(slug)
    return ProductoResponse(**_build_response(p))


@router.post("", response_model=ProductoResponse, status_code=201)
async def create_producto(
    body: ProductoCreateRequest,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = ProductoService(db)
    p = await service.create(body.model_dump())
    return ProductoResponse(**_build_response(p))


@router.put("/{producto_id}", response_model=ProductoResponse)
async def update_producto(
    producto_id: int,
    body: ProductoUpdateRequest,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = ProductoService(db)
    p = await service.update(producto_id, body.model_dump(exclude_unset=True))
    return ProductoResponse(**_build_response(p))


@router.post("/{producto_id}/imagen", response_model=ProductoResponse)
async def upload_imagen(
    producto_id: int,
    file: UploadFile = File(...),
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    imagen_url = await ImagenService.upload(file)
    service = ProductoService(db)
    p = await service.update_imagen(producto_id, imagen_url)
    return ProductoResponse(**_build_response(p))


@router.delete("/{producto_id}", response_model=MessageResponse)
async def delete_producto(
    producto_id: int,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = ProductoService(db)
    await service.soft_delete(producto_id)
    return MessageResponse(message="Producto desactivado")


@router.post("/{producto_id}/especificaciones", response_model=MessageResponse)
async def add_especificacion(
    producto_id: int,
    body: EspecificacionSchema,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = ProductoService(db)
    await service.add_especificacion(producto_id, body.clave, body.valor)
    return MessageResponse(message="Especificación guardada")


@router.delete("/{producto_id}/especificaciones/{clave}", response_model=MessageResponse)
async def delete_especificacion(
    producto_id: int,
    clave: str,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = ProductoService(db)
    await service.delete_especificacion(producto_id, clave)
    return MessageResponse(message="Especificación eliminada")
