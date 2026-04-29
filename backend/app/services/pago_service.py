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
from app.repositories.cupon_repo import CuponRepository
from app.repositories.pago_repo import PagoRepository
from app.repositories.pedido_repo import PedidoRepository


class PagoService:
    GATEWAY_NAME = "Stripe"
    IGV_DIVISOR = Decimal("1.18")

    def __init__(self, db: AsyncSession):
        self.db = db
        self.pago_repo = PagoRepository(db)
        self.pedido_repo = PedidoRepository(db)
        self.cupon_repo = CuponRepository(db)
        stripe.api_key = settings.STRIPE_SECRET_KEY

    @property
    def business_name(self) -> str:
        return settings.STRIPE_BUSINESS_NAME.strip() or "Ecommerce Platform"

    def construct_webhook_event(self, payload: bytes, stripe_signature: str | None):
        if not settings.STRIPE_WEBHOOK_SECRET:
            raise BadRequestException("Stripe webhook no está configurado en el backend")

        if not stripe_signature:
            raise BadRequestException("Falta la firma del webhook de Stripe")

        try:
            return stripe.Webhook.construct_event(
                payload=payload,
                sig_header=stripe_signature,
                secret=settings.STRIPE_WEBHOOK_SECRET,
            )
        except ValueError as exc:
            raise BadRequestException("Payload inválido recibido desde Stripe") from exc
        except stripe.error.SignatureVerificationError as exc:
            raise BadRequestException("La firma del webhook de Stripe no es válida") from exc

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

        # Cancelar intentos de pago previos pendientes para poder reintentar
        pagos_previos = await self.pago_repo.list_by_pedido(pedido.id)
        for pago_previo in pagos_previos:
            if pago_previo.estado == "pendiente":
                await self.pago_repo.update(
                    pago_previo,
                    estado="cancelado",
                    detalle_respuesta=json.dumps({
                        **self._parse_detail_payload(pago_previo.detalle_respuesta),
                        "estado": "cancelado",
                        "nota": "Sesión cancelada por reintento de checkout",
                    }, ensure_ascii=False),
                )

        monto_total = self._to_stripe_amount(float(pedido.total))
        nombre_cliente = self._build_customer_name(pedido.usuario)
        cupon = await self.cupon_repo.get_by_id(pedido.cupon_id) if pedido.cupon_id else None
        nombre_cupon = cupon.codigo if cupon else None
        line_items = self._build_line_items(pedido, nombre_cliente, monto_total, nombre_cupon)
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
            billing_address_collection="auto",
            branding_settings={
                "display_name": self.business_name,
            },
            custom_text={
                "submit": {
                    "message": f"Estás en modo prueba. Este pago no será real. Puedes usar tarjetas de prueba de Stripe para completar la transacción en {self.business_name}.",
                },
            },
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
            line_items=line_items,
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

    async def process_webhook_event(self, event) -> dict:
        event_type = self._stripe_value(event, "type")
        event_object = self._stripe_value(self._stripe_value(event, "data", {}), "object", {})

        if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
            await self._confirm_session_payment(event_object)
        elif event_type == "checkout.session.expired":
            await self._expire_session_payment(event_object)

        return {
            "received": True,
            "type": event_type,
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

        return await self._mark_payment_as_paid(
            pedido=pedido,
            pago=pago,
            session=session,
            historial_actor_id=usuario_id,
        )

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

    def _to_stripe_amount_from_decimal(self, amount: Decimal) -> int:
        decimal_amount = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return int(decimal_amount * 100)

    def _get_product_image_url(self, item) -> str | None:
        producto = getattr(item, "producto", None)
        if not producto:
            return None
        imagen_url = getattr(producto, "imagen_url", None)
        if not imagen_url:
            return None
        imagen_url = imagen_url.strip()
        if imagen_url.startswith("http"):
            return imagen_url
        base = settings.BASE_URL.rstrip("/")
        return f"{base}{imagen_url}"

    def _build_line_items(self, pedido, nombre_cliente: str | None, monto_total: int, nombre_cupon: str | None = None) -> list[dict]:
        items = list(pedido.items or [])
        if not items:
            return [
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
            ]

        subtotales = [Decimal(str(item.subtotal)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) for item in items]
        descuento_total = Decimal(str(getattr(pedido, "descuento", 0) or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        descuentos = self._distribuir_descuento(subtotales, descuento_total)

        line_items: list[dict] = []
        igv_total = Decimal("0.00")

        for item, descuento_item in zip(items, descuentos):
            subtotal = Decimal(str(item.subtotal)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            total_con_descuento = (subtotal - descuento_item).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if total_con_descuento < Decimal("0.00"):
                total_con_descuento = Decimal("0.00")

            base_imponible = (total_con_descuento / self.IGV_DIVISOR).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            igv_item = (total_con_descuento - base_imponible).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            igv_total += igv_item

            cantidad = max(int(item.cantidad), 1)
            unit_amount = self._to_stripe_amount_from_decimal(base_imponible / Decimal(cantidad))

            product_data = {
                "name": item.nombre_producto,
                "description": self._build_item_description(item),
            }
            imagen_url = self._get_product_image_url(item)
            if imagen_url:
                product_data["images"] = [imagen_url]

            line_items.append(
                {
                    "price_data": {
                        "currency": "pen",
                        "product_data": product_data,
                        "unit_amount": unit_amount,
                    },
                    "quantity": cantidad,
                }
            )

        if igv_total > Decimal("0.00"):
            line_items.append(
                {
                    "price_data": {
                        "currency": "pen",
                        "product_data": {
                            "name": "IGV (18%)",
                            "description": f"Impuesto incluido para {self.business_name}.",
                        },
                        "unit_amount": self._to_stripe_amount(float(igv_total)),
                    },
                    "quantity": 1,
                }
            )

        if descuento_total > Decimal("0.00") and nombre_cupon:
            line_items.append(
                {
                    "price_data": {
                        "currency": "pen",
                        "product_data": {
                            "name": f"Cupón {nombre_cupon}",
                            "description": f"Descuento aplicado: S/ {descuento_total:.2f}",
                        },
                        "unit_amount": 0,
                    },
                    "quantity": 1,
                }
            )

        return line_items

    def _distribuir_descuento(self, subtotales: list[Decimal], descuento_total: Decimal) -> list[Decimal]:
        if not subtotales or descuento_total <= Decimal("0.00"):
            return [Decimal("0.00") for _ in subtotales]

        total_subtotal = sum(subtotales, Decimal("0.00"))
        if total_subtotal <= Decimal("0.00"):
            return [Decimal("0.00") for _ in subtotales]

        descuentos: list[Decimal] = []
        acumulado = Decimal("0.00")

        for index, subtotal in enumerate(subtotales):
            if index == len(subtotales) - 1:
                descuento_item = (descuento_total - acumulado).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            else:
                proporcion = subtotal / total_subtotal
                descuento_item = (descuento_total * proporcion).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                acumulado += descuento_item

            if descuento_item > subtotal:
                descuento_item = subtotal

            descuentos.append(descuento_item)

        return descuentos

    def _build_description(self, pedido, nombre_cliente: str | None) -> str:
        total_items = sum(item.cantidad for item in (pedido.items or []))
        partes = [f"{total_items} artículo(s)"]
        partes.append("total final con descuentos aplicados")
        return " · ".join(partes) + "."

    def _build_item_description(self, item) -> str:
        return f"SKU: {item.sku_producto}"

    def _build_customer_name(self, usuario) -> str | None:
        if not usuario:
            return None
        nombre = (getattr(usuario, "nombre", "") or "").strip()
        apellido = (getattr(usuario, "apellido", "") or "").strip()
        full_name = f"{nombre} {apellido}".strip()
        return full_name or None

    async def _confirm_session_payment(self, session) -> None:
        session_id = self._stripe_value(session, "id")
        payment_status = self._stripe_value(session, "payment_status")
        pedido_id = self._extract_pedido_id_from_session(session)

        if not session_id or not pedido_id or payment_status != "paid":
            return

        pedido = await self.pedido_repo.get_by_id(pedido_id)
        if not pedido:
            return

        pagos = await self.pago_repo.list_by_pedido(pedido_id)
        pago = next((item for item in pagos if item.referencia_externa == session_id), None)
        if not pago:
            amount_total = self._stripe_value(session, "amount_total") or 0
            currency = (self._stripe_value(session, "currency") or "pen").upper()
            pago = await self.pago_repo.create(
                pedido_id=pedido.id,
                metodo="tarjeta",
                estado="pendiente",
                monto=round(amount_total / 100, 2),
                moneda=currency,
                referencia_externa=session_id,
                detalle_respuesta=json.dumps({
                    "pasarela": f"{self.GATEWAY_NAME} Checkout · {self.business_name}",
                    "entorno": "sandbox",
                    "estado": "pendiente",
                    "negocio": self.business_name,
                    "stripe_session_id": session_id,
                    "payment_status": payment_status,
                    "resumen": f"Pago recuperado desde webhook de Stripe para {self.business_name}.",
                }, ensure_ascii=False),
            )

        await self._mark_payment_as_paid(
            pedido=pedido,
            pago=pago,
            session=session,
            historial_actor_id=None,
        )

    async def _expire_session_payment(self, session) -> None:
        session_id = self._stripe_value(session, "id")
        pedido_id = self._extract_pedido_id_from_session(session)

        if not session_id or not pedido_id:
            return

        pagos = await self.pago_repo.list_by_pedido(pedido_id)
        pago = next((item for item in pagos if item.referencia_externa == session_id), None)
        if not pago or pago.estado != "pendiente":
            return

        detalle = {
            **self._parse_detail_payload(pago.detalle_respuesta),
            "estado": "cancelado",
            "stripe_session_id": session_id,
            "resumen": f"La sesión de pago de Stripe expiró antes de completarse en {self.business_name}.",
        }

        await self.pago_repo.update(
            pago,
            estado="cancelado",
            detalle_respuesta=json.dumps(detalle, ensure_ascii=False),
        )

    async def _mark_payment_as_paid(self, pedido, pago: Pago, session, historial_actor_id: str | None) -> Pago:
        if pago.estado == "pagado":
            return pago

        payment_intent_id = self._extract_payment_intent_id(session)
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id) if payment_intent_id else None
        latest_charge = None
        if payment_intent and getattr(payment_intent, "latest_charge", None):
            latest_charge = stripe.Charge.retrieve(payment_intent.latest_charge)

        detalle = {
            "pasarela": f"{self.GATEWAY_NAME} Checkout · {self.business_name}",
            "entorno": "sandbox",
            "negocio": self.business_name,
            "estado": "pagado",
            "stripe_session_id": self._stripe_value(session, "id"),
            "payment_intent_id": payment_intent_id,
            "codigo_autorizacion": getattr(latest_charge, "id", None) or payment_intent_id,
            "resumen": f"Pago de prueba confirmado correctamente en {self.business_name} mediante Stripe Checkout.",
            "monto": round(float(pago.monto), 2),
            "moneda": pago.moneda,
            "ultimos4": self._extract_last4(latest_charge),
            "payment_status": self._stripe_value(session, "payment_status"),
        }

        await self.pago_repo.update(
            pago,
            estado="pagado",
            detalle_respuesta=json.dumps(detalle, ensure_ascii=False),
            fecha_pago=datetime.now(timezone.utc),
        )

        if pedido.estado != "pagado":
            estado_anterior = pedido.estado
            pedido.estado = "pagado"
            await self.db.flush()
            await self.pedido_repo.add_historial(
                pedido_id=pedido.id,
                estado_anterior=estado_anterior,
                estado_nuevo="pagado",
                comentario=f"Pago confirmado vía Stripe Checkout. Ref {self._stripe_value(session, 'id')}",
                creado_por=historial_actor_id,
            )

        if pedido.cupon_id:
            cupon = await self.cupon_repo.get_by_id(pedido.cupon_id)
            if cupon and not cupon.usado:
                cupon.usado = True
                cupon.fecha_uso = datetime.now(timezone.utc)
                await self.db.flush()

        return pago

    def _extract_payment_intent_id(self, session) -> str | None:
        payment_intent = self._stripe_value(session, "payment_intent")
        if isinstance(payment_intent, str):
            return payment_intent
        return self._stripe_value(payment_intent, "id")

    def _extract_pedido_id_from_session(self, session) -> str | None:
        client_reference_id = self._stripe_value(session, "client_reference_id")
        if client_reference_id:
            return client_reference_id
        metadata = self._stripe_value(session, "metadata", {})
        return self._stripe_value(metadata, "pedido_id")

    def _stripe_value(self, payload, key: str, default=None):
        if payload is None:
            return default
        if isinstance(payload, dict):
            return payload.get(key, default)
        return getattr(payload, key, default)

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
