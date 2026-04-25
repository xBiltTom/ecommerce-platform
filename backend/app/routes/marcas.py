"""
Rutas de marcas.
"""

import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.usuario import Usuario
from app.schemas.marca import MarcaCreateRequest, MarcaUpdateRequest, MarcaResponse
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.marca_service import MarcaService

router = APIRouter(prefix="/marcas", tags=["Marcas"])


@router.get("", response_model=PaginatedResponse[MarcaResponse])
async def list_marcas(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    service = MarcaService(db)
    items, total = await service.list_all(page, page_size)
    return PaginatedResponse(
        items=[MarcaResponse.model_validate(m) for m in items],
        total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/{marca_id}", response_model=MarcaResponse)
async def get_marca(marca_id: int, db: AsyncSession = Depends(get_db)):
    service = MarcaService(db)
    return await service.get(marca_id)


@router.post("", response_model=MarcaResponse, status_code=201)
async def create_marca(
    body: MarcaCreateRequest,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = MarcaService(db)
    return await service.create(nombre=body.nombre)


@router.put("/{marca_id}", response_model=MarcaResponse)
async def update_marca(
    marca_id: int,
    body: MarcaUpdateRequest,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = MarcaService(db)
    return await service.update(marca_id, **body.model_dump(exclude_unset=True))


@router.delete("/{marca_id}", response_model=MessageResponse)
async def delete_marca(
    marca_id: int,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    service = MarcaService(db)
    await service.soft_delete(marca_id)
    return MessageResponse(message="Marca desactivada")
