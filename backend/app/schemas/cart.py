from pydantic import BaseModel


class CartItemRequest(BaseModel):
    producto_id: int
    cantidad: int


class CartItemResponse(BaseModel):
    producto_id: int
    nombre: str
    cantidad: int
    precio_unitario: float
    subtotal: float


class CartResponse(BaseModel):
    carrito_id: int
    estado: str
    items: list[CartItemResponse]
    subtotal: float
    total: float
