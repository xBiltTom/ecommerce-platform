"""
add activo to cupones_descuento

Revision ID: 002
Revises: 001
Create Date: 2026-04-27 22:40:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column['name'] for column in inspector.get_columns('cupones_descuento')}

    if 'activo' not in columns:
        op.add_column(
            'cupones_descuento',
            sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column['name'] for column in inspector.get_columns('cupones_descuento')}

    if 'activo' in columns:
        op.drop_column('cupones_descuento', 'activo')
