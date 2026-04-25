"""
Modelos ORM para las tablas 'productos' y 'productos_especificaciones'.
"""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, autoincrement=True)
    sku: Mapped[str] = mapped_column(sa.String(50), nullable=False, unique=True)
    nombre: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    slug: Mapped[str] = mapped_column(sa.String(300), nullable=False, unique=True)
    descripcion: Mapped[str | None] = mapped_column(sa.Text)
    precio: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    precio_oferta: Mapped[float | None] = mapped_column(sa.Numeric(10, 2))
    stock_fisico: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default=sa.text("0"))
    stock_reservado: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default=sa.text("0"))
    stock_minimo: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default=sa.text("0"))
    categoria_id: Mapped[int | None] = mapped_column(sa.Integer, sa.ForeignKey("categorias.id", ondelete="SET NULL"))
    marca_id: Mapped[int | None] = mapped_column(sa.Integer, sa.ForeignKey("marcas.id", ondelete="SET NULL"))
    imagen_url: Mapped[str | None] = mapped_column(sa.Text)
    activo: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("true"))
    fecha_creacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    categoria = relationship("Categoria", back_populates="productos", lazy="selectin")
    marca = relationship("Marca", back_populates="productos", lazy="selectin")
    especificaciones = relationship(
        "ProductoEspecificacion", back_populates="producto", lazy="selectin", cascade="all, delete-orphan"
    )

    @hybrid_property
    def stock_disponible(self) -> int:
        """Stock disponible para venta = físico - reservado."""
        return self.stock_fisico - self.stock_reservado

    def __repr__(self) -> str:
        return f"<Producto {self.sku} – {self.nombre}>"


class ProductoEspecificacion(Base):
    __tablename__ = "productos_especificaciones"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, autoincrement=True)
    producto_id: Mapped[int] = mapped_column(
        sa.Integer, sa.ForeignKey("productos.id", ondelete="CASCADE"), nullable=False
    )
    clave: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    valor: Mapped[str] = mapped_column(sa.String(255), nullable=False)

    # ── Relationships ──
    producto = relationship("Producto", back_populates="especificaciones")

    def __repr__(self) -> str:
        return f"<Especificacion {self.clave}={self.valor}>"
