"""
Tests de productos, categorías, marcas y panel de admin.
"""

import time
import pytest
from httpx import AsyncClient


def unique_name(prefix: str) -> str:
    return f"{prefix}_{int(time.time()*1000)}"


@pytest.mark.asyncio
async def test_list_categorias_public(client: AsyncClient):
    r = await client.get("/api/v1/categorias")
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert "total" in body
    assert isinstance(body["items"], list)


@pytest.mark.asyncio
async def test_create_categoria_admin(client: AsyncClient, admin_headers: dict):
    nombre = unique_name("Cat Test")
    r = await client.post("/api/v1/categorias",
        json={"nombre": nombre, "descripcion": "Test"},
        headers=admin_headers)
    assert r.status_code == 201
    data = r.json()
    assert data["nombre"] == nombre
    assert "slug" in data
    assert data["activo"] is True


@pytest.mark.asyncio
async def test_create_categoria_client_forbidden(client: AsyncClient, client_headers: dict):
    r = await client.post("/api/v1/categorias",
        json={"nombre": "Intento Hackear"},
        headers=client_headers)
    assert r.status_code == 403
    assert r.json()["error"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_list_marcas_public(client: AsyncClient):
    r = await client.get("/api/v1/marcas")
    assert r.status_code == 200
    assert "items" in r.json()


@pytest.mark.asyncio
async def test_create_marca_admin(client: AsyncClient, admin_headers: dict):
    nombre = unique_name("Marca Test")
    r = await client.post("/api/v1/marcas",
        json={"nombre": nombre},
        headers=admin_headers)
    assert r.status_code == 201
    assert r.json()["nombre"] == nombre


@pytest.mark.asyncio
async def test_create_producto_admin(client: AsyncClient, admin_headers: dict):
    # Crear categoria y marca para este test
    cat_nombre = unique_name("CatProd")
    r = await client.post("/api/v1/categorias", json={"nombre": cat_nombre}, headers=admin_headers)
    assert r.status_code == 201
    cat_id = r.json()["id"]

    marca_nombre = unique_name("MarcaProd")
    r = await client.post("/api/v1/marcas", json={"nombre": marca_nombre}, headers=admin_headers)
    assert r.status_code == 201
    marca_id = r.json()["id"]

    sku = f"TST-{int(time.time())}"
    r = await client.post("/api/v1/productos",
        json={
            "sku": sku,
            "nombre": f"Producto {sku}",
            "precio": 199.99,
            "stock_fisico": 50,
            "stock_minimo": 5,
            "categoria_id": cat_id,
            "marca_id": marca_id,
            "especificaciones": [{"clave": "Color", "valor": "Rojo"}],
        },
        headers=admin_headers)
    assert r.status_code == 201
    data = r.json()
    assert data["sku"] == sku
    assert data["stock_disponible"] == 50
    assert len(data["especificaciones"]) == 1
    assert data["categoria_nombre"] == cat_nombre
    assert data["marca_nombre"] == marca_nombre


@pytest.mark.asyncio
async def test_get_producto_by_slug(client: AsyncClient):
    r = await client.get("/api/v1/productos")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) > 0, "Se necesita al menos un producto en la BD"
    slug = items[0]["slug"]
    r2 = await client.get(f"/api/v1/productos/{slug}")
    assert r2.status_code == 200
    assert r2.json()["slug"] == slug


@pytest.mark.asyncio
async def test_producto_not_found(client: AsyncClient):
    r = await client.get("/api/v1/productos/slug-que-no-existe-jamas-xyz123")
    assert r.status_code == 404
    assert r.json()["error"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_list_productos_con_filtros(client: AsyncClient):
    r = await client.get("/api/v1/productos?precio_min=1&precio_max=999999&orden=precio_asc")
    assert r.status_code == 200
    assert "items" in r.json()


@pytest.mark.asyncio
async def test_producto_client_cannot_create(client: AsyncClient, client_headers: dict):
    r = await client.post("/api/v1/productos",
        json={"sku": "HACK-001", "nombre": "Hack", "precio": 1, "stock_fisico": 1, "stock_minimo": 1},
        headers=client_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_kpis(client: AsyncClient, admin_headers: dict):
    r = await client.get("/api/v1/admin/dashboard/kpis", headers=admin_headers)
    assert r.status_code == 200
    kpis = r.json()
    for key in ["ventas_totales", "total_pedidos", "ticket_promedio",
                "usuarios_registrados", "productos_activos"]:
        assert key in kpis, f"Falta clave KPI: {key}"
    assert kpis["ventas_totales"] >= 0
    assert kpis["total_pedidos"] >= 0


@pytest.mark.asyncio
async def test_admin_kpis_forbidden_for_client(client: AsyncClient, client_headers: dict):
    r = await client.get("/api/v1/admin/dashboard/kpis", headers=client_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_kpis_requires_auth(client: AsyncClient):
    r = await client.get("/api/v1/admin/dashboard/kpis")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_admin_ventas_por_periodo(client: AsyncClient, admin_headers: dict):
    for periodo in ["dia", "semana", "mes"]:
        r = await client.get(f"/api/v1/admin/dashboard/ventas?periodo={periodo}", headers=admin_headers)
        assert r.status_code == 200, f"Falló para periodo={periodo}"
        assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_admin_pdf_report(client: AsyncClient, admin_headers: dict):
    r = await client.get("/api/v1/admin/reportes/ventas/pdf", headers=admin_headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert len(r.content) > 100  # PDF no vacío
