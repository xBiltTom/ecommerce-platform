"""
Punto de entrada de la aplicación FastAPI.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings
from app.exceptions import register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eventos de startup/shutdown."""
    # Crear directorio de uploads si no existe
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    settings.static_path.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    docs_url="/docs" if settings.should_enable_docs else None,
    redoc_url="/redoc" if settings.should_enable_docs else None,
    openapi_url="/openapi.json" if settings.should_enable_docs else None,
    lifespan=lifespan,
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.TRUSTED_HOSTS,
)

app.add_middleware(
    GZipMiddleware,
    minimum_size=settings.GZIP_MINIMUM_SIZE,
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Archivos estáticos ──
static_dir = settings.static_path
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# ── Exception handlers ──
register_exception_handlers(app)

# ── Routers ──
from app.routes import auth, categorias, marcas, productos, direcciones, carritos, pedidos, pagos, admin, estadisticas  # noqa: E402

app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(categorias.router, prefix=settings.API_PREFIX)
app.include_router(marcas.router, prefix=settings.API_PREFIX)
app.include_router(productos.router, prefix=settings.API_PREFIX)
app.include_router(direcciones.router, prefix=settings.API_PREFIX)
app.include_router(carritos.router, prefix=settings.API_PREFIX)
app.include_router(pedidos.router, prefix=settings.API_PREFIX)
app.include_router(pagos.router, prefix=settings.API_PREFIX)
app.include_router(admin.router, prefix=settings.API_PREFIX)
app.include_router(estadisticas.router, prefix=settings.API_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": settings.API_VERSION}
