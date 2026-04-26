"""
Servicio de generación de reportes PDF con diseño Dark Cyber.
"""

import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.admin_repo import AdminRepository


def draw_background(canvas, doc):
    """Dibuja el fondo oscuro en cada página para el tema Dark Cyber."""
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#0A0D14"))  # bg-main
    canvas.rect(0, 0, A4[0], A4[1], fill=True, stroke=False)
    
    # Agregar un borde sutil / marco
    canvas.setStrokeColor(colors.HexColor("#1E293B")) # border-subtle
    canvas.setLineWidth(1)
    canvas.rect(10*mm, 10*mm, A4[0] - 20*mm, A4[1] - 20*mm)
    
    canvas.restoreState()


class PDFService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.admin_repo = AdminRepository(db)

    async def generar_reporte_ventas(self) -> bytes:
        """Genera un PDF con el reporte de ventas usando diseño Dark Cyber."""
        ventas = await self.admin_repo.get_ventas_por_periodo("mes")
        top_productos = await self.admin_repo.get_productos_top(10)
        ventas_totales = await self.admin_repo.get_ventas_totales()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            leftMargin=15 * mm, 
            rightMargin=15 * mm, 
            topMargin=20 * mm, 
            bottomMargin=20 * mm
        )
        
        styles = getSampleStyleSheet()
        
        # Redefinir estilos para Dark Mode
        styles["Normal"].textColor = colors.HexColor("#E2E8F0")
        styles["Normal"].fontName = "Helvetica"
        styles["Normal"].fontSize = 10

        title_style = ParagraphStyle(
            "TitleDark", 
            parent=styles["Title"], 
            fontSize=22, 
            spaceAfter=8,
            textColor=colors.HexColor("#FFFFFF"),
            fontName="Helvetica-Bold",
            alignment=0, # Left align
            textTransform="uppercase",
        )
        
        meta_style = ParagraphStyle(
            "MetaDark",
            parent=styles["Normal"],
            textColor=colors.HexColor("#94A3B8"),
            fontSize=8,
            spaceAfter=20,
        )
        
        kpi_style = ParagraphStyle(
            "KPIDark",
            parent=styles["Normal"],
            fontSize=14,
            textColor=colors.HexColor("#10B981"), # Emerald accent para dinero
            fontName="Helvetica-Bold",
            spaceAfter=25,
        )

        h2_style = ParagraphStyle(
            "Heading2Dark", 
            parent=styles["Heading2"], 
            fontSize=13, 
            spaceAfter=12,
            textColor=colors.HexColor("#38BDF8"), # Light blue / Cyan accent
            fontName="Helvetica-Bold",
            textTransform="uppercase"
        )
        
        elements = []

        # Cabecera
        elements.append(Paragraph("<b>REPORTE DE VENTAS</b> // SISTEMA GLOBAL", title_style))
        elements.append(Paragraph(
            f"GENERADO: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')} | MÓDULO: ADMINISTRACIÓN",
            meta_style,
        ))
        
        # KPI Principal
        elements.append(Paragraph(f"TOTAL INGRESOS: S/. {ventas_totales:,.2f}", kpi_style))

        # Estilo de tablas compartido
        table_style_base = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")), # Header bg
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#38BDF8")), # Header text
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("TOPPADDING", (0, 0), (-1, 0), 8),
            
            # Body styles
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#121926")),
            ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#CBD5E1")),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
            ("TOPPADDING", (0, 1), (-1, -1), 6),
            
            # Grid
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#1E293B")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#0F172A"), colors.HexColor("#131C2D")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]

        # Tabla de ventas por mes
        if ventas:
            elements.append(Paragraph("HISTÓRICO POR PERIODO", h2_style))
            data = [["PERIODO", "TOTAL (S/.)", "PEDIDOS"]]
            for v in ventas:
                data.append([v["periodo"][:10], f"{v['total']:,.2f}", str(v["cantidad_pedidos"])])

            table = Table(data, colWidths=[65 * mm, 50 * mm, 40 * mm])
            
            # Clonar el estilo base y añadir alineación específica
            ts = table_style_base.copy()
            ts.extend([
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ])
            table.setStyle(TableStyle(ts))
            
            elements.append(table)
            elements.append(Spacer(1, 15 * mm))

        # Top productos
        if top_productos:
            elements.append(Paragraph("TOP 10 PRODUCTOS MÁS VENDIDOS", h2_style))
            data = [["SKU", "PRODUCTO", "CANTIDAD", "INGRESOS (S/.)"]]
            for p in top_productos:
                data.append([p["sku"], p["nombre"][:35], str(p["cantidad_vendida"]), f"{p['ingresos']:,.2f}"])

            table = Table(data, colWidths=[35 * mm, 80 * mm, 30 * mm, 35 * mm])
            
            ts = table_style_base.copy()
            ts.extend([
                ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ])
            table.setStyle(TableStyle(ts))
            
            elements.append(table)

        # Construir con la función de fondo en todas las páginas
        doc.build(elements, onFirstPage=draw_background, onLaterPages=draw_background)
        
        return buffer.getvalue()
