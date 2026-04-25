"""
Rutas de direcciones del cliente.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.usuario import Usuario
from app.schemas.direccion import DireccionCreateRequest, DireccionUpdateRequest, DireccionResponse
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/direcciones", tags=["Direcciones"])


@router.get("", response_model=list[DireccionResponse])
async def list_direcciones(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.direccion_service import DireccionService
    service = DireccionService(db)
    return await service.list_by_user(current_user.id)


@router.post("", response_model=DireccionResponse, status_code=201)
async def create_direccion(
    body: DireccionCreateRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.direccion_service import DireccionService
    service = DireccionService(db)
    return await service.create(current_user.id, body.model_dump())


@router.put("/{direccion_id}", response_model=DireccionResponse)
async def update_direccion(
    direccion_id: int,
    body: DireccionUpdateRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.direccion_service import DireccionService
    service = DireccionService(db)
    return await service.update(direccion_id, current_user.id, body.model_dump(exclude_unset=True))


@router.delete("/{direccion_id}", response_model=MessageResponse)
async def delete_direccion(
    direccion_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.direccion_service import DireccionService
    service = DireccionService(db)
    await service.delete(direccion_id, current_user.id)
    return MessageResponse(message="Dirección eliminada")


@router.put("/{direccion_id}/principal", response_model=DireccionResponse)
async def set_principal(
    direccion_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.direccion_service import DireccionService
    service = DireccionService(db)
    return await service.set_principal(direccion_id, current_user.id)
