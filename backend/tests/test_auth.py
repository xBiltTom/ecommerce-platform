"""
Tests de autenticación.
"""

import time
import pytest
from httpx import AsyncClient


def unique_email(prefix: str) -> str:
    """Genera un email único usando timestamp para evitar conflictos entre runs."""
    return f"{prefix}_{int(time.time()*1000)}@test.com"


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    email = unique_email("reg_ok")
    r = await client.post("/api/v1/auth/register", json={
        "email": email, "password": "Test1234!",
        "nombre": "Nuevo", "apellido": "Usuario",
    })
    assert r.status_code == 201
    assert r.json()["message"] == "Usuario registrado exitosamente"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    email = unique_email("dup")
    data = {"email": email, "password": "Test1234!", "nombre": "A", "apellido": "B"}
    r1 = await client.post("/api/v1/auth/register", json=data)
    assert r1.status_code == 201
    r2 = await client.post("/api/v1/auth/register", json=data)
    assert r2.status_code == 409
    assert r2.json()["error"] == "CONFLICT"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    r = await client.post("/api/v1/auth/login", json={
        "email": "admin@ecommerce.com",
        "password": "Admin123!",
    })
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    r = await client.post("/api/v1/auth/login", json={
        "email": "admin@ecommerce.com",
        "password": "ContrasenaMala999!",
    })
    assert r.status_code == 401
    assert r.json()["error"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    r = await client.post("/api/v1/auth/login", json={
        "email": "noexiste@noexiste.com",
        "password": "Test1234!",
    })
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, client_headers: dict):
    r = await client.get("/api/v1/auth/me", headers=client_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "test_pytest@test.com"
    assert r.json()["rol"] == "cliente"


@pytest.mark.asyncio
async def test_get_me_no_token(client: AsyncClient):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_get_me_invalid_token(client: AsyncClient):
    r = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer tokeninvalido"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_token_refresh(client: AsyncClient):
    r = await client.post("/api/v1/auth/login", json={
        "email": "admin@ecommerce.com",
        "password": "Admin123!",
    })
    refresh_token = r.json()["refresh_token"]
    r2 = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r2.status_code == 200
    assert "access_token" in r2.json()


@pytest.mark.asyncio
async def test_update_profile(client: AsyncClient, client_headers: dict):
    r = await client.put("/api/v1/auth/me",
        json={"nombre": "NuevoNombre", "apellido": "NuevoApellido"},
        headers=client_headers)
    assert r.status_code == 200
    assert r.json()["nombre"] == "NuevoNombre"


@pytest.mark.asyncio
async def test_registro_publico_solo_crea_clientes(client: AsyncClient):
    """El registro público NUNCA debe crear admins."""
    email = unique_email("norole")
    await client.post("/api/v1/auth/register", json={
        "email": email, "password": "Test1234!",
        "nombre": "Fake", "apellido": "Admin",
    })
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": "Test1234!"})
    token = r.json()["access_token"]
    r2 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r2.json()["rol"] == "cliente"
