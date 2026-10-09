"""PDF generation for quotes using fpdf2.

Texto en el idioma pedido (catalogo `quote_pdf`) y fechas e importes con el formato del
idioma (`core/i18n/format.py`). El idioma lo resuelve quien llama con
`app.core.deps.resolve_user_locale`; aqui solo se usa.
"""

from datetime import date
from io import BytesIO

from fpdf import FPDF, XPos, YPos

from app.core.i18n import DEFAULT_LOCALE
from app.core.i18n.catalogue import exists, translate
from app.core.i18n.format import format_date, format_money, format_number
from app.modules.sales.models import Quote


def _status_label(status: str, locale: str) -> str:
    # Un estado nuevo en el backend no debe romper el PDF: sin entrada en el catalogo
    # sale el valor tal cual, como en el PDF de factura.
    key = f"quote_pdf:status.{status}"
    return translate(key, locale) if exists(key, locale) else status


class QuotePDF(FPDF):
    """PDF renderer for a Quote."""

    def __init__(self, workspace_name: str, *args, locale: str = DEFAULT_LOCALE, **kwargs):
        super().__init__(*args, **kwargs)
        self.workspace_name = workspace_name
        self._locale = locale
        self.set_margins(15, 15, 15)
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(30, 64, 175)  # blue-700
        self.cell(0, 10, self.workspace_name, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(30, 64, 175)
        self.set_line_width(0.5)
        self.line(15, self.get_y(), 195, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, translate("quote_pdf:footer", self._locale, number=self.page_no()), align="C")

    def _section_title(self, text: str):
        self.set_font("Helvetica", "B", 10)
        self.set_fill_color(239, 246, 255)  # blue-50
        self.set_text_color(30, 64, 175)
        self.cell(0, 7, text, fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(0, 0, 0)
        self.ln(1)

    def _kv(self, label: str, value: str, w_label: int = 40):
        self.set_font("Helvetica", "B", 9)
        self.cell(w_label, 6, label + ":", new_x=XPos.RIGHT, new_y=YPos.TOP)
        self.set_font("Helvetica", "", 9)
        self.cell(0, 6, value, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def _money(self, value: float, currency: str) -> str:
        return format_money(value, currency, self._locale)


def generate_quote_pdf(
    quote: Quote,
    workspace_name: str,
    contact_name: str | None = None,
    org_name: str | None = None,
    locale: str = DEFAULT_LOCALE,
) -> bytes:
    """Generate a professional PDF for the given quote. Returns raw bytes."""

    pdf = QuotePDF(workspace_name=workspace_name, locale=locale)
    pdf.add_page()

    # ── Quote header info ────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, translate("quote_pdf:title", locale), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)

    # Two-column: quote meta left, client info right
    x_left = pdf.get_x()
    y_start = pdf.get_y()

    # Left column — quote metadata
    pdf.set_xy(x_left, y_start)
    pdf._kv(translate("quote_pdf:meta.number", locale), quote.quote_number)
    pdf._kv(translate("quote_pdf:meta.title", locale), quote.title)
    pdf._kv(translate("quote_pdf:meta.status", locale), _status_label(quote.status, locale).upper())
    if quote.valid_until:
        pdf._kv(translate("quote_pdf:meta.validUntil", locale), format_date(quote.valid_until, locale))
    pdf._kv(translate("quote_pdf:meta.currency", locale), quote.currency)

    # Right column — client info
    y_client = y_start
    pdf.set_xy(110, y_client)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 6, translate("quote_pdf:customer.label", locale), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_xy(110, pdf.get_y())

    if org_name:
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 6, org_name, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_xy(110, pdf.get_y())
    if contact_name:
        pdf.set_font("Helvetica", "I", 9)
        attention = translate("quote_pdf:customer.attention", locale, name=contact_name)
        pdf.cell(0, 6, attention, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_xy(110, pdf.get_y())

    # Move below both columns
    pdf.set_xy(x_left, max(pdf.get_y(), y_start + 36))
    pdf.ln(6)

    # ── Line items table ─────────────────────────────────────────────────────
    pdf._section_title(translate("quote_pdf:items", locale))

    # Table header
    col_w = [90, 20, 30, 20, 25]  # desc, qty, unit, disc%, amount
    headers = [
        translate("quote_pdf:table.description", locale),
        translate("quote_pdf:table.quantity", locale),
        translate("quote_pdf:table.unitPrice", locale),
        translate("quote_pdf:table.discount", locale),
        translate("quote_pdf:table.amount", locale),
    ]

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(30, 64, 175)
    pdf.set_text_color(255, 255, 255)
    for w, h in zip(col_w, headers):
        pdf.cell(w, 8, h, border=1, fill=True, align="C")
    pdf.ln()

    # Table rows
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 9)
    fill = False
    for line in quote.lines:
        pdf.set_fill_color(248, 250, 252) if fill else pdf.set_fill_color(255, 255, 255)

        # Description may be long — use multi_cell trick
        x_before = pdf.get_x()
        y_before = pdf.get_y()

        pdf.multi_cell(col_w[0], 7, line.description, border="LR", fill=fill)
        row_h = pdf.get_y() - y_before

        pdf.set_xy(x_before + col_w[0], y_before)
        pdf.cell(col_w[1], row_h, format_number(line.quantity, locale, decimals=None), border="LR", align="C", fill=fill)
        pdf.cell(col_w[2], row_h, pdf._money(line.unit_price, quote.currency), border="LR", align="R", fill=fill)
        pdf.cell(col_w[3], row_h, f"{line.discount_percent:.0f}%", border="LR", align="C", fill=fill)
        pdf.cell(col_w[4], row_h, format_number(line.amount, locale), border="LR", align="R", fill=fill)
        pdf.ln(row_h)

        fill = not fill

    # Bottom border of table
    pdf.set_draw_color(30, 64, 175)
    pdf.line(pdf.get_x(), pdf.get_y(), pdf.get_x() + sum(col_w), pdf.get_y())
    pdf.ln(4)

    # ── Totals block ──────────────────────────────────────────────────────────
    total_x = 130
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(0, 0, 0)

    def total_row(label: str, value: str, bold: bool = False):
        pdf.set_font("Helvetica", "B" if bold else "", 9)
        pdf.set_x(total_x)
        pdf.cell(40, 7, label, align="L")
        pdf.cell(25, 7, value, align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    total_row(translate("quote_pdf:totals.subtotal", locale) + ":", pdf._money(quote.subtotal, quote.currency))
    if quote.discount_amount > 0:
        total_row(
            translate("quote_pdf:totals.discount", locale) + ":",
            "-" + pdf._money(quote.discount_amount, quote.currency),
        )
    if quote.tax_rate > 0:
        total_row(
            translate("quote_pdf:totals.tax", locale, rate=f"{quote.tax_rate:.0f}") + ":",
            pdf._money(quote.tax_amount, quote.currency),
        )

    # Total line with background
    pdf.set_fill_color(30, 64, 175)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_x(total_x)
    pdf.cell(40, 9, translate("quote_pdf:totals.total", locale) + ":", fill=True, align="L")
    pdf.cell(25, 9, pdf._money(quote.total, quote.currency), fill=True, align="R",
             new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(8)

    # ── Notes ─────────────────────────────────────────────────────────────────
    if quote.notes:
        pdf._section_title(translate("quote_pdf:notes", locale))
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(0, 6, quote.notes)
        pdf.ln(4)

    # ── Terms ─────────────────────────────────────────────────────────────────
    if quote.terms:
        pdf._section_title(translate("quote_pdf:terms", locale))
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(80, 80, 80)
        pdf.multi_cell(0, 5, quote.terms)

    return bytes(pdf.output())
