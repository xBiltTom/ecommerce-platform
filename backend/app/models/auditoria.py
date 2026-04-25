"""
Modelo ORM para la tabla 'admin_auditoria'.
"""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID, INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AdminAuditoria(Base):
    __tablename__ = "admin_auditoria"

    id: Mapped[int] = mapped_column(sa.BigInteger, primary_key=True, autoincrement=True)
    admin_usuario_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False
    )
    entidad: Mapped[str] = mapped_column(sa.String(80), nullable=False)
    entidad_id: Mapped[str] = mapped_column(sa.String(80), nullable=False)
    accion: Mapped[str] = mapped_column(sa.String(80), nullable=False)
    detalle: Mapped[dict | None] = mapped_column(JSONB)
    ip_address: Mapped[str | None] = mapped_column(INET)
    fecha_creacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    admin = relationship("Usuario", lazy="selectin")

    def __repr__(self) -> str:
        return f"<AdminAuditoria {self.accion} on {self.entidad}:{self.entidad_id}>"
