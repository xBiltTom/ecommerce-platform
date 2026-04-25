"""
Modelo ORM para la tabla 'movimientos_inventario'.
"""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MovimientoInventario(Base):
    __tablename__ = "movimientos_inventario"

    id: Mapped[int] = mapped_column(sa.BigInteger, primary_key=True, autoincrement=True)
    producto_id: Mapped[int] = mapped_column(
        sa.Integer, sa.ForeignKey("productos.id", ondelete="CASCADE"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(
        sa.Enum(
            "entrada", "salida", "reserva", "liberacion_reserva", "ajuste",
            name="tipo_movimiento_inventario", create_type=False,
        ),
        nullable=False,
    )
    cantidad: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    stock_fisico_anterior: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    stock_fisico_nuevo: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    stock_reservado_anterior: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    stock_reservado_nuevo: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    motivo: Mapped[str | None] = mapped_column(sa.Text)
    pedido_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("pedidos.id", ondelete="SET NULL")
    )
    realizado_por: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    fecha_creacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    producto = relationship("Producto", lazy="selectin")

    def __repr__(self) -> str:
        return f"<MovimientoInventario {self.tipo} – producto={self.producto_id}>"
