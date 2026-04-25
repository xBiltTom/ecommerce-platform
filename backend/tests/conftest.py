"""
Fixtures compartidos para los tests.
Usa httpx.AsyncClient con el app directamente (ASGI transport, sin servidor real).
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app

@pytest_asyncio.fixture
async def client() -> AsyncClient:
    """Cliente HTTP por test."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def admin_headers(client: AsyncClient) -> dict:
    r = await client.post("/api/v1/auth/login", json={
        "email": "admin@ecommerce.com",
        "password": "Admin123!",
    })
    assert r.status_code == 200, f"Admin login falló: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest_asyncio.fixture
async def client_headers(client: AsyncClient) -> dict:
    """Autentica al cliente de test ya existente en la BD."""
    # Intentar registrar (idempotente: 201 o 409 son ambos OK)
    await client.post("/api/v1/auth/register", json={
        "email": "test_pytest@test.com",
        "password": "Test1234!",
        "nombre": "Test",
        "apellido": "Pytest",
    })
    r = await client.post("/api/v1/auth/login", json={
        "email": "test_pytest@test.com",
        "password": "Test1234!",
    })
    assert r.status_code == 200, f"Client login falló: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
