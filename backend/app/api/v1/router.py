from fastapi import APIRouter

from app.api.v1.routes import admin, auth, cart, catalog, health, orders, users


api_v1_router = APIRouter()
api_v1_router.include_router(health.router, tags=["Health"])
api_v1_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_v1_router.include_router(users.router, prefix="/me", tags=["Users"])
api_v1_router.include_router(catalog.router, prefix="/catalog", tags=["Catalog"])
api_v1_router.include_router(cart.router, prefix="/me/cart", tags=["Cart"])
api_v1_router.include_router(orders.router, prefix="/me/orders", tags=["Orders"])
api_v1_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
