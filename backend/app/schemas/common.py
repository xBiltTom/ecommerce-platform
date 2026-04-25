"""
Schemas comunes reutilizables en toda la API.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class MessageResponse(BaseModel):
    """Respuesta genérica con un mensaje."""
    message: str


class PaginatedResponse(BaseModel, Generic[T]):
    """Respuesta paginada genérica."""
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginationParams(BaseModel):
    """Parámetros de paginación."""
    page: int = 1
    page_size: int = 20
