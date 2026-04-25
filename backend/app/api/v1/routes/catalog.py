from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.brand import Marca
from app.models.category import Categoria
from app.models.product import Producto
from app.schemas.catalog import BrandResponse, CategoryResponse, ProductResponse


router = APIRouter()


@router.get("/categories", response_model=list[CategoryResponse])
async def get_categories(db: Annotated[AsyncSession, Depends(get_db_session)]) -> list[CategoryResponse]:
    result = await db.execute(select(Categoria).where(Categoria.activo.is_(True)).order_by(Categoria.nombre.asc()))
    categories = result.scalars().all()
    return [CategoryResponse(id=c.id, nombre=c.nombre, slug=c.slug) for c in categories]


@router.get("/brands", response_model=list[BrandResponse])
async def get_brands(db: Annotated[AsyncSession, Depends(get_db_session)]) -> list[BrandResponse]:
    result = await db.execute(select(Marca).where(Marca.activo.is_(True)).order_by(Marca.nombre.asc()))
    brands = result.scalars().all()
    return [BrandResponse(id=b.id, nombre=b.nombre, slug=b.slug) for b in brands]


@router.get("/products", response_model=list[ProductResponse])
async def get_products(db: Annotated[AsyncSession, Depends(get_db_session)]) -> list[ProductResponse]:
    result = await db.execute(
        select(Producto).where(Producto.activo.is_(True)).order_by(Producto.fecha_creacion.desc()).limit(50)
    )
    products = result.scalars().all()

    return [
        ProductResponse(
            id=p.id,
            sku=p.sku,
            nombre=p.nombre,
            slug=p.slug,
            precio=float(p.precio),
            precio_oferta=float(p.precio_oferta) if p.precio_oferta is not None else None,
            stock_disponible=max(0, int(p.stock_fisico) - int(p.stock_reservado)),
        )
        for p in products
    ]


@router.get("/products/{slug}", response_model=ProductResponse)
async def get_product_detail(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ProductResponse:
    result = await db.execute(select(Producto).where(Producto.slug == slug, Producto.activo.is_(True)))
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    return ProductResponse(
        id=product.id,
        sku=product.sku,
        nombre=product.nombre,
        slug=product.slug,
        precio=float(product.precio),
        precio_oferta=float(product.precio_oferta) if product.precio_oferta is not None else None,
        stock_disponible=max(0, int(product.stock_fisico) - int(product.stock_reservado)),
    )
