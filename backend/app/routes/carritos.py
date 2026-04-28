"""
Rutas del carrito de compras.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.usuario import Usuario
from app.schemas.carrito import CarritoItemAddRequest, CarritoItemUpdateRequest, CarritoResponse, CarritoItemResponse
from app.schemas.common import MessageResponse
from app.services.carrito_service import CarritoService

router = APIRouter(prefix="/carrito", tags=["Carrito"])


def _build_cart_response(carrito) -> dict:
    items = []
    total = 0.0
    for item in (carrito.items or []):
        subtotal = float(item.precio_unitario) * item.cantidad
        total += subtotal
        items.append(CarritoItemResponse(
            id=item.id,
            producto_id=item.producto_id,
            producto_nombre=item.producto.nombre if item.producto else None,
            producto_sku=item.producto.sku if item.producto else None,
            producto_imagen=item.producto.imagen_url if item.producto else None,
            producto_stock_disponible=(
                item.producto.stock_fisico - item.producto.stock_reservado
                if item.producto
                else None
            ),
            cantidad=item.cantidad,
            precio_unitario=float(item.precio_unitario),
            subtotal=subtotal,
            fecha_creacion=item.fecha_creacion,
        ))
    return {
        "id": carrito.id,
        "estado": carrito.estado,
        "items": items,
        "total": round(total, 2),
        "fecha_creacion": carrito.fecha_creacion,
    }


@router.get("", response_model=CarritoResponse)
async def get_carrito(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CarritoService(db)
    carrito = await service.get_active_cart(current_user.id)
    return CarritoResponse(**_build_cart_response(carrito))


@router.post("/items", response_model=CarritoResponse)
async def add_item(
    body: CarritoItemAddRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CarritoService(db)
    carrito = await service.add_item(current_user.id, body.producto_id, body.cantidad)
    return CarritoResponse(**_build_cart_response(carrito))


@router.put("/items/{item_id}", response_model=CarritoResponse)
async def update_item(
    item_id: int,
    body: CarritoItemUpdateRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CarritoService(db)
    carrito = await service.update_item(current_user.id, item_id, body.cantidad)
    return CarritoResponse(**_build_cart_response(carrito))


@router.delete("/items/{item_id}", response_model=MessageResponse)
async def remove_item(
    item_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CarritoService(db)
    await service.remove_item(current_user.id, item_id)
    return MessageResponse(message="Item eliminado del carrito")


@router.delete("", response_model=MessageResponse)
async def clear_carrito(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CarritoService(db)
    await service.clear_cart(current_user.id)
    return MessageResponse(message="Carrito vaciado")
