"""
Servicio de generación de reportes PDF.
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


class PDFService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.admin_repo = AdminRepository(db)

    async def generar_reporte_ventas(self) -> bytes:
        """Genera un PDF con el reporte de ventas."""
        ventas = await self.admin_repo.get_ventas_por_periodo("mes")
        top_productos = await self.admin_repo.get_productos_top(10)
        ventas_totales = await self.admin_repo.get_ventas_totales()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
        styles = getSampleStyleSheet()
        elements = []

        # Título
        title_style = ParagraphStyle("Title", parent=styles["Title"], fontSize=18, spaceAfter=12)
        elements.append(Paragraph("Reporte de Ventas", title_style))
        elements.append(Paragraph(
            f"Generado: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')}",
            styles["Normal"],
        ))
        elements.append(Spacer(1, 10 * mm))

        # Resumen
        elements.append(Paragraph(f"<b>Ventas Totales:</b> S/. {ventas_totales:,.2f}", styles["Normal"]))
        elements.append(Spacer(1, 5 * mm))

        # Tabla de ventas por mes
        if ventas:
            elements.append(Paragraph("<b>Ventas por Mes</b>", styles["Heading2"]))
            data = [["Periodo", "Total (S/.)", "Pedidos"]]
            for v in ventas:
                data.append([v["periodo"][:10], f"{v['total']:,.2f}", str(v["cantidad_pedidos"])])

            table = Table(data, colWidths=[60 * mm, 50 * mm, 40 * mm])
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#ecf0f1")]),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 8 * mm))

        # Top productos
        if top_productos:
            elements.append(Paragraph("<b>Top 10 Productos Más Vendidos</b>", styles["Heading2"]))
            data = [["SKU", "Producto", "Cantidad", "Ingresos (S/.)"]]
            for p in top_productos:
                data.append([p["sku"], p["nombre"][:30], str(p["cantidad_vendida"]), f"{p['ingresos']:,.2f}"])

            table = Table(data, colWidths=[30 * mm, 60 * mm, 30 * mm, 40 * mm])
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#ecf0f1")]),
            ]))
            elements.append(table)

        doc.build(elements)
        return buffer.getvalue()
