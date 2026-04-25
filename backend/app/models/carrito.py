"""
Modelos ORM para las tablas 'carritos' y 'carrito_items'.
"""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Carrito(Base):
    __tablename__ = "carritos"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    estado: Mapped[str] = mapped_column(
        sa.Enum("activo", "finalizado", "abandonado", name="estado_carrito", create_type=False),
        nullable=False,
        server_default="activo",
    )
    fecha_creacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    usuario = relationship("Usuario", back_populates="carritos")
    items = relationship("CarritoItem", back_populates="carrito", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Carrito {self.id} – {self.estado}>"


class CarritoItem(Base):
    __tablename__ = "carrito_items"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, autoincrement=True)
    carrito_id: Mapped[int] = mapped_column(
        sa.Integer, sa.ForeignKey("carritos.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int] = mapped_column(
        sa.Integer, sa.ForeignKey("productos.id"), nullable=False
    )
    cantidad: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    carrito = relationship("Carrito", back_populates="items")
    producto = relationship("Producto", lazy="selectin")

    def __repr__(self) -> str:
        return f"<CarritoItem producto={self.producto_id} x{self.cantidad}>"
