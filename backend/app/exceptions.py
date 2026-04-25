"""
Excepciones personalizadas y handlers globales para la API.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Excepción base de la aplicación."""

    def __init__(
        self,
        status_code: int = 500,
        detail: str = "Error interno del servidor",
        error_code: str = "INTERNAL_ERROR",
    ):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code
        super().__init__(detail)


class NotFoundException(AppException):
    def __init__(self, detail: str = "Recurso no encontrado"):
        super().__init__(status_code=404, detail=detail, error_code="NOT_FOUND")


class UnauthorizedException(AppException):
    def __init__(self, detail: str = "No autenticado"):
        super().__init__(status_code=401, detail=detail, error_code="UNAUTHORIZED")


class ForbiddenException(AppException):
    def __init__(self, detail: str = "No tiene permisos para esta acción"):
        super().__init__(status_code=403, detail=detail, error_code="FORBIDDEN")


class ConflictException(AppException):
    def __init__(self, detail: str = "El recurso ya existe"):
        super().__init__(status_code=409, detail=detail, error_code="CONFLICT")


class ValidationException(AppException):
    def __init__(self, detail: str = "Datos de entrada inválidos"):
        super().__init__(
            status_code=422, detail=detail, error_code="VALIDATION_ERROR"
        )


class InsufficientStockException(AppException):
    def __init__(self, detail: str = "Stock insuficiente"):
        super().__init__(
            status_code=400, detail=detail, error_code="INSUFFICIENT_STOCK"
        )


class BadRequestException(AppException):
    def __init__(self, detail: str = "Solicitud inválida"):
        super().__init__(status_code=400, detail=detail, error_code="BAD_REQUEST")


def register_exception_handlers(app: FastAPI) -> None:
    """Registra handlers globales de excepciones en la app FastAPI."""

    @app.exception_handler(AppException)
    async def app_exception_handler(_request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.error_code, "detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(_request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_ERROR",
                "detail": "Ha ocurrido un error inesperado",
            },
        )
