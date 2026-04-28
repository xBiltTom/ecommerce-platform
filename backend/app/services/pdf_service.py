"""
Servicio de generación de reportes PDF con diseño Dark Cyber.

Genera dos tipos de reporte:
- Operacional: tabla de pedidos en un rango de fechas.
- Gestión: KPIs estratégicos para la toma de decisiones.
"""

import io
from collections import defaultdict
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin_repo import AdminRepository
from app.repositories.estadisticas_repo import EstadisticasRepository


# ── Paleta Dark Cyber ──
_BG_MAIN        = colors.HexColor("#F4F7FB")
_BG_SURFACE     = colors.HexColor("#FFFFFF")
_BG_ALT         = colors.HexColor("#EEF3F8")
_BORDER         = colors.HexColor("#C9D3E0")
_TEXT_PRIMARY   = colors.HexColor("#1F2937")
_TEXT_SECONDARY = colors.HexColor("#66758A")
_ACCENT_CYAN    = colors.HexColor("#1F4E79")
_ACCENT_EMERALD = colors.HexColor("#446B5D")
_ACCENT_AMBER   = colors.HexColor("#8B6F3D")
_ACCENT_VIOLET  = colors.HexColor("#667085")
_ACCENT_BLUE    = colors.HexColor("#355C7D")
_ACCENT_RED     = colors.HexColor("#8A5A5A")
_WHITE          = colors.HexColor("#FFFFFF")


def _draw_background(canvas, doc):
    """Dibuja el fondo oscuro en cada página para el tema Dark Cyber."""
    canvas.saveState()
    # Fondo principal
    canvas.setFillColor(_BG_MAIN)
    canvas.rect(0, 0, doc.pagesize[0], doc.pagesize[1], fill=True, stroke=False)
    # Línea de acento superior (barra delgada cyan)
    canvas.setFillColor(_ACCENT_CYAN)
    canvas.rect(0, doc.pagesize[1] - 8, doc.pagesize[0], 8, fill=True, stroke=False)
    # Marco interior sutil
    canvas.setStrokeColor(_BORDER)
    canvas.setLineWidth(0.5)
    canvas.rect(10 * mm, 10 * mm, doc.pagesize[0] - 20 * mm, doc.pagesize[1] - 20 * mm)
    # Número de página
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(_TEXT_SECONDARY)
    canvas.drawRightString(
        doc.pagesize[0] - 12 * mm, 13 * mm,
        f"Pág. {doc.page}  |  Sistema de Gestión Comercial"
    )
    canvas.restoreState()


def _base_styles():
    """Devuelve los estilos Paragraph reutilizables."""
    ss = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "DarkTitle",
            parent=ss["Title"],
            fontSize=20,
            fontName="Helvetica-Bold",
            textColor=_TEXT_PRIMARY,
            alignment=0,
            spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "DarkSubtitle",
            parent=ss["Normal"],
            fontSize=9,
            fontName="Helvetica",
            textColor=_TEXT_SECONDARY,
            spaceAfter=14,
        ),
        "section": ParagraphStyle(
            "DarkSection",
            parent=ss["Normal"],
            fontSize=11,
            fontName="Helvetica-Bold",
            textColor=_ACCENT_CYAN,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "kpi_label": ParagraphStyle(
            "KpiLabel",
            parent=ss["Normal"],
            fontSize=8,
            fontName="Helvetica",
            textColor=_TEXT_SECONDARY,
        ),
        "kpi_value": ParagraphStyle(
            "KpiValue",
            parent=ss["Normal"],
            fontSize=18,
            fontName="Helvetica-Bold",
            textColor=_ACCENT_CYAN,
            spaceAfter=2,
        ),
        "kpi_value_alt": ParagraphStyle(
            "KpiValueAlt",
            parent=ss["Normal"],
            fontSize=18,
            fontName="Helvetica-Bold",
            textColor=_ACCENT_BLUE,
            spaceAfter=2,
        ),
        "card_label": ParagraphStyle(
            "CardLabel",
            parent=ss["Normal"],
            fontSize=7,
            fontName="Helvetica-Bold",
            textColor=_TEXT_SECONDARY,
            leading=9,
        ),
        "card_value": ParagraphStyle(
            "CardValue",
            parent=ss["Normal"],
            fontSize=17,
            fontName="Helvetica-Bold",
            textColor=_TEXT_PRIMARY,
            leading=19,
        ),
        "card_detail": ParagraphStyle(
            "CardDetail",
            parent=ss["Normal"],
            fontSize=7,
            fontName="Helvetica",
            textColor=_TEXT_SECONDARY,
            leading=9,
        ),
        "normal": ParagraphStyle(
            "DarkNormal",
            parent=ss["Normal"],
            fontSize=9,
            textColor=_TEXT_PRIMARY,
            leading=12,
        ),
        "insight": ParagraphStyle(
            "DarkInsight",
            parent=ss["Normal"],
            fontSize=9,
            textColor=_TEXT_PRIMARY,
            leading=13,
        ),
        "small": ParagraphStyle(
            "DarkSmall",
            parent=ss["Normal"],
            fontSize=8,
            textColor=_TEXT_SECONDARY,
            leading=10,
        ),
        "note": ParagraphStyle(
            "DarkNote",
            parent=ss["Normal"],
            fontSize=7,
            textColor=_TEXT_SECONDARY,
            spaceAfter=10,
        ),
    }


