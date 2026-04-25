import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db_session
from app.models.cart import Carrito, CarritoItem, EstadoCarrito
from app.models.product import Producto
from app.models.user import Usuario
from app.schemas.cart import CartItemRequest, CartItemResponse, CartResponse


router = APIRouter()


async def _get_or_create_active_cart(db: AsyncSession, user_id: uuid.UUID) -> Carrito:
    result = await db.execute(
        select(Carrito).where(Carrito.usuario_id == user_id, Carrito.estado == EstadoCarrito.ACTIVO)
    )
    cart = result.scalar_one_or_none()
    if cart is not None:
        return cart

    cart = Carrito(usuario_id=user_id, estado=EstadoCarrito.ACTIVO)
    db.add(cart)
    await db.commit()
    await db.refresh(cart)
    return cart


@router.get("", response_model=CartResponse)
async def get_my_cart(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> CartResponse:
    cart = await _get_or_create_active_cart(db, current_user.id)
    items_result = await db.execute(
        select(CarritoItem, Producto)
        .join(Producto, Producto.id == CarritoItem.producto_id)
        .where(CarritoItem.carrito_id == cart.id)
    )

    items = []
    subtotal = Decimal("0")
    for cart_item, product in items_result.all():
        line_subtotal = Decimal(cart_item.precio_unitario) * cart_item.cantidad
        subtotal += line_subtotal
        items.append(
            CartItemResponse(
                producto_id=cart_item.producto_id,
                nombre=product.nombre,
                cantidad=cart_item.cantidad,
                precio_unitario=float(cart_item.precio_unitario),
                subtotal=float(line_subtotal),
            )
        )

    return CartResponse(
        carrito_id=cart.id,
        estado=cart.estado.value,
        items=items,
        subtotal=float(subtotal),
        total=float(subtotal),
    )


@router.post("/items", response_model=CartResponse)
async def add_item_to_cart(
    payload: CartItemRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> CartResponse:
    if payload.cantidad <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cantidad invalida")

    product_result = await db.execute(select(Producto).where(Producto.id == payload.producto_id, Producto.activo.is_(True)))
    product = product_result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    stock_disponible = int(product.stock_fisico) - int(product.stock_reservado)
    if payload.cantidad > stock_disponible:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stock insuficiente")

    cart = await _get_or_create_active_cart(db, current_user.id)
    existing_result = await db.execute(
        select(CarritoItem).where(CarritoItem.carrito_id == cart.id, CarritoItem.producto_id == payload.producto_id)
    )
    existing_item = existing_result.scalar_one_or_none()

    if existing_item is None:
        db.add(
            CarritoItem(
                carrito_id=cart.id,
                producto_id=payload.producto_id,
                cantidad=payload.cantidad,
                precio_unitario=product.precio_oferta if product.precio_oferta is not None else product.precio,
            )
        )
    else:
        new_quantity = existing_item.cantidad + payload.cantidad
        if new_quantity > stock_disponible:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stock insuficiente")
        existing_item.cantidad = new_quantity

    await db.commit()
    return await get_my_cart(db, current_user)
