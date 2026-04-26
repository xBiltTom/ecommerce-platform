"""
Tests del flujo de checkout con pago sandbox.
"""

import time

import pytest
from httpx import AsyncClient


def unique_name(prefix: str) -> str:
    return f"{prefix}_{int(time.time() * 1000)}"


@pytest.mark.asyncio
async def test_checkout_crea_pago_sandbox_persistido(
    client: AsyncClient,
    admin_headers: dict,
    client_headers: dict,
):
    categoria_nombre = unique_name("CatCheckout")
    categoria = await client.post(
        "/api/v1/categorias",
        json={"nombre": categoria_nombre},
        headers=admin_headers,
    )
    assert categoria.status_code == 201

    marca_nombre = unique_name("MarcaCheckout")
    marca = await client.post(
        "/api/v1/marcas",
        json={"nombre": marca_nombre},
        headers=admin_headers,
    )
    assert marca.status_code == 201

    sku = f"CHK-{int(time.time())}"
    producto = await client.post(
        "/api/v1/productos",
        json={
            "sku": sku,
            "nombre": f"Producto {sku}",
            "precio": 349.9,
            "stock_fisico": 15,
            "stock_minimo": 1,
            "categoria_id": categoria.json()["id"],
            "marca_id": marca.json()["id"],
            "especificaciones": [{"clave": "Modo", "valor": "Sandbox"}],
        },
        headers=admin_headers,
    )
    assert producto.status_code == 201
    producto_id = producto.json()["id"]

    carrito = await client.post(
        "/api/v1/carrito/items",
        json={"producto_id": producto_id, "cantidad": 2},
        headers=client_headers,
    )
    assert carrito.status_code == 200

    direccion = await client.post(
        "/api/v1/direcciones",
        json={
            "titulo": "Casa QA",
            "direccion": "Av. Sandbox 123",
            "ciudad": "Lima",
            "pais": "Peru",
            "es_principal": True,
        },
        headers=client_headers,
    )
    assert direccion.status_code == 201

    checkout = await client.post(
        "/api/v1/pedidos",
        json={
            "direccion_id": direccion.json()["id"],
            "metodo_pago": "tarjeta",
            "pago_simulado": {
                "titular": "TEST USER",
                "numero_tarjeta": "4242 4242 4242 4242",
                "vencimiento": "12/30",
                "cvv": "123",
                "documento": "44556677",
            },
        },
        headers=client_headers,
    )
    assert checkout.status_code == 201, checkout.text
    pedido = checkout.json()

    assert pedido["estado"] == "pagado"
    assert pedido["pago"]["estado"] == "pagado"
    assert pedido["pago"]["pasarela"] == "Protech Sandbox Gateway"
    assert pedido["pago"]["referencia_externa"].startswith("SIM-TAR-")

    pagos = await client.get(
        f"/api/v1/pedidos/{pedido['id']}/pagos",
        headers=client_headers,
    )
    assert pagos.status_code == 200, pagos.text
    pagos_body = pagos.json()
    assert len(pagos_body) >= 1
    assert pagos_body[0]["pedido_id"] == pedido["id"]
    assert pagos_body[0]["estado"] == "pagado"
