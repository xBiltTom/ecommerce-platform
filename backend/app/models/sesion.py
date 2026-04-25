"""
Modelo ORM para la tabla 'sesiones_usuario'.
"""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SesionUsuario(Base):
    __tablename__ = "sesiones_usuario"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=sa.text("uuid_generate_v4()")
    )
    usuario_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    refresh_token_hash: Mapped[str] = mapped_column(sa.Text, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(sa.Text)
    ip_address: Mapped[str | None] = mapped_column(INET)
    expira_en: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)
    revocado_en: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    fecha_creacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    usuario = relationship("Usuario", back_populates="sesiones")

    def __repr__(self) -> str:
        return f"<SesionUsuario {self.id}>"
