"""
Modelos ORM del proyecto.
Importar todos los modelos aquí para que Alembic los detecte.
"""

from app.models.usuario import Usuario  # noqa: F401
from app.models.categoria import Categoria  # noqa: F401
from app.models.marca import Marca  # noqa: F401
from app.models.producto import Producto, ProductoEspecificacion  # noqa: F401
from app.models.direccion import Direccion  # noqa: F401
from app.models.carrito import Carrito, CarritoItem  # noqa: F401
from app.models.pedido import Pedido, PedidoItem, PedidoHistorial  # noqa: F401
from app.models.pago import Pago  # noqa: F401
from app.models.inventario import MovimientoInventario  # noqa: F401
from app.models.sesion import SesionUsuario  # noqa: F401
from app.models.auditoria import AdminAuditoria  # noqa: F401
from app.models.cupon import CuponDescuento  # noqa: F401
