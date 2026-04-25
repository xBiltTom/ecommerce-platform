"""
Rutas de categorías.
"""

import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.usuario import Usuario
from app.schemas.categoria import CategoriaCreateRequest, CategoriaUpdateRequest, CategoriaResponse
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.categoria_service import CategoriaService

router = APIRouter(prefix="/categorias", tags=["Categorías"])


@router.get("", response_model=PaginatedResponse[CategoriaResponse])
async def list_categorias(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = CategoriaService(db)
    items, total = await service.list_all(page, page_size)
    return PaginatedResponse(
        items=[CategoriaResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/{categoria_id}", response_model=CategoriaResponse)
async def get_categoria(categoria_id: int, db: AsyncSession = Depends(get_db)):
    service = CategoriaService(db)
    return await service.get(categoria_id)


@router.post("", response_model=CategoriaResponse, status_code=201)
async def create_categoria(
    body: CategoriaCreateRequest,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = CategoriaService(db)
    return await service.create(nombre=body.nombre, descripcion=body.descripcion)


@router.put("/{categoria_id}", response_model=CategoriaResponse)
async def update_categoria(
    categoria_id: int,
    body: CategoriaUpdateRequest,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = CategoriaService(db)
    return await service.update(categoria_id, **body.model_dump(exclude_unset=True))


@router.delete("/{categoria_id}", response_model=MessageResponse)
async def delete_categoria(
    categoria_id: int,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = CategoriaService(db)
    await service.soft_delete(categoria_id)
    return MessageResponse(message="Categoría desactivada")
