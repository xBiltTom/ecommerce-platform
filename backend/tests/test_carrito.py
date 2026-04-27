"""
Tests de carrito.
"""

import time

import pytest
from httpx import AsyncClient


def unique_email(prefix: str) -> str:
    return f"{prefix}_{int(time.time() * 1000)}@test.com"


@pytest.mark.asyncio
async def test_get_carrito_crea_carrito_vacio_sin_error(client: AsyncClient):
    email = unique_email("carrito")
    register = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Test1234!",
            "nombre": "Cliente",
            "apellido": "Carrito",
        },
    )
    assert register.status_code == 201, register.text

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Test1234!"},
    )
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = await client.get("/api/v1/carrito", headers=headers)
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["estado"] == "activo"
    assert isinstance(body["id"], int)
    assert body["items"] == []
    assert body["total"] == 0.0
