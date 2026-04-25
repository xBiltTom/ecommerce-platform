"""
Modelo ORM para la tabla 'pagos'.
"""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Pago(Base):
    __tablename__ = "pagos"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=sa.text("uuid_generate_v4()")
    )
    pedido_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False
    )
    metodo: Mapped[str] = mapped_column(
        sa.Enum("tarjeta", "transferencia", "efectivo", "paypal", "otro", name="metodo_pago", create_type=False),
        nullable=False,
    )
    estado: Mapped[str] = mapped_column(
        sa.Enum(
            "pendiente", "autorizado", "pagado", "fallido", "reembolsado", "cancelado",
            name="estado_pago", create_type=False,
        ),
        nullable=False,
        server_default="pendiente",
    )
    monto: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    moneda: Mapped[str] = mapped_column(sa.CHAR(3), nullable=False, server_default="PEN")
    referencia_externa: Mapped[str | None] = mapped_column(sa.String(150), unique=True)
    detalle_respuesta: Mapped[str | None] = mapped_column(sa.Text)
    fecha_pago: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    fecha_creacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    pedido = relationship("Pedido", back_populates="pagos")

    def __repr__(self) -> str:
        return f"<Pago {self.id} – {self.metodo} – {self.estado}>"
