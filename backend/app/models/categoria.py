"""
Modelo ORM para la tabla 'categorias'.
"""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Categoria(Base):
    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    slug: Mapped[str] = mapped_column(sa.String(120), nullable=False, unique=True)
    descripcion: Mapped[str | None] = mapped_column(sa.Text)
    activo: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("true"))
    fecha_creacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    productos = relationship("Producto", back_populates="categoria", lazy="noload")

    def __repr__(self) -> str:
        return f"<Categoria {self.nombre}>"
