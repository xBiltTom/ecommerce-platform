"""
Modelo ORM para la tabla 'cupones_descuento'.
"""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CuponDescuento(Base):
    __tablename__ = "cupones_descuento"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=sa.text("uuid_generate_v4()")
    )
    codigo: Mapped[str] = mapped_column(sa.String(50), unique=True, nullable=False)
    tipo_descuento: Mapped[str] = mapped_column(
        sa.Enum("porcentaje", "monto_fijo", name="tipo_descuento", create_type=False),
        nullable=False,
    )
    valor: Mapped[float] = mapped_column(sa.Numeric(10, 2), nullable=False)
    fecha_expiracion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False
    )
    usado: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("false"))
    activo: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("true"))
    pedido_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), nullable=True
    )
    fecha_uso: Mapped[datetime | None] = mapped_column(
        sa.DateTime(timezone=True), nullable=True
    )
    creado_por: Mapped[str] = mapped_column(
        UUID(as_uuid=False), sa.ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False
    )
    fecha_creacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()
    )

    # ── Relationships ──
    creador = relationship("Usuario", lazy="joined")

    def __repr__(self) -> str:
        return f"<CuponDescuento {self.codigo} – {self.tipo_descuento} {self.valor}>"
