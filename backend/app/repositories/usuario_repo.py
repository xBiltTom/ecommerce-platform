"""
Repositorio de acceso a datos para usuarios.
"""

from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.usuario import Usuario


class UsuarioRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> Usuario | None:
        result = await self.db.execute(select(Usuario).where(Usuario.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Usuario | None:
        result = await self.db.execute(select(Usuario).where(Usuario.email == email))
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Usuario:
        usuario = Usuario(**kwargs)
        self.db.add(usuario)
        await self.db.flush()
        return usuario

    async def update(self, usuario: Usuario, **kwargs) -> Usuario:
        for key, value in kwargs.items():
            if value is not None:
                setattr(usuario, key, value)
        await self.db.flush()
        return usuario

    async def update_last_login(self, usuario: Usuario) -> None:
        usuario.ultimo_login = datetime.now(timezone.utc)
        await self.db.flush()

    async def list_all(
        self,
        page: int = 1,
        page_size: int = 20,
        rol: str | None = None,
        activo: bool | None = None,
        buscar: str | None = None,
    ) -> tuple[list[Usuario], int]:
        query = select(Usuario)
        count_query = select(func.count()).select_from(Usuario)

        if rol:
            query = query.where(Usuario.rol == rol)
            count_query = count_query.where(Usuario.rol == rol)
        if activo is not None:
            query = query.where(Usuario.activo == activo)
            count_query = count_query.where(Usuario.activo == activo)
        if buscar:
            search = f"%{buscar}%"
            search_filter = (
                Usuario.nombre.ilike(search)
                | Usuario.apellido.ilike(search)
                | Usuario.email.ilike(search)
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(Usuario.fecha_creacion.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def count_new_this_month(self) -> int:
        now = datetime.now(timezone.utc)
        first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        result = await self.db.execute(
            select(func.count()).select_from(Usuario).where(Usuario.fecha_creacion >= first_day)
        )
        return result.scalar() or 0

    async def count_total(self) -> int:
        result = await self.db.execute(select(func.count()).select_from(Usuario))
        return result.scalar() or 0
