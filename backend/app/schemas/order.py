from pydantic import BaseModel


class OrderResponse(BaseModel):
    id: str
    estado: str
    total: float