def _table_style_base() -> list:
    """Estilos compartidos para todas las tablas."""
    return [
        # Encabezado
        ("BACKGROUND", (0, 0), (-1, 0), _ACCENT_CYAN),
        ("TEXTCOLOR",  (0, 0), (-1, 0), _WHITE),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 8),
        ("TOPPADDING",    (0, 0), (-1, 0), 7),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
        # Cuerpo
        ("TEXTCOLOR",  (0, 1), (-1, -1), _TEXT_PRIMARY),
        ("FONTNAME",   (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",   (0, 1), (-1, -1), 8),
        ("TOPPADDING",    (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        # Grid
        ("GRID",          (0, 0), (-1, -1), 0.4, _BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [_BG_SURFACE, _BG_ALT]),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]


def _format_currency(value: float) -> str:
    return f"S/. {value:,.2f}"


def _format_pct(value: float) -> str:
    return f"{value:.1f}%"


def _safe_pct(value: float, total: float) -> float:
    return (value / total * 100) if total else 0.0


def _humanize_estado(estado: str) -> str:
    return estado.replace("_", " ").upper()


def _estado_color(estado: str):
    return {
        "pendiente": _ACCENT_AMBER,
        "pagado": _ACCENT_CYAN,
        "en_preparacion": _ACCENT_VIOLET,
        "enviado": _ACCENT_BLUE,
        "entregado": _ACCENT_EMERALD,
        "cancelado": _ACCENT_RED,
    }.get(estado, _TEXT_SECONDARY)


def _build_metric_card(label: str, value: str, detail: str, width: float, accent) -> Table:
    card = Table(
        [
            [Paragraph(label, _base_styles()["card_label"])],
            [Paragraph(value, _base_styles()["card_value"])],
            [Paragraph(detail, _base_styles()["card_detail"])],
        ],
        colWidths=[width],
    )
    card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), _BG_SURFACE),
        ("BOX", (0, 0), (-1, -1), 0.5, _BORDER),
        ("LINEBEFORE", (0, 0), (0, -1), 3, accent),
        ("LINEABOVE", (0, 0), (-1, 0), 0.6, _BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return card


def _build_info_panel(text: str, width: float, style: ParagraphStyle) -> Table:
    panel = Table([[Paragraph(text, style)]], colWidths=[width])
    panel.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), _BG_ALT),
        ("BOX", (0, 0), (-1, -1), 0.5, _BORDER),
        ("LINEBEFORE", (0, 0), (0, -1), 2, _ACCENT_CYAN),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return panel


def _build_bar_chart(items: list[dict], label_key: str, value_key: str, width: float, formatter) -> Drawing:
    palette = [_ACCENT_CYAN, _ACCENT_EMERALD, _ACCENT_VIOLET, _ACCENT_AMBER, _ACCENT_BLUE]
    row_height = 16
    height = max(28, len(items) * row_height + 8)
    drawing = Drawing(width, height)
    max_value = max((float(item[value_key]) for item in items), default=0) or 1
    bar_x = 68
    bar_w = max(65, width - 120)
    y = height - 14
    for idx, item in enumerate(items):
        value = float(item[value_key])
        label = str(item[label_key])[:18]
        color = palette[idx % len(palette)]
        fill_w = bar_w * (value / max_value)
        drawing.add(String(0, y + 1, label, fontName="Helvetica", fontSize=8, fillColor=_TEXT_PRIMARY))
        drawing.add(Rect(bar_x, y, bar_w, 7, fillColor=_BORDER, strokeColor=None))
        drawing.add(Rect(bar_x, y, fill_w, 7, fillColor=color, strokeColor=None))
        drawing.add(String(bar_x + bar_w + 6, y + 1, formatter(value), fontName="Helvetica-Bold", fontSize=8, fillColor=_TEXT_PRIMARY))
        y -= row_height
    return drawing


