"""
Servicio de pagos con Stripe.
"""

import json
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

import stripe

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.exceptions import BadRequestException, NotFoundException
from app.models.pago import Pago
from app.repositories.pago_repo import PagoRepository
from app.repositories.pedido_repo import PedidoRepository


class PagoService:
    GATEWAY_NAME = "Stripe"

    def __init__(self, db: AsyncSession):
        self.db = db
        self.pago_repo = PagoRepository(db)
        self.pedido_repo = PedidoRepository(db)
        stripe.api_key = settings.STRIPE_SECRET_KEY

    @property
    def business_name(self) -> str:
        return settings.STRIPE_BUSINESS_NAME.strip() or "Ecommerce Platform"

    async def create_checkout_session(
        self,
        pedido_id: str,
        usuario_id: str,
        success_url: str,
        cancel_url: str,
    ) -> dict:
        pedido = await self.pedido_repo.get_by_id_and_user(pedido_id, usuario_id)
        if not pedido:
            raise NotFoundException("Pedido no encontrado")

        if pedido.estado != "pendiente":
            raise BadRequestException("Solo se pueden pagar pedidos pendientes")

        if not settings.STRIPE_SECRET_KEY:
            raise BadRequestException("Stripe no está configurado en el backend")

        monto_total = self._to_stripe_amount(float(pedido.total))
        nombre_cliente = self._build_customer_name(pedido.usuario)
        session = stripe.checkout.Session.create(
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=pedido.id,
            locale=settings.STRIPE_CHECKOUT_LOCALE,
            payment_method_types=["card"],
            customer_email=getattr(pedido.usuario, "email", None),
            customer_creation="always",
            submit_type="pay",
            metadata={
                "pedido_id": pedido.id,
                "usuario_id": usuario_id,
                "business_name": self.business_name,
            },
            payment_intent_data={
                "description": f"{self.business_name} | Pedido #{pedido.id[:8].upper()}",
                "metadata": {
                    "pedido_id": pedido.id,
                    "usuario_id": usuario_id,
                    "business_name": self.business_name,
                },
            },
            line_items=[
                {
                    "price_data": {
                        "currency": "pen",
                        "product_data": {
                            "name": f"{self.business_name} | Pedido #{pedido.id[:8].upper()}",
                            "description": self._build_description(pedido, nombre_cliente),
                        },
                        "unit_amount": monto_total,
                    },
                    "quantity": 1,
                }
            ],
        )

        pago = await self.pago_repo.create(
            pedido_id=pedido.id,
            metodo="tarjeta",
            estado="pendiente",
            monto=float(pedido.total),
            referencia_externa=session.id,
            detalle_respuesta=json.dumps({
                "pasarela": f"{self.GATEWAY_NAME} Checkout · {self.business_name}",
                "entorno": "sandbox",
                "estado": "pendiente",
                "negocio": self.business_name,
                "checkout_url": session.url,
                "stripe_session_id": session.id,
                "payment_status": session.payment_status,
                "resumen": f"Se creó una sesión de pago de prueba para {self.business_name} y quedó pendiente de confirmación.",
            }, ensure_ascii=False),
        )
        await self.db.flush()

        return {
            "checkout_url": session.url,
            "session_id": session.id,
            "pedido_id": pedido.id,
            "pago_id": pago.id,
        }

    async def confirm_payment(self, pedido_id: str, usuario_id: str, stripe_session_id: str) -> Pago:
        pedido = await self.pedido_repo.get_by_id_and_user(pedido_id, usuario_id)
        if not pedido:
            raise NotFoundException("Pedido no encontrado")

        pagos = await self.pago_repo.list_by_pedido(pedido_id)
        pago = next((item for item in pagos if item.referencia_externa == stripe_session_id), None)
        if not pago:
            raise NotFoundException("No se encontró un intento de pago para esa sesión")

        if pago.estado == "pagado":
            return pago

        session = stripe.checkout.Session.retrieve(stripe_session_id)
        if session.payment_status != "paid":
            raise BadRequestException("La sesión de Stripe aún no figura como pagada")

        payment_intent_id = session.payment_intent if isinstance(session.payment_intent, str) else None
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id) if payment_intent_id else None
        latest_charge = None
        if payment_intent and getattr(payment_intent, "latest_charge", None):
            latest_charge = stripe.Charge.retrieve(payment_intent.latest_charge)

        detalle = {
            "pasarela": f"{self.GATEWAY_NAME} Checkout · {self.business_name}",
            "entorno": "sandbox",
            "negocio": self.business_name,
            "estado": "pagado",
            "stripe_session_id": session.id,
            "payment_intent_id": payment_intent_id,
            "codigo_autorizacion": getattr(latest_charge, "id", None) or payment_intent_id,
            "resumen": f"Pago de prueba confirmado correctamente en {self.business_name} mediante Stripe Checkout.",
            "monto": round(float(pago.monto), 2),
            "moneda": pago.moneda,
            "ultimos4": self._extract_last4(latest_charge),
            "payment_status": session.payment_status,
        }

        await self.pago_repo.update(
            pago,
            estado="pagado",
            detalle_respuesta=json.dumps(detalle, ensure_ascii=False),
            fecha_pago=datetime.now(timezone.utc),
        )

        if pedido.estado != "pagado":
            pedido.estado = "pagado"
            await self.db.flush()
            await self.pedido_repo.add_historial(
                pedido_id=pedido.id,
                estado_anterior="pendiente",
                estado_nuevo="pagado",
                comentario=f"Pago confirmado vía Stripe Checkout. Ref {stripe_session_id}",
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

    def _to_stripe_amount(self, amount: float) -> int:
        decimal_amount = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return int(decimal_amount * 100)

    def _build_description(self, pedido, nombre_cliente: str | None) -> str:
        total_items = sum(item.cantidad for item in (pedido.items or []))
        partes = [f"{total_items} artículo(s)"]
        if nombre_cliente:
            partes.append(f"cliente: {nombre_cliente}")
        partes.append("total final con descuentos aplicados")
        return " · ".join(partes) + "."

    def _build_customer_name(self, usuario) -> str | None:
        if not usuario:
            return None
        nombre = (getattr(usuario, "nombre", "") or "").strip()
        apellido = (getattr(usuario, "apellido", "") or "").strip()
        full_name = f"{nombre} {apellido}".strip()
        return full_name or None

    def _extract_last4(self, charge) -> str | None:
        if not charge:
            return None
        payment_method_details = getattr(charge, "payment_method_details", None)
        card = getattr(payment_method_details, "card", None) if payment_method_details else None
        return getattr(card, "last4", None) if card else None

    def _parse_detail_payload(self, raw_detail: str | None) -> dict:
        if not raw_detail:
            return {}

        try:
            parsed = json.loads(raw_detail)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {"raw": raw_detail}
