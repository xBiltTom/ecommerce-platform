from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: int
    nombre: str
    slug: str


class BrandResponse(BaseModel):
    id: int
    nombre: str
    slug: str


class ProductResponse(BaseModel):
    id: int
    sku: str
    nombre: str
    slug: str
    precio: float
    precio_oferta: float | None = None
    stock_disponible: int
