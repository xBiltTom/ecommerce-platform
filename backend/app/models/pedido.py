"""
Modelos ORM para las tablas 'pedidos', 'pedido_items' y 'pedidos_historial'.
"""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Pedido(Base):
    __tablename__ = "pedidos"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=sa.text("uuid_generate_v4()")
    )
    usuario_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("usuarios.id"), nullable=False
    )
    carrito_id: Mapped[int | None] = mapped_column(
        sa.Integer, sa.ForeignKey("carritos.id", ondelete="SET NULL"), unique=True
    )
    direccion_id: Mapped[int | None] = mapped_column(
        sa.Integer, sa.ForeignKey("direcciones.id", ondelete="SET NULL")
    )
    nombre_destinatario: Mapped[str] = mapped_column(sa.String(120), nullable=False)
    telefono_contacto: Mapped[str | None] = mapped_column(sa.String(30))
    direccion_envio: Mapped[str] = mapped_column(sa.Text, nullable=False)
    ciudad_envio: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    pais_envio: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    codigo_postal_envio: Mapped[str | None] = mapped_column(sa.String(20))
    referencia_envio: Mapped[str | None] = mapped_column(sa.Text)
    subtotal: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    descuento: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False, server_default=sa.text("0"))
    costo_envio: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False, server_default=sa.text("0"))
    total: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    cupon_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("cupones_descuento.id", ondelete="SET NULL"), nullable=True
    )
    estado: Mapped[str] = mapped_column(
        sa.Enum(
            "pendiente", "pagado", "en_preparacion", "enviado", "entregado", "cancelado",
            name="estado_pedido", create_type=False,
        ),
        nullable=False,
        server_default="pendiente",
    )
    fecha_creacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    usuario = relationship("Usuario", back_populates="pedidos")
    items = relationship("PedidoItem", back_populates="pedido", lazy="selectin", cascade="all, delete-orphan")
    historial = relationship("PedidoHistorial", back_populates="pedido", lazy="noload", cascade="all, delete-orphan")
    pagos = relationship("Pago", back_populates="pedido", lazy="noload", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Pedido {self.id} – {self.estado}>"


class PedidoItem(Base):
    __tablename__ = "pedido_items"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, autoincrement=True)
    pedido_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int | None] = mapped_column(
        sa.Integer, sa.ForeignKey("productos.id", ondelete="SET NULL")
    )
    sku_producto: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    nombre_producto: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    cantidad: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)

    # ── Relationships ──
    pedido = relationship("Pedido", back_populates="items")
    producto = relationship("Producto", lazy="selectin")

    def __repr__(self) -> str:
        return f"<PedidoItem {self.sku_producto} x{self.cantidad}>"


class PedidoHistorial(Base):
    __tablename__ = "pedidos_historial"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, autoincrement=True)
    pedido_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False
    )
    estado_anterior: Mapped[str | None] = mapped_column(
        sa.Enum(
            "pendiente", "pagado", "en_preparacion", "enviado", "entregado", "cancelado",
            name="estado_pedido", create_type=False,
        ),
    )
    estado_nuevo: Mapped[str] = mapped_column(
        sa.Enum(
            "pendiente", "pagado", "en_preparacion", "enviado", "entregado", "cancelado",
            name="estado_pedido", create_type=False,
        ),
        nullable=False,
    )
    comentario: Mapped[str | None] = mapped_column(sa.Text)
    creado_por: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    fecha_registro: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    pedido = relationship("Pedido", back_populates="historial")

    def __repr__(self) -> str:
        return f"<PedidoHistorial {self.estado_anterior} → {self.estado_nuevo}>"
