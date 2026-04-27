"""
Repositorio de acceso a datos para productos.
"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.producto import Producto, ProductoEspecificacion


class ProductoRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, producto_id: int) -> Producto | None:
        result = await self.db.execute(select(Producto).where(Producto.id == producto_id))
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Producto | None:
        result = await self.db.execute(select(Producto).where(Producto.slug == slug))
        return result.scalar_one_or_none()

    async def get_by_sku(self, sku: str) -> Producto | None:
        result = await self.db.execute(select(Producto).where(Producto.sku == sku))
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Producto:
        producto = Producto(**kwargs)
        self.db.add(producto)
        await self.db.flush()
        return producto

    async def update(self, producto: Producto, **kwargs) -> Producto:
        for key, value in kwargs.items():
            if value is not None:
                setattr(producto, key, value)
        await self.db.flush()
        return producto

    async def list_all(
        self,
        page: int = 1,
        page_size: int = 20,
        categoria_id: int | None = None,
        marca_id: int | None = None,
        precio_min: float | None = None,
        precio_max: float | None = None,
        buscar: str | None = None,
        solo_activos: bool = True,
        activo: bool | None = None,
        en_oferta: bool | None = None,
        orden: str = "reciente",
    ) -> tuple[list[Producto], int, dict]:
        query = select(Producto)
        count_query = select(func.count()).select_from(Producto)

        # Múltiples counts para estadísticas del panel superior
        from sqlalchemy import case
        stats_query = select(
            func.sum(case((Producto.activo == True, 1), else_=0)).label("activos"),
            func.sum(case(((Producto.stock_fisico - Producto.stock_reservado) <= 0, 1), else_=0)).label("agotados"),
            func.sum(case(
                (
                    ((Producto.stock_fisico - Producto.stock_reservado) > 0) & 
                    ((Producto.stock_fisico - Producto.stock_reservado) <= Producto.stock_minimo), 
                    1
                ), 
                else_=0
            )).label("bajo_stock")
        ).select_from(Producto)

        filters = []
        if activo is not None:
            filters.append(Producto.activo == activo)
        elif solo_activos:
            filters.append(Producto.activo == True)  # noqa: E712
        if categoria_id:
            filters.append(Producto.categoria_id == categoria_id)
        if marca_id:
            filters.append(Producto.marca_id == marca_id)
        if precio_min is not None:
            filters.append(Producto.precio >= precio_min)
        if precio_max is not None:
            filters.append(Producto.precio <= precio_max)
        if buscar:
            search = f"%{buscar}%"
            filters.append(Producto.nombre.ilike(search) | Producto.sku.ilike(search))
        if en_oferta is not None:
            if en_oferta:
                filters.append(Producto.precio_oferta.isnot(None))
            else:
                filters.append(Producto.precio_oferta.is_(None))

        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)
            stats_query = stats_query.where(f)

        total = (await self.db.execute(count_query)).scalar() or 0

        stats_result = await self.db.execute(stats_query)
        stats_row = stats_result.fetchone()
        
        meta = {
            "activos": int(stats_row.activos or 0) if stats_row else 0,
            "agotados": int(stats_row.agotados or 0) if stats_row else 0,
            "bajo_stock": int(stats_row.bajo_stock or 0) if stats_row else 0,
        }

        # Ordenamiento
        order_map = {
            "reciente": Producto.fecha_creacion.desc(),
            "antiguo": Producto.fecha_creacion.asc(),
            "precio_asc": Producto.precio.asc(),
            "precio_desc": Producto.precio.desc(),
            "nombre_asc": Producto.nombre.asc(),
            "nombre_desc": Producto.nombre.desc(),
        }
        query = query.order_by(order_map.get(orden, Producto.fecha_creacion.desc()))
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        return list(result.scalars().all()), total, meta

    async def count_activos(self) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Producto).where(Producto.activo == True)  # noqa: E712
        )
        return result.scalar() or 0

    async def get_bajo_stock(self, page: int = 1, page_size: int = 20) -> tuple[list[Producto], int]:
        """Productos con stock_disponible <= stock_minimo."""
        condition = (Producto.stock_fisico - Producto.stock_reservado) <= Producto.stock_minimo
        query = select(Producto).where(Producto.activo == True, condition)  # noqa: E712
        count_query = select(func.count()).select_from(Producto).where(Producto.activo == True, condition)  # noqa: E712

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by((Producto.stock_fisico - Producto.stock_reservado).asc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    # ── Especificaciones ──
    async def add_especificacion(self, producto_id: int, clave: str, valor: str) -> ProductoEspecificacion:
        # Verificar si ya existe
        result = await self.db.execute(
            select(ProductoEspecificacion).where(
                ProductoEspecificacion.producto_id == producto_id,
                ProductoEspecificacion.clave == clave,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.valor = valor
            await self.db.flush()
            return existing

        esp = ProductoEspecificacion(producto_id=producto_id, clave=clave, valor=valor)
        self.db.add(esp)
        await self.db.flush()
        return esp

    async def delete_especificacion(self, producto_id: int, clave: str) -> bool:
        result = await self.db.execute(
            select(ProductoEspecificacion).where(
                ProductoEspecificacion.producto_id == producto_id,
                ProductoEspecificacion.clave == clave,
            )
        )
        esp = result.scalar_one_or_none()
        if not esp:
            return False
        await self.db.delete(esp)
        await self.db.flush()
        return True
