"""
Servicio de generación de reportes PDF con diseño Dark Cyber.

Genera dos tipos de reporte:
- Operacional: tabla de pedidos en un rango de fechas.
- Gestión: KPIs estratégicos para la toma de decisiones.
"""

import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin_repo import AdminRepository
from app.repositories.estadisticas_repo import EstadisticasRepository


# ── Paleta Dark Cyber ──
_BG_MAIN        = colors.HexColor("#0A0D14")
_BG_SURFACE     = colors.HexColor("#0F172A")
_BG_ALT         = colors.HexColor("#131C2D")
_BORDER         = colors.HexColor("#1E293B")
_TEXT_PRIMARY   = colors.HexColor("#E2E8F0")
_TEXT_SECONDARY = colors.HexColor("#94A3B8")
_ACCENT_CYAN    = colors.HexColor("#38BDF8")
_ACCENT_EMERALD = colors.HexColor("#10B981")
_ACCENT_AMBER   = colors.HexColor("#F59E0B")
_ACCENT_VIOLET  = colors.HexColor("#A78BFA")
_WHITE          = colors.HexColor("#FFFFFF")


def _draw_background(canvas, doc):
    """Dibuja el fondo oscuro en cada página para el tema Dark Cyber."""
    canvas.saveState()
    # Fondo principal
    canvas.setFillColor(_BG_MAIN)
    canvas.rect(0, 0, doc.pagesize[0], doc.pagesize[1], fill=True, stroke=False)
    # Línea de acento superior (barra delgada cyan)
    canvas.setFillColor(_ACCENT_CYAN)
    canvas.rect(0, doc.pagesize[1] - 3, doc.pagesize[0], 3, fill=True, stroke=False)
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
            textColor=_WHITE,
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
            textColor=_ACCENT_EMERALD,
            spaceAfter=2,
        ),
        "kpi_value_alt": ParagraphStyle(
            "KpiValueAlt",
            parent=ss["Normal"],
            fontSize=18,
            fontName="Helvetica-Bold",
            textColor=_ACCENT_CYAN,
            spaceAfter=2,
        ),
        "normal": ParagraphStyle(
            "DarkNormal",
            parent=ss["Normal"],
            fontSize=9,
            textColor=_TEXT_PRIMARY,
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
        ("BACKGROUND", (0, 0), (-1, 0), _BG_SURFACE),
        ("TEXTCOLOR",  (0, 0), (-1, 0), _ACCENT_CYAN),
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

        # Usamos orientación landscape para que la tabla de pedidos quepa bien
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=landscape(A4),
            leftMargin=15 * mm, rightMargin=15 * mm,
            topMargin=20 * mm, bottomMargin=20 * mm,
        )
        styles = _base_styles()
        elements = []

        # ── Cabecera ──
        elements.append(Paragraph("REPORTE OPERACIONAL // PEDIDOS", styles["title"]))
        elements.append(Paragraph(
            f"PERIODO: {fecha_inicio.strftime('%d/%m/%Y')} — {fecha_fin.strftime('%d/%m/%Y')}  |  "
            f"GENERADO: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')}",
            styles["subtitle"],
        ))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=_BORDER, spaceAfter=10))

        total_pedidos = len(pedidos)
        total_ingresos = sum(p["total"] for p in pedidos)

        # KPI resumen
        resumen_data = [
            [
                Paragraph("TOTAL PEDIDOS", styles["kpi_label"]),
                Paragraph("INGRESOS DEL PERÍODO", styles["kpi_label"]),
                Paragraph("TICKET PROMEDIO", styles["kpi_label"]),
            ],
            [
                Paragraph(str(total_pedidos), styles["kpi_value"]),
                Paragraph(f"S/. {total_ingresos:,.2f}", styles["kpi_value"]),
                Paragraph(
                    f"S/. {(total_ingresos / total_pedidos):,.2f}" if total_pedidos else "S/. 0.00",
                    styles["kpi_value"],
                ),
            ],
        ]
        resumen_table = Table(
            resumen_data,
            colWidths=[85 * mm, 85 * mm, 85 * mm],
        )
        resumen_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), _BG_SURFACE),
            ("GRID", (0, 0), (-1, -1), 0.4, _BORDER),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
        ]))
        elements.append(resumen_table)
        elements.append(Spacer(1, 8 * mm))

        # ── Tabla de pedidos ──
        elements.append(Paragraph("DETALLE DE PEDIDOS", styles["section"]))

        if not pedidos:
            elements.append(Paragraph(
                "No se encontraron pedidos en el rango de fechas seleccionado.",
                styles["normal"],
            ))
        else:
            data = [["# PEDIDO", "CLIENTE", "EMAIL", "FECHA", "ESTADO", "TOTAL (S/.)"]]
            estado_colors = {
                "pendiente":      _ACCENT_AMBER,
                "pagado":         colors.HexColor("#38BDF8"),
                "en_preparacion": _ACCENT_VIOLET,
                "enviado":        colors.HexColor("#60A5FA"),
                "entregado":      _ACCENT_EMERALD,
                "cancelado":      colors.HexColor("#F87171"),
            }
            for p in pedidos:
                data.append([
                    p["id"],
                    p["cliente"][:22],
                    p["email"][:28],
                    p["fecha"].strftime("%d/%m/%Y %H:%M") if hasattr(p["fecha"], "strftime") else str(p["fecha"])[:16],
                    p["estado"].replace("_", " ").capitalize(),
                    f"{p['total']:,.2f}",
                ])

            ts = _table_style_base()
            ts.append(("ALIGN", (5, 0), (5, -1), "RIGHT"))

            # Colorear columna "Estado" por valor
            for i, p in enumerate(pedidos, start=1):
                c = estado_colors.get(p["estado"], _TEXT_SECONDARY)
                ts.append(("TEXTCOLOR", (4, i), (4, i), c))
                ts.append(("FONTNAME",  (4, i), (4, i), "Helvetica-Bold"))

            page_w = landscape(A4)[0] - 30 * mm
            table = Table(
                data,
                colWidths=[22 * mm, 42 * mm, 52 * mm, 34 * mm, 34 * mm, 30 * mm],
            )
            table.setStyle(TableStyle(ts))
            elements.append(table)

        elements.append(Spacer(1, 6 * mm))
        elements.append(Paragraph(
            "* Los estados resaltados corresponden a: ENTREGADO (verde), ENVIADO (azul), "
            "EN PREPARACIÓN (violeta), PAGADO (cyan), PENDIENTE (ámbar), CANCELADO (rojo).",
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
        ventas_cat = await self.estadisticas_repo.get_ventas_por_categoria()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=15 * mm, rightMargin=15 * mm,
            topMargin=22 * mm, bottomMargin=20 * mm,
        )
        styles = _base_styles()
        elements = []

        # ── Cabecera ──
        elements.append(Paragraph("REPORTE DE GESTIÓN // ANÁLISIS ESTRATÉGICO", styles["title"]))
        elements.append(Paragraph(
            f"PERIODO: {fecha_inicio.strftime('%d/%m/%Y')} — {fecha_fin.strftime('%d/%m/%Y')}  |  "
            f"GENERADO: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')}",
            styles["subtitle"],
        ))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=_BORDER, spaceAfter=10))

        # ── Sección 1: KPIs Principales ──
        elements.append(Paragraph("01  INDICADORES CLAVE DE RENDIMIENTO (KPIs)", styles["section"]))

        page_w = A4[0] - 30 * mm  # ancho disponible

        kpi_data = [
            [
                Paragraph("INGRESOS TOTALES DEL PERIODO", styles["kpi_label"]),
                Paragraph("TICKET PROMEDIO POR PEDIDO", styles["kpi_label"]),
            ],
            [
                Paragraph(f"S/. {kpis['ingresos_totales']:,.2f}", styles["kpi_value"]),
                Paragraph(f"S/. {kpis['ticket_promedio']:,.2f}", styles["kpi_value_alt"]),
            ],
            [
                Paragraph("PEDIDOS EN EL PERIODO", styles["kpi_label"]),
                Paragraph("RENTABILIDAD ESTIMADA (35%)", styles["kpi_label"]),
            ],
            [
                Paragraph(str(kpis["total_pedidos"]), styles["kpi_value_alt"]),
                Paragraph(f"S/. {kpis['rentabilidad_estimada']:,.2f}", styles["kpi_value"]),
            ],
        ]
        kpi_table = Table(kpi_data, colWidths=[page_w / 2, page_w / 2])
        kpi_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), _BG_SURFACE),
            ("GRID",          (0, 0), (-1, -1), 0.4, _BORDER),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING",   (0, 0), (-1, -1), 12),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [_BG_SURFACE, _BG_ALT]),
        ]))
        elements.append(kpi_table)
        elements.append(Spacer(1, 8 * mm))

        # ── Sección 2: Producto más vendido ──
        elements.append(Paragraph("02  PRODUCTO MÁS VENDIDO", styles["section"]))
        top = kpis["producto_top"]
        prod_data = [
            ["CAMPO", "VALOR"],
            ["Nombre", top["nombre"]],
            ["SKU", top["sku"]],
            ["Unidades vendidas", str(top["cantidad"])],
            ["Ingresos generados", f"S/. {top['ingresos']:,.2f}"],
        ]
        ts = _table_style_base()
        ts.append(("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"))
        ts.append(("TEXTCOLOR", (0, 0), (0, -1), _ACCENT_CYAN))
        prod_table = Table(prod_data, colWidths=[50 * mm, page_w - 50 * mm])
        prod_table.setStyle(TableStyle(ts))
        elements.append(prod_table)
        elements.append(Spacer(1, 8 * mm))

        # ── Sección 3: Clientes nuevos vs recurrentes ──
        elements.append(Paragraph("03  SEGMENTACIÓN DE CLIENTES", styles["section"]))
        total_c = kpis["total_clientes_periodo"] or 1
        pct_nuevos = round((kpis["clientes_nuevos"] / total_c) * 100, 1)
        pct_rec    = round((kpis["clientes_recurrentes"] / total_c) * 100, 1)
        cli_data = [
            ["SEGMENTO", "CANTIDAD", "% DEL TOTAL"],
            ["Clientes nuevos",       str(kpis["clientes_nuevos"]),      f"{pct_nuevos}%"],
            ["Clientes recurrentes",  str(kpis["clientes_recurrentes"]), f"{pct_rec}%"],
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

        # ── Sección 4: Ventas por categoría ──
        if ventas_cat:
            elements.append(Paragraph("04  DISTRIBUCIÓN DE VENTAS POR CATEGORÍA", styles["section"]))
            cat_data = [["CATEGORÍA", "UNIDADES", "INGRESOS (S/.)", "% INGRESOS"]]
            total_ingresos_cat = sum(c["ingresos"] for c in ventas_cat) or 1
            for c in ventas_cat:
                pct = round((c["ingresos"] / total_ingresos_cat) * 100, 1)
                cat_data.append([
                    c["categoria"],
                    str(c["cantidad_vendida"]),
                    f"{c['ingresos']:,.2f}",
                    f"{pct}%",
                ])
            ts = _table_style_base()
            ts.append(("ALIGN", (1, 0), (-1, -1), "RIGHT"))
            cat_table = Table(cat_data, colWidths=[65 * mm, 30 * mm, 50 * mm, 35 * mm])
            cat_table.setStyle(TableStyle(ts))
            elements.append(cat_table)

        elements.append(Spacer(1, 8 * mm))
        elements.append(Paragraph(
            "* La rentabilidad estimada se calcula aplicando un margen operativo referencial del 35% sobre los ingresos del periodo. "
            "Para un análisis preciso, consultar la estructura de costos real.",
            styles["note"],
        ))

        doc.build(elements, onFirstPage=_draw_background, onLaterPages=_draw_background)
        return buffer.getvalue()
