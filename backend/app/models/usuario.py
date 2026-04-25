"""
Modelo ORM para la tabla 'usuarios'.
"""

import enum
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RolUsuario(str, enum.Enum):
    CLIENTE = "cliente"
    ADMIN = "admin"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=sa.text("uuid_generate_v4()")
    )
    email: Mapped[str] = mapped_column(sa.String, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(sa.Text, nullable=False)
    nombre: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    apellido: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    telefono: Mapped[str | None] = mapped_column(sa.String(30))
    rol: Mapped[str] = mapped_column(
        sa.Enum("cliente", "admin", name="rol_usuario", create_type=False),
        nullable=False,
        server_default="cliente",
    )
    activo: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("true"))
    ultimo_login: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    fecha_creacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    direcciones = relationship("Direccion", back_populates="usuario", lazy="selectin")
    carritos = relationship("Carrito", back_populates="usuario", lazy="noload")
    pedidos = relationship("Pedido", back_populates="usuario", lazy="noload")
    sesiones = relationship("SesionUsuario", back_populates="usuario", lazy="noload")

    def __repr__(self) -> str:
        return f"<Usuario {self.email} ({self.rol})>"
