"""
Modelo ORM para la tabla 'direcciones'.
"""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Direccion(Base):
    __tablename__ = "direcciones"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    titulo: Mapped[str] = mapped_column(sa.String(50), nullable=False, server_default="Casa")
    destinatario_nombre: Mapped[str | None] = mapped_column(sa.String(120))
    telefono_contacto: Mapped[str | None] = mapped_column(sa.String(30))
    direccion: Mapped[str] = mapped_column(sa.Text, nullable=False)
    ciudad: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    pais: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    codigo_postal: Mapped[str | None] = mapped_column(sa.String(20))
    referencia: Mapped[str | None] = mapped_column(sa.Text)
    es_principal: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("false"))
    fecha_creacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    usuario = relationship("Usuario", back_populates="direcciones")

    def __repr__(self) -> str:
        return f"<Direccion {self.titulo} – {self.ciudad}>"
