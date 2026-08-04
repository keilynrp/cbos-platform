"""
Invoice PDF generation using fpdf2.
Returns the PDF as bytes — caller decides how to deliver it (StreamingResponse, file, etc.).
"""
from __future__ import annotations

import base64
import logging
import re
from datetime import date
from io import BytesIO
from typing import TYPE_CHECKING

from fpdf import FPDF

from app.modules.accounting.fonts import register_unicode_font
from app.modules.accounting.models import CompanyProfile, Invoice

if TYPE_CHECKING:
    from app.modules.accounting.service import InvoiceParty

logger = logging.getLogger(__name__)

_DATA_URI_RE = re.compile(r"^data:image/(png|jpeg);base64,")


# ── Colours ──────────────────────────────────────────────────────────────────

_PURPLE   = (79,  70, 229)   # primary brand
_DARK     = (17,  24,  39)   # near-black text
_MUTED    = (107, 114, 128)  # secondary text
_BORDER   = (229, 231, 235)  # table/divider lines
_BG_LIGHT = (249, 250, 251)  # alternate row bg

# Status badge colours (r, g, b)
_STATUS_COLORS: dict[str, tuple[int, int, int]] = {
    "draft":     (156, 163, 175),
    "sent":      ( 59, 130, 246),
    "paid":      ( 34, 197,  94),
    "partial":   (234, 179,   8),
    "overdue":   (239,  68,  68),
    "cancelled": (156, 163, 175),
    "void":      (156, 163, 175),
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt_currency(amount: float, currency: str = "USD") -> str:
    # Only ASCII/latin-1 safe symbols — fpdf2 built-in fonts use latin-1
    symbol = {"USD": "$", "MXN": "$"}.get(currency, currency + " ")
    return f"{symbol}{amount:,.2f}"


def _fmt_date(d: date | None) -> str:
    if d is None:
        return "-"
    return d.strftime("%d/%m/%Y")


def _status_label(status: str) -> str:
    return {
        "draft":     "Borrador",
        "sent":      "Enviada",
        "paid":      "Pagada",
        "partial":   "Pago parcial",
        "overdue":   "Vencida",
        "cancelled": "Cancelada",
        "void":      "Anulada",
    }.get(status, status.capitalize())


def _decode_logo(profile: CompanyProfile | None) -> BytesIO | None:
    """Decode the stored logo into a stream fpdf2 can embed.

    Returns None for any problem — a bad logo must never break generation.
    """
    if profile is None or not profile.logo_data_uri:
        return None

    match = _DATA_URI_RE.match(profile.logo_data_uri)
    if not match:
        logger.warning("Stored logo is not a supported data URI; skipping")
        return None

    try:
        return BytesIO(base64.b64decode(profile.logo_data_uri[match.end():]))
    except Exception:
        logger.warning("Stored logo could not be decoded; skipping")
        return None


def _issuer_lines(profile: CompanyProfile | None) -> list[str]:
    """Build the issuer detail lines, skipping empty fields entirely."""
    if profile is None:
        return []

    lines: list[str] = []
    if profile.tax_id:
        lines.append(f"{profile.tax_id_label or 'ID'}: {profile.tax_id}")

    locality = " ".join(
        part for part in [profile.postal_code, profile.city, profile.state] if part
    )
    if profile.address_line:
        lines.append(profile.address_line)
    if locality:
        lines.append(locality)
    if profile.country:
        lines.append(profile.country)

    contact = "  ".join(
        part for part in [profile.email, profile.phone, profile.website] if part
    )
    if contact:
        lines.append(contact)

    return lines


def _customer_lines(party: "InvoiceParty | None") -> list[str]:
    if party is None or party.is_empty:
        return []

    lines = [party.name]
    if party.contact_name:
        lines.append(f"Atn: {party.contact_name}")
    contact = "  ".join(part for part in [party.email, party.phone] if part)
    if contact:
        lines.append(contact)
    if party.country:
        lines.append(party.country)
    return lines


# ── PDF class ─────────────────────────────────────────────────────────────────

class InvoicePDF(FPDF):
    """Custom FPDF subclass — adds header/footer."""

    def __init__(self, invoice_number: str):
        super().__init__(unit="mm", format="A4")
        self._invoice_number = invoice_number
        self._family = "Helvetica"      # replaced by register_unicode_font
        self._footer_note: str | None = None

    def footer(self):
        self.set_y(-12)
        self.set_font(self._family, size=8)
        self.set_text_color(*_MUTED)
        base = f"Factura {self._invoice_number}  |  Generado por CBOS"
        text = f"{self._footer_note}  |  {base}" if self._footer_note else base
        self.cell(0, 5, text, align="C")


# ── Main generator ────────────────────────────────────────────────────────────

def generate_invoice_pdf(
    invoice: Invoice,
    profile: CompanyProfile | None = None,
    party: "InvoiceParty | None" = None,
) -> bytes:
    """
    Build a PDF for the given Invoice ORM object (with .lines loaded).
    Returns raw PDF bytes.

    `profile` and `party` are optional: with neither, output matches the
    original hardcoded-issuer rendition.
    """
    pdf = InvoicePDF(invoice.invoice_number)
    family = register_unicode_font(pdf)
    pdf._family = family
    if profile is not None:
        pdf._footer_note = profile.invoice_footer_note
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_margins(left=15, top=15, right=15)

    page_w = pdf.w - 30  # usable width

    issuer_name = profile.legal_name if profile and profile.legal_name else "CBOS"
    logo = _decode_logo(profile)

    # ── Header bar ────────────────────────────────────────────────────────────
    pdf.set_fill_color(*_PURPLE)
    pdf.rect(15, 15, page_w, 18, style="F")

    text_x = 15
    if logo is not None:
        try:
            pdf.image(logo, x=17, y=17, h=14)
            text_x = 17 + 16
        except Exception:
            logger.warning("Logo could not be embedded; rendering text only")

    pdf.set_xy(text_x, 15)
    pdf.set_font(family, style="B", size=14)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(page_w / 2, 18, issuer_name, align="L")

    pdf.set_xy(15 + page_w / 2, 15)
    pdf.set_font(family, style="B", size=14)
    pdf.cell(page_w / 2, 18, "FACTURA", align="R")

    pdf.ln(20)

    # ── Issuer / customer blocks ──────────────────────────────────────────────
    issuer = _issuer_lines(profile)
    customer = _customer_lines(party)

    if issuer or customer:
        block_top = pdf.get_y()
        pdf.set_font(family, size=8)

        if issuer:
            pdf.set_text_color(*_MUTED)
            pdf.set_xy(15, block_top)
            for text in issuer:
                pdf.set_x(15)
                pdf.cell(page_w / 2, 4, text)
                pdf.ln(4)

        if customer:
            pdf.set_xy(15 + page_w / 2, block_top)
            pdf.set_text_color(*_MUTED)
            pdf.cell(page_w / 2, 4, "Cliente", align="R")
            pdf.ln(4)
            pdf.set_text_color(*_DARK)
            for text in customer:
                pdf.set_x(15 + page_w / 2)
                pdf.cell(page_w / 2, 4, text, align="R")
                pdf.ln(4)

        # The customer column carries one extra row for its "Cliente" label.
        issuer_rows = len(issuer)
        customer_rows = len(customer) + 1 if customer else 0
        pdf.set_y(block_top + 4 * max(issuer_rows, customer_rows))
        pdf.ln(4)

    # ── Invoice meta row ──────────────────────────────────────────────────────
    pdf.set_text_color(*_DARK)

    # Left block: number + status
    left_x = 15
    pdf.set_xy(left_x, pdf.get_y())
    pdf.set_font(family, style="B", size=18)
    pdf.cell(page_w / 2, 9, invoice.invoice_number)

    # Status badge (right-aligned)
    status_color = _STATUS_COLORS.get(invoice.status, _MUTED)
    badge_label = _status_label(invoice.status)
    pdf.set_font(family, style="B", size=9)
    badge_w = pdf.get_string_width(badge_label) + 8
    badge_x = 15 + page_w - badge_w
    badge_y = pdf.get_y()
    pdf.set_fill_color(*status_color)
    pdf.set_text_color(255, 255, 255)
    pdf.rect(badge_x, badge_y, badge_w, 7, style="F")
    pdf.set_xy(badge_x, badge_y)
    pdf.cell(badge_w, 7, badge_label, align="C")

    pdf.ln(10)

    # ── Dates grid ────────────────────────────────────────────────────────────
    pdf.set_text_color(*_MUTED)
    pdf.set_font(family, size=8)
    col_w = page_w / 3

    labels = ["Fecha de emisión", "Fecha de vencimiento", "Moneda"]
    values = [_fmt_date(invoice.issue_date), _fmt_date(invoice.due_date), invoice.currency]

    for i, (lbl, val) in enumerate(zip(labels, values)):
        x = 15 + i * col_w
        pdf.set_xy(x, pdf.get_y())
        pdf.cell(col_w, 5, lbl)

    pdf.ln(5)
    pdf.set_text_color(*_DARK)
    pdf.set_font(family, style="B", size=10)
    for i, (_, val) in enumerate(zip(labels, values)):
        x = 15 + i * col_w
        pdf.set_xy(x, pdf.get_y())
        pdf.cell(col_w, 6, val)

    pdf.ln(10)

    # ── Divider ───────────────────────────────────────────────────────────────
    pdf.set_draw_color(*_BORDER)
    pdf.line(15, pdf.get_y(), 15 + page_w, pdf.get_y())
    pdf.ln(5)

    # ── Line items table ──────────────────────────────────────────────────────
    # Column widths: description | qty | unit price | discount | subtotal
    desc_w  = page_w * 0.45
    qty_w   = page_w * 0.10
    price_w = page_w * 0.17
    disc_w  = page_w * 0.11
    sub_w   = page_w * 0.17

    # Table header
    header_y = pdf.get_y()
    pdf.set_fill_color(*_BG_LIGHT)
    pdf.rect(15, header_y, page_w, 7, style="F")

    pdf.set_text_color(*_MUTED)
    pdf.set_font(family, style="B", size=8)
    pdf.set_xy(15, header_y)
    pdf.cell(desc_w,  7, "Descripción",      align="L")
    pdf.cell(qty_w,   7, "Cant.",            align="C")
    pdf.cell(price_w, 7, "Precio unit.",     align="R")
    pdf.cell(disc_w,  7, "Dto. %",           align="R")
    pdf.cell(sub_w,   7, "Subtotal",         align="R")
    pdf.ln(8)

    # Rows
    pdf.set_font(family, size=9)
    for i, line in enumerate(invoice.lines):
        row_y = pdf.get_y()
        if i % 2 == 1:
            pdf.set_fill_color(*_BG_LIGHT)
            pdf.rect(15, row_y, page_w, 7, style="F")

        pdf.set_text_color(*_DARK)
        pdf.set_xy(15, row_y)

        # Description — truncate if too long (use ASCII "..." — not "…")
        desc = line.description[:55] + "..." if len(line.description) > 55 else line.description
        pdf.cell(desc_w,  7, desc,                                     align="L")
        pdf.cell(qty_w,   7, f"{line.quantity:g}",                     align="C")
        pdf.cell(price_w, 7, _fmt_currency(line.unit_price, invoice.currency), align="R")
        pdf.cell(disc_w,  7, f"{line.discount_pct:.0f}%" if line.discount_pct else "-", align="R")
        pdf.cell(sub_w,   7, _fmt_currency(line.subtotal, invoice.currency),   align="R")
        pdf.ln(8)

    # Divider after rows
    pdf.set_draw_color(*_BORDER)
    pdf.line(15, pdf.get_y(), 15 + page_w, pdf.get_y())
    pdf.ln(4)

    # ── Totals block (right-aligned) ──────────────────────────────────────────
    totals_x = 15 + page_w * 0.55
    totals_w = page_w * 0.45
    label_w  = totals_w * 0.55
    value_w  = totals_w * 0.45

    def _total_row(label: str, value: str, bold: bool = False, color=_DARK):
        style = "B" if bold else ""
        pdf.set_font(family, style=style, size=9)
        pdf.set_text_color(*_MUTED if not bold else _DARK)
        pdf.set_xy(totals_x, pdf.get_y())
        pdf.cell(label_w, 6, label, align="L")
        pdf.set_text_color(*color)
        pdf.cell(value_w, 6, value, align="R")
        pdf.ln(6)

    _total_row("Subtotal",   _fmt_currency(invoice.subtotal, invoice.currency))
    if invoice.discount_amount > 0:
        _total_row("Descuento", f"- {_fmt_currency(invoice.discount_amount, invoice.currency)}")
    if invoice.tax_rate > 0:
        _total_row(f"IVA ({invoice.tax_rate:.0f}%)", _fmt_currency(invoice.tax_amount, invoice.currency))

    # Total line with background
    total_row_y = pdf.get_y()
    pdf.set_fill_color(*_PURPLE)
    pdf.rect(totals_x, total_row_y, totals_w, 8, style="F")
    pdf.set_font(family, style="B", size=10)
    pdf.set_text_color(255, 255, 255)
    pdf.set_xy(totals_x, total_row_y)
    pdf.cell(label_w, 8, "TOTAL", align="L")
    pdf.cell(value_w, 8, _fmt_currency(invoice.total, invoice.currency), align="R")
    pdf.ln(9)

    if invoice.amount_paid > 0:
        _total_row("Pagado",       _fmt_currency(invoice.amount_paid, invoice.currency))
        overdue = invoice.status == "overdue"
        _total_row(
            "Saldo pendiente",
            _fmt_currency(invoice.amount_due, invoice.currency),
            bold=True,
            color=(239, 68, 68) if overdue else _DARK,
        )

    pdf.ln(4)

    # ── Notes ─────────────────────────────────────────────────────────────────
    if invoice.notes:
        pdf.set_draw_color(*_BORDER)
        pdf.line(15, pdf.get_y(), 15 + page_w, pdf.get_y())
        pdf.ln(4)
        pdf.set_font(family, style="B", size=8)
        pdf.set_text_color(*_MUTED)
        pdf.set_x(15)
        pdf.cell(0, 5, "Notas")
        pdf.ln(5)
        pdf.set_font(family, size=8)
        pdf.set_text_color(*_DARK)
        pdf.set_x(15)
        pdf.multi_cell(page_w, 5, invoice.notes)

    # ── Output ────────────────────────────────────────────────────────────────
    buf = BytesIO()
    pdf.output(buf)
    return buf.getvalue()
