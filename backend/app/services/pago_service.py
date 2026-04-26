"""
Servicio de pagos simulados.
"""

import json
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import BadRequestException, NotFoundException
from app.models.pago import Pago
from app.repositories.pago_repo import PagoRepository
from app.repositories.pedido_repo import PedidoRepository


class PagoService:
    GATEWAY_NAME = "Protech Sandbox Gateway"

    def __init__(self, db: AsyncSession):
        self.db = db
        self.pago_repo = PagoRepository(db)
        self.pedido_repo = PedidoRepository(db)

    async def create_pago(
        self,
        pedido_id: str,
        usuario_id: str,
        metodo: str,
        referencia: str | None = None,
        simulacion: dict | None = None,
    ):
        pedido = await self.pedido_repo.get_by_id_and_user(pedido_id, usuario_id)
        if not pedido:
            raise NotFoundException("Pedido no encontrado")

        if pedido.estado != "pendiente":
            raise BadRequestException("Solo se pueden pagar pedidos pendientes")

        gateway_result = self._simulate_gateway_charge(
            metodo=metodo,
            amount=float(pedido.total),
            referencia=referencia,
            simulacion=simulacion or {},
        )

        pago = await self.pago_repo.create(
            pedido_id=pedido.id,
            metodo=metodo,
            estado=gateway_result["estado"],
            monto=float(pedido.total),
            referencia_externa=gateway_result["referencia_externa"],
            detalle_respuesta=json.dumps(gateway_result["detalle"], ensure_ascii=False),
            fecha_pago=datetime.now(timezone.utc),
        )

        pedido.estado = "pagado"
        await self.db.flush()

        await self.pedido_repo.add_historial(
            pedido_id=pedido.id,
            estado_anterior="pendiente",
            estado_nuevo="pagado",
            comentario=gateway_result["historial"],
            creado_por=usuario_id,
        )

        return pago

    async def list_by_pedido(self, pedido_id: str):
        return await self.pago_repo.list_by_pedido(pedido_id)

    def build_gateway_response(self, pago: Pago) -> dict:
        detalle = self._parse_detail_payload(pago.detalle_respuesta)
        return {
            "id": pago.id,
            "pedido_id": pago.pedido_id,
            "metodo": pago.metodo,
            "estado": pago.estado,
            "monto": float(pago.monto),
            "moneda": pago.moneda,
            "referencia_externa": pago.referencia_externa,
            "fecha_pago": pago.fecha_pago,
            "pasarela": detalle.get("pasarela"),
            "codigo_autorizacion": detalle.get("codigo_autorizacion"),
            "resumen": detalle.get("resumen"),
            "ultimos4": detalle.get("ultimos4"),
            "detalle": detalle or None,
        }

    def _simulate_gateway_charge(
        self,
        metodo: str,
        amount: float,
        referencia: str | None,
        simulacion: dict,
    ) -> dict:
        last4 = self._last4(simulacion.get("numero_tarjeta"))
        card_brand = self._detect_card_brand(simulacion.get("numero_tarjeta"))
        gateway_reference = referencia or self._build_gateway_reference(metodo)
        authorization_code = self._build_authorization_code()
        payer_label = (
            simulacion.get("titular")
            or simulacion.get("email_pagador")
            or simulacion.get("documento")
            or "cliente sandbox"
        )

        if metodo == "tarjeta":
            resumen = f"Tarjeta {card_brand} terminada en {last4 or '4242'} autorizada en sandbox."
        elif metodo == "paypal":
            resumen = f"Cuenta PayPal simulada de {payer_label} aprobada al instante."
        elif metodo == "transferencia":
            banco = simulacion.get("banco") or "Banco Sandbox"
            resumen = f"Transferencia de prueba validada por {banco}."
        elif metodo == "efectivo":
            resumen = "Orden marcada como pago presencial simulado."
        else:
            resumen = "Pago alternativo procesado por la pasarela sandbox."

        detalle = {
            "pasarela": self.GATEWAY_NAME,
            "entorno": "sandbox",
            "estado": "pagado",
            "codigo_autorizacion": authorization_code,
            "referencia_gateway": gateway_reference,
            "resumen": resumen,
            "monto": round(amount, 2),
            "moneda": "PEN",
            "marca_tarjeta": card_brand,
            "ultimos4": last4,
            "pagador": payer_label,
            "email_pagador": simulacion.get("email_pagador"),
            "banco": simulacion.get("banco"),
            "documento": simulacion.get("documento"),
            "timeline": [
                "tokenized",
                "risk_check_passed",
                "authorized",
                "captured",
            ],
            "mensaje": "Pago de prueba aprobado sin mover dinero real.",
        }

        return {
            "estado": "pagado",
            "referencia_externa": gateway_reference,
            "detalle": detalle,
            "historial": f"Pago sandbox aprobado vía {metodo}. Ref {gateway_reference}",
        }

    def _build_gateway_reference(self, metodo: str) -> str:
        return f"SIM-{metodo[:3].upper()}-{uuid4().hex[:10].upper()}"

    def _build_authorization_code(self) -> str:
        return uuid4().hex[:6].upper()

    def _last4(self, card_number: str | None) -> str | None:
        if not card_number:
            return None
        digits = "".join(ch for ch in card_number if ch.isdigit())
        return digits[-4:] if digits else None

    def _detect_card_brand(self, card_number: str | None) -> str | None:
        if not card_number:
            return None

        digits = "".join(ch for ch in card_number if ch.isdigit())
        if digits.startswith("4"):
            return "Visa"
        if digits.startswith(("51", "52", "53", "54", "55")):
            return "Mastercard"
        if digits.startswith(("34", "37")):
            return "American Express"
        return "Sandbox Card"

    def _parse_detail_payload(self, raw_detail: str | None) -> dict:
        if not raw_detail:
            return {}

        try:
            parsed = json.loads(raw_detail)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {"raw": raw_detail}
