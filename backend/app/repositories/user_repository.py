from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import Usuario


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_email(self, email: str) -> Usuario | None:
        stmt: Select[tuple[Usuario]] = select(Usuario).where(Usuario.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> Usuario | None:
        stmt: Select[tuple[Usuario]] = select(Usuario).where(Usuario.id == user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, user: Usuario) -> Usuario:
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user