class PDFService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.admin_repo = AdminRepository(db)
        self.estadisticas_repo = EstadisticasRepository(db)

    # ── Reporte heredado (no se modifica) ──

    async def generar_reporte_ventas(self) -> bytes:
        """Genera un PDF con el reporte histórico de ventas (endpoint original)."""
        ventas = await self.admin_repo.get_ventas_por_periodo("mes")
        top_productos = await self.admin_repo.get_productos_top(10)
        ventas_totales = await self.admin_repo.get_ventas_totales()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=15 * mm, rightMargin=15 * mm,
            topMargin=20 * mm, bottomMargin=20 * mm,
        )
        styles = _base_styles()
        tbase = _table_style_base()
        elements = []

        elements.append(Paragraph("REPORTE DE VENTAS // SISTEMA GLOBAL", styles["title"]))
        elements.append(Paragraph(
            f"GENERADO: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')} | MÓDULO: ADMINISTRACIÓN",
            styles["subtitle"],
        ))
        elements.append(Paragraph(f"TOTAL INGRESOS: S/. {ventas_totales:,.2f}", styles["kpi_value"]))
        elements.append(Spacer(1, 6 * mm))

        if ventas:
            elements.append(Paragraph("HISTÓRICO POR PERIODO", styles["section"]))
            data = [["PERIODO", "TOTAL (S/.)", "PEDIDOS"]]
            for v in ventas:
                data.append([v["periodo"][:10], f"{v['total']:,.2f}", str(v["cantidad_pedidos"])])
            ts = tbase.copy()
            ts.append(("ALIGN", (1, 0), (-1, -1), "RIGHT"))
            table = Table(data, colWidths=[65 * mm, 50 * mm, 40 * mm])
            table.setStyle(TableStyle(ts))
            elements.append(table)
            elements.append(Spacer(1, 10 * mm))

        if top_productos:
            elements.append(Paragraph("TOP 10 PRODUCTOS MÁS VENDIDOS", styles["section"]))
            data = [["SKU", "PRODUCTO", "CANT.", "INGRESOS (S/.)"]]
            for p in top_productos:
                data.append([p["sku"], p["nombre"][:35], str(p["cantidad_vendida"]), f"{p['ingresos']:,.2f}"])
            ts = tbase.copy()
            ts.append(("ALIGN", (2, 0), (-1, -1), "RIGHT"))
            table = Table(data, colWidths=[30 * mm, 85 * mm, 25 * mm, 35 * mm])
            table.setStyle(TableStyle(ts))
            elements.append(table)

        doc.build(elements, onFirstPage=_draw_background, onLaterPages=_draw_background)
        return buffer.getvalue()

    # ── Reporte Operacional ──

    async def generar_reporte_operacional(
        self,
        fecha_inicio: datetime,
        fecha_fin: datetime,
    ) -> bytes:
        """
        PDF operacional: lista detallada de pedidos en un rango de fechas.
        Columnas: ID, Cliente, Fecha, Estado, Total.
        """
        pedidos = await self.estadisticas_repo.get_pedidos_por_rango(fecha_inicio, fecha_fin)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=landscape(A4),
            leftMargin=15 * mm, rightMargin=15 * mm,
            topMargin=20 * mm, bottomMargin=20 * mm,
        )
        styles = _base_styles()
        elements = []

        elements.append(Paragraph("REPORTE OPERACIONAL // INTELIGENCIA DE PEDIDOS", styles["title"]))
        elements.append(Paragraph(
            f"PERIODO: {fecha_inicio.strftime('%d/%m/%Y')} — {fecha_fin.strftime('%d/%m/%Y')}  |  "
            f"GENERADO: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')}",
            styles["subtitle"],
        ))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=_BORDER, spaceAfter=10))

        total_pedidos = len(pedidos)
        total_ingresos = sum(p["total"] for p in pedidos)
        ticket_promedio = total_ingresos / total_pedidos if total_pedidos else 0.0
        dias_periodo = max((fecha_fin.date() - fecha_inicio.date()).days + 1, 1)
        promedio_diario = total_pedidos / dias_periodo if dias_periodo else 0.0
        estados_orden = ["entregado", "enviado", "en_preparacion", "pagado", "pendiente", "cancelado"]
        resumen_estados = {estado: {"pedidos": 0, "ingresos": 0.0} for estado in estados_orden}
        clientes = defaultdict(lambda: {"pedidos": 0, "ingresos": 0.0})
        for pedido in pedidos:
            estado = pedido["estado"]
            if estado not in resumen_estados:
                resumen_estados[estado] = {"pedidos": 0, "ingresos": 0.0}
            resumen_estados[estado]["pedidos"] += 1
            resumen_estados[estado]["ingresos"] += float(pedido["total"])
            clientes[pedido["cliente"]]["pedidos"] += 1
            clientes[pedido["cliente"]]["ingresos"] += float(pedido["total"])
        estado_dominante = max(resumen_estados.items(), key=lambda item: item[1]["pedidos"])[0] if pedidos else "sin datos"
        tasa_entrega = _safe_pct(resumen_estados.get("entregado", {}).get("pedidos", 0), total_pedidos)
        tasa_cancelacion = _safe_pct(resumen_estados.get("cancelado", {}).get("pedidos", 0), total_pedidos)
        resumen_texto = (
            f"Durante el periodo se procesaron <b>{total_pedidos}</b> pedidos por un valor de <b>{_format_currency(total_ingresos)}</b>. "
            f"El flujo operativo estuvo liderado por el estado <b>{_humanize_estado(estado_dominante)}</b>, "
            f"con una tasa de entrega de <b>{_format_pct(tasa_entrega)}</b> y una tasa de cancelación de <b>{_format_pct(tasa_cancelacion)}</b>. "
            f"El ritmo promedio fue de <b>{promedio_diario:.1f}</b> pedidos por día analizado."
        )
        page_w = landscape(A4)[0] - 30 * mm
        card_width = page_w / 4
        cards = [
            _build_metric_card("VOLUMEN DE PEDIDOS", str(total_pedidos), f"Promedio diario: {promedio_diario:.1f}", card_width, _ACCENT_CYAN),
            _build_metric_card("INGRESOS DEL PERIODO", _format_currency(total_ingresos), f"Ticket promedio: {_format_currency(ticket_promedio)}", card_width, _ACCENT_EMERALD),
            _build_metric_card("TASA DE ENTREGA", _format_pct(tasa_entrega), f"Estado dominante: {_humanize_estado(estado_dominante)}", card_width, _ACCENT_BLUE),
            _build_metric_card("TASA DE CANCELACIÓN", _format_pct(tasa_cancelacion), f"Periodo analizado: {dias_periodo} días", card_width, _ACCENT_AMBER),
        ]
        elements.append(_build_info_panel(resumen_texto, page_w, styles["insight"]))
        elements.append(Spacer(1, 5 * mm))
        elements.append(Table([cards], colWidths=[card_width] * 4, hAlign="LEFT"))
        elements.append(Spacer(1, 8 * mm))

        elements.append(Paragraph("01  MIX OPERATIVO POR ESTADO", styles["section"]))
        if pedidos:
            estados_data = [["ESTADO", "PEDIDOS", "PARTIC.", "INGRESOS", "TICKET", "LECTURA"]]
            estados_chart = []
            for estado in estados_orden:
                metricas = resumen_estados.get(estado, {"pedidos": 0, "ingresos": 0.0})
                if metricas["pedidos"] == 0:
                    continue
                share = _safe_pct(metricas["pedidos"], total_pedidos)
                ticket_estado = metricas["ingresos"] / metricas["pedidos"] if metricas["pedidos"] else 0.0
                lectura = "Nivel principal" if estado == estado_dominante else ("Requiere control" if estado == "cancelado" else "Seguimiento")
                estados_data.append([
                    _humanize_estado(estado),
                    str(metricas["pedidos"]),
                    _format_pct(share),
                    _format_currency(metricas["ingresos"]),
                    _format_currency(ticket_estado),
                    lectura,
                ])
                estados_chart.append({"estado": _humanize_estado(estado), "pedidos": metricas["pedidos"]})
            estados_table = Table(estados_data, colWidths=[38 * mm, 22 * mm, 23 * mm, 36 * mm, 34 * mm, 42 * mm])
            estados_style = _table_style_base()
            estados_style.append(("ALIGN", (1, 0), (4, -1), "RIGHT"))
            for row_idx, estado in enumerate([row[0].lower().replace(" ", "_") for row in estados_data[1:]], start=1):
                estados_style.append(("TEXTCOLOR", (0, row_idx), (0, row_idx), _estado_color(estado)))
                estados_style.append(("FONTNAME", (0, row_idx), (0, row_idx), "Helvetica-Bold"))
            estados_table.setStyle(TableStyle(estados_style))
            elements.append(estados_table)
            elements.append(Spacer(1, 4 * mm))
            elements.append(_build_bar_chart(estados_chart, "estado", "pedidos", page_w * 0.55, lambda value: str(int(value))))
            elements.append(Spacer(1, 7 * mm))

            top_clientes = sorted(
                (
                    {
                        "cliente": nombre,
                        "pedidos": data["pedidos"],
                        "ingresos": data["ingresos"],
                        "ticket": data["ingresos"] / data["pedidos"] if data["pedidos"] else 0.0,
                        "share": _safe_pct(data["ingresos"], total_ingresos),
                    }
                    for nombre, data in clientes.items()
                ),
                key=lambda item: (-item["ingresos"], -item["pedidos"], item["cliente"]),
            )[:5]
            elements.append(Paragraph("02  CLIENTES CON MAYOR IMPACTO OPERATIVO", styles["section"]))
            clientes_data = [["CLIENTE", "PEDIDOS", "INGRESOS", "TICKET", "% INGRESOS"]]
            for cliente in top_clientes:
                clientes_data.append([
                    cliente["cliente"][:36],
                    str(cliente["pedidos"]),
                    _format_currency(cliente["ingresos"]),
                    _format_currency(cliente["ticket"]),
                    _format_pct(cliente["share"]),
                ])
            clientes_table = Table(clientes_data, colWidths=[72 * mm, 24 * mm, 42 * mm, 40 * mm, 28 * mm])
            clientes_style = _table_style_base()
            clientes_style.append(("ALIGN", (1, 0), (-1, -1), "RIGHT"))
            clientes_table.setStyle(TableStyle(clientes_style))
            elements.append(clientes_table)
            elements.append(Spacer(1, 7 * mm))

        elements.append(Paragraph("03  DETALLE TRANSACCIONAL", styles["section"]))
        if not pedidos:
            elements.append(Paragraph(
                "No se encontraron pedidos en el rango de fechas seleccionado.",
                styles["normal"],
            ))
        else:
            data = [["PEDIDO", "CLIENTE", "EMAIL", "FECHA", "ESTADO", "TOTAL"]]
            for p in pedidos:
                data.append([
                    p["id"],
                    p["cliente"][:28],
                    p["email"][:34],
                    p["fecha"].strftime("%d/%m/%Y %H:%M") if hasattr(p["fecha"], "strftime") else str(p["fecha"])[:16],
                    _humanize_estado(p["estado"]),
                    _format_currency(p["total"]),
                ])

            ts = _table_style_base()
            ts.append(("ALIGN", (5, 0), (5, -1), "RIGHT"))
            for i, p in enumerate(pedidos, start=1):
                c = _estado_color(p["estado"])
                ts.append(("TEXTCOLOR", (4, i), (4, i), c))
                ts.append(("FONTNAME",  (4, i), (4, i), "Helvetica-Bold"))

            table = Table(
                data,
                colWidths=[24 * mm, 48 * mm, 60 * mm, 34 * mm, 36 * mm, 30 * mm],
                repeatRows=1,
            )
            table.setStyle(TableStyle(ts))
            elements.append(table)

        elements.append(Spacer(1, 6 * mm))
        elements.append(Paragraph(
            "* Documento orientado a control operativo: resume volumen, mezcla por estado, concentración de clientes y detalle transaccional del periodo.",
            styles["note"],
        ))

        doc.build(elements, onFirstPage=_draw_background, onLaterPages=_draw_background)
        return buffer.getvalue()

    # ── Reporte de Gestión ──

    async def generar_reporte_gestion(
        self,
        fecha_inicio: datetime,
        fecha_fin: datetime,
    ) -> bytes:
        """
        PDF de gestión: KPIs estratégicos para la toma de decisiones gerenciales.
        Incluye: ingresos, producto top, ticket promedio, clientes nuevos vs recurrentes,
        rentabilidad estimada.
        """
        kpis = await self.estadisticas_repo.get_kpis_gestion(fecha_inicio, fecha_fin)
        ventas_cat = await self.estadisticas_repo.get_ventas_por_categoria(fecha_inicio, fecha_fin)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=15 * mm, rightMargin=15 * mm,
            topMargin=22 * mm, bottomMargin=20 * mm,
        )
        styles = _base_styles()
        elements = []

        elements.append(Paragraph("REPORTE DE GESTIÓN // BUSINESS INTELLIGENCE", styles["title"]))
        elements.append(Paragraph(
            f"PERIODO: {fecha_inicio.strftime('%d/%m/%Y')} — {fecha_fin.strftime('%d/%m/%Y')}  |  "
            f"GENERADO: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')}",
            styles["subtitle"],
        ))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=_BORDER, spaceAfter=10))

        page_w = A4[0] - 30 * mm
        ingresos = float(kpis["ingresos_totales"])
        total_pedidos = int(kpis["total_pedidos"])
        ticket_promedio = float(kpis["ticket_promedio"])
        rentabilidad = float(kpis["rentabilidad_estimada"])
        top = kpis["producto_top"]
        total_clientes = int(kpis["total_clientes_periodo"])
        pct_nuevos = _safe_pct(kpis["clientes_nuevos"], total_clientes)
        pct_rec = _safe_pct(kpis["clientes_recurrentes"], total_clientes)
        margen = _safe_pct(rentabilidad, ingresos)
        participacion_top = _safe_pct(float(top["ingresos"]), ingresos)
        categoria_lider = ventas_cat[0]["categoria"] if ventas_cat else "Sin datos"
        resumen_texto = (
            f"El periodo cerró con <b>{_format_currency(ingresos)}</b> en ingresos y <b>{total_pedidos}</b> pedidos efectivos. "
            f"La monetización media se ubicó en <b>{_format_currency(ticket_promedio)}</b> por pedido, con una rentabilidad referencial de <b>{_format_pct(margen)}</b>. "
            f"El producto líder aportó <b>{_format_pct(participacion_top)}</b> de los ingresos del periodo y la categoría con mayor tracción fue <b>{categoria_lider}</b>."
        )
        card_width = page_w / 2
        top_cards = [
            _build_metric_card("INGRESOS TOTALES", _format_currency(ingresos), f"Producto líder: {top['nombre'][:24]}", card_width, _ACCENT_EMERALD),
            _build_metric_card("PEDIDOS EFECTIVOS", str(total_pedidos), f"Ticket promedio: {_format_currency(ticket_promedio)}", card_width, _ACCENT_CYAN),
        ]
        bottom_cards = [
            _build_metric_card("RENTABILIDAD REFERENCIAL", _format_currency(rentabilidad), f"Margen estimado: {_format_pct(margen)}", card_width, _ACCENT_AMBER),
            _build_metric_card("CLIENTES RECURRENTES", _format_pct(pct_rec), f"Clientes nuevos: {_format_pct(pct_nuevos)}", card_width, _ACCENT_VIOLET),
        ]
        elements.append(_build_info_panel(resumen_texto, page_w, styles["insight"]))
        elements.append(Spacer(1, 5 * mm))
        elements.append(Table([top_cards], colWidths=[card_width, card_width], hAlign="LEFT"))
        elements.append(Spacer(1, 3 * mm))
        elements.append(Table([bottom_cards], colWidths=[card_width, card_width], hAlign="LEFT"))
        elements.append(Spacer(1, 8 * mm))

        elements.append(Paragraph("01  RESUMEN GERENCIAL", styles["section"]))
        resumen_gestion = [
            ["INDICADOR", "VALOR", "LECTURA"],
            ["Margen operativo referencial", _format_pct(margen), "Capacidad estimada de captura de valor del periodo."],
            ["Participación del producto líder", _format_pct(participacion_top), "Mide concentración comercial sobre el principal driver."],
            ["Clientes recurrentes", _format_pct(pct_rec), "Indicador de fidelización y recompra."],
            ["Clientes nuevos", _format_pct(pct_nuevos), "Ritmo de adquisición dentro del periodo."],
        ]
        resumen_table = Table(resumen_gestion, colWidths=[48 * mm, 28 * mm, page_w - 76 * mm])
        resumen_style = _table_style_base()
        resumen_style.append(("ALIGN", (1, 0), (1, -1), "RIGHT"))
        resumen_table.setStyle(TableStyle(resumen_style))
        elements.append(resumen_table)
        elements.append(Spacer(1, 7 * mm))

        elements.append(Paragraph("02  PRODUCTO Y MOTOR COMERCIAL", styles["section"]))
        prod_data = [
            ["CAMPO", "VALOR"],
            ["Nombre", top["nombre"]],
            ["SKU", top["sku"]],
            ["Unidades vendidas", str(top["cantidad"])],
            ["Ingresos generados", _format_currency(top["ingresos"])],
            ["Participación sobre ingresos", _format_pct(participacion_top)],
        ]
        ts = _table_style_base()
        ts.append(("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"))
        ts.append(("TEXTCOLOR", (0, 0), (0, -1), _ACCENT_CYAN))
        prod_table = Table(prod_data, colWidths=[50 * mm, page_w - 50 * mm])
        prod_table.setStyle(TableStyle(ts))
        elements.append(prod_table)
        elements.append(Spacer(1, 8 * mm))

        elements.append(Paragraph("03  SEGMENTACIÓN DE CLIENTES", styles["section"]))
        cli_data = [
            ["SEGMENTO", "CANTIDAD", "% DEL TOTAL"],
            ["Clientes nuevos",       str(kpis["clientes_nuevos"]),      _format_pct(pct_nuevos)],
            ["Clientes recurrentes",  str(kpis["clientes_recurrentes"]), _format_pct(pct_rec)],
            ["TOTAL DEL PERIODO",     str(kpis["total_clientes_periodo"]), "100%"],
        ]
        ts = _table_style_base()
        ts.append(("ALIGN", (1, 0), (-1, -1), "CENTER"))
        ts.append(("TEXTCOLOR", (0, 3), (-1, 3), _ACCENT_EMERALD))
        ts.append(("FONTNAME",  (0, 3), (-1, 3), "Helvetica-Bold"))
        cli_table = Table(cli_data, colWidths=[80 * mm, 40 * mm, 60 * mm])
        cli_table.setStyle(TableStyle(ts))
        elements.append(cli_table)
        elements.append(Spacer(1, 8 * mm))

        if ventas_cat:
            elements.append(Paragraph("04  DISTRIBUCIÓN DE VENTAS POR CATEGORÍA", styles["section"]))
            cat_data = [["RANK", "CATEGORÍA", "UNIDADES", "INGRESOS", "% INGRESOS", "% ACUM."]]
            total_ingresos_cat = sum(c["ingresos"] for c in ventas_cat) or 1
            acumulado = 0.0
            chart_items = []
            for idx, c in enumerate(ventas_cat[:8], start=1):
                pct = round((c["ingresos"] / total_ingresos_cat) * 100, 1)
                acumulado = min(100.0, round(acumulado + pct, 1))
                cat_data.append([
                    str(idx),
                    c["categoria"],
                    str(c["cantidad_vendida"]),
                    _format_currency(c["ingresos"]),
                    _format_pct(pct),
                    _format_pct(acumulado),
                ])
                chart_items.append({"categoria": c["categoria"], "ingresos": c["ingresos"]})
            ts = _table_style_base()
            ts.append(("ALIGN", (0, 0), (0, -1), "CENTER"))
            ts.append(("ALIGN", (2, 0), (-1, -1), "RIGHT"))
            cat_table = Table(cat_data, colWidths=[14 * mm, 56 * mm, 24 * mm, 34 * mm, 26 * mm, 24 * mm])
            cat_table.setStyle(TableStyle(ts))
            elements.append(cat_table)
            elements.append(Spacer(1, 4 * mm))
            elements.append(_build_bar_chart(chart_items[:5], "categoria", "ingresos", page_w * 0.95, lambda value: _format_currency(value)))

        elements.append(Spacer(1, 8 * mm))
        elements.append(Paragraph(
            "* La rentabilidad estimada se calcula aplicando un margen operativo referencial del 35% sobre los ingresos del periodo. "
            "Para un análisis preciso, consultar la estructura de costos real.",
            styles["note"],
        ))

        doc.build(elements, onFirstPage=_draw_background, onLaterPages=_draw_background)
        return buffer.getvalue()
