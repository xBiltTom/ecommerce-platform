"""
add cupones_descuento table

Revision ID: 001
Revises: 
Create Date: 2026-04-27 18:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    tipo_descuento_enum = postgresql.ENUM(
        'porcentaje',
        'monto_fijo',
        name='tipo_descuento',
        create_type=False,
    )
    tipo_descuento_enum.create(bind, checkfirst=True)

    existing_tables = set(inspector.get_table_names())

    if 'cupones_descuento' not in existing_tables:
        op.create_table(
            'cupones_descuento',
            sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
            sa.Column('codigo', sa.String(length=50), nullable=False),
            sa.Column('tipo_descuento', postgresql.ENUM('porcentaje', 'monto_fijo', name='tipo_descuento', create_type=False), nullable=False),
            sa.Column('valor', sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column('fecha_expiracion', sa.DateTime(timezone=True), nullable=False),
            sa.Column('usado', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('pedido_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('fecha_uso', sa.DateTime(timezone=True), nullable=True),
            sa.Column('creado_por', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('fecha_creacion', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
            sa.Column('fecha_actualizacion', sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
            sa.ForeignKeyConstraint(['creado_por'], ['usuarios.id'], ondelete='RESTRICT'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('codigo')
        )

    pedidos_columns = {column['name'] for column in inspector.get_columns('pedidos')}
    if 'cupon_id' not in pedidos_columns:
        op.add_column('pedidos', sa.Column('cupon_id', postgresql.UUID(as_uuid=True), nullable=True))

    pedidos_foreign_keys = {fk['name'] for fk in inspector.get_foreign_keys('pedidos') if fk['name']}
    if 'fk_pedidos_cupon_id' not in pedidos_foreign_keys:
        op.create_foreign_key(
            'fk_pedidos_cupon_id',
            'pedidos', 'cupones_descuento',
            ['cupon_id'], ['id'],
            ondelete='SET NULL'
        )

    existing_indexes = {index['name'] for index in inspector.get_indexes('cupones_descuento')}
    if 'idx_cupones_codigo' not in existing_indexes:
        op.create_index('idx_cupones_codigo', 'cupones_descuento', [sa.text('lower(codigo)')], unique=False, postgresql_using='btree')
    if 'idx_cupones_usado' not in existing_indexes:
        op.create_index('idx_cupones_usado', 'cupones_descuento', ['usado'], unique=False)
    if 'idx_cupones_fecha_expiracion' not in existing_indexes:
        op.create_index('idx_cupones_fecha_expiracion', 'cupones_descuento', ['fecha_expiracion'], unique=False)

    pedidos_indexes = {index['name'] for index in inspector.get_indexes('pedidos')}
    if 'idx_pedidos_cupon_id' not in pedidos_indexes:
        op.create_index('idx_pedidos_cupon_id', 'pedidos', ['cupon_id'], unique=False)

    trigger_exists = bind.execute(
        sa.text(
            """
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'trg_cupones_descuento_fecha_actualizacion'
            """
        )
    ).scalar()
    if not trigger_exists:
        op.execute("""
            CREATE TRIGGER trg_cupones_descuento_fecha_actualizacion
            BEFORE UPDATE ON cupones_descuento
            FOR EACH ROW
            EXECUTE FUNCTION actualizar_fecha_actualizacion();
        """)


def downgrade() -> None:
    op.drop_index('idx_pedidos_cupon_id', table_name='pedidos')
    op.drop_index('idx_cupones_fecha_expiracion', table_name='cupones_descuento')
    op.drop_index('idx_cupones_usado', table_name='cupones_descuento')
    op.drop_index('idx_cupones_codigo', table_name='cupones_descuento')
    op.drop_constraint('fk_pedidos_cupon_id', 'pedidos', type_='foreignkey')
    op.drop_column('pedidos', 'cupon_id')
    op.drop_table('cupones_descuento')
    op.execute("DROP TYPE IF EXISTS tipo_descuento")
