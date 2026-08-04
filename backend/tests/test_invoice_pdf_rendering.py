"""Tests for invoice PDF rendering, including issuer and customer blocks."""

import base64
import os
from datetime import date
from io import BytesIO
from unittest.mock import patch

import pytest
from fpdf import FPDF
from pypdf import PdfReader

from app.modules.accounting.fonts import (
    FONT_CANDIDATES,
    UNICODE_FAMILY,
    register_unicode_font,
)
from app.modules.accounting.models import CompanyProfile, Invoice, InvoiceLine
from app.modules.accounting.pdf import generate_invoice_pdf
from app.modules.accounting.service import InvoiceParty


def _text(pdf_bytes: bytes) -> str:
    """Extract the rendered text of a PDF.

    Byte-level assertions are not an option: fpdf2 embeds a subset of DejaVu
    and encodes the text as glyph indices, so the literal strings never appear
    in the output.
    """
    reader = PdfReader(BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() for page in reader.pages)


def _invoice(**kwargs) -> Invoice:
    """Build an unpersisted Invoice with one line — enough for rendering."""
    inv = Invoice(
        workspace_id="ws-1",
        invoice_number="INV-2026-0001",
        status="sent",
        issue_date=date(2026, 8, 3),
        due_date=date(2026, 9, 3),
        currency="USD",
        subtotal=1000.0,
        discount_amount=0.0,
        tax_rate=16.0,
        tax_amount=160.0,
        total=1160.0,
        amount_paid=0.0,
        amount_due=1160.0,
        **kwargs,
    )
    inv.lines = [
        InvoiceLine(
            line_order=0,
            description="Servicio de consultoria",
            quantity=10,
            unit_price=100.0,
            discount_pct=0.0,
            subtotal=1000.0,
        )
    ]
    inv.payments = []
    return inv


# A 1x1 transparent PNG — smallest valid image for logo tests.
_PNG_1PX = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)
_LOGO_URI = "data:image/png;base64," + base64.b64encode(_PNG_1PX).decode()

# The regular style is the one that decides whether the family is usable at all.
_REGULAR_FONT_PATH = next(path for style, path in FONT_CANDIDATES if style == "")


class TestFontRegistration:
    def test_the_image_ships_the_unicode_font(self):
        """The backend image must carry a Unicode TTF.

        Guards the Dockerfile: if fonts-dejavu-core stops being installed,
        every invoice silently degrades to latin-1 Helvetica and mangles
        accented company names. The fallback keeps PDFs generating, so nothing
        else in the suite would notice.

        This assertion assumes the suite runs inside the backend container,
        which is already the case — conftest points TEST_DATABASE_URL at the
        compose-internal host `postgres`.
        """
        assert os.path.exists(_REGULAR_FONT_PATH), (
            f"{_REGULAR_FONT_PATH} is missing. Install fonts-dejavu-core in "
            "backend/Dockerfile and rebuild the image."
        )

    def test_registers_the_unicode_family_when_the_font_is_installed(self):
        """The happy path: a present TTF must actually be used, not skipped."""
        pdf = FPDF()
        family = register_unicode_font(pdf)
        assert family == UNICODE_FAMILY, (
            f"Expected {UNICODE_FAMILY!r} but got {family!r}: the font file is "
            "present, so registration should have succeeded rather than "
            "falling back."
        )

    def test_renders_characters_outside_latin_1(self):
        """The registered family must cover what the core fonts cannot.

        Spanish accents and enies are *not* the discriminator here: they all
        live in latin-1, so built-in Helvetica renders them correctly. What it
        cannot represent are symbols outside latin-1 — the colon and guarani
        currency signs below are realistic for this product's users, and the
        curly apostrophe arrives whenever someone pastes from a word processor.
        """
        pdf = FPDF()
        family = register_unicode_font(pdf)
        pdf.add_page()
        pdf.set_font(family, size=12)
        pdf.cell(0, 10, "Distribuidora Ñandú ₡ ₲ — “comercial”")
        assert pdf.output().startswith(b"%PDF")

    def test_returns_a_usable_family_name(self):
        pdf = FPDF()
        family = register_unicode_font(pdf)
        pdf.add_page()
        pdf.set_font(family, size=12)
        pdf.cell(0, 10, "Compania Nandu")  # must not raise

    def test_falls_back_to_helvetica_when_no_font_file_exists(self):
        pdf = FPDF()
        with patch("app.modules.accounting.fonts.FONT_CANDIDATES", []):
            family = register_unicode_font(pdf)
        assert family == "Helvetica"

    def test_fallback_still_produces_a_valid_pdf(self):
        pdf = FPDF()
        with patch("app.modules.accounting.fonts.FONT_CANDIDATES", []):
            family = register_unicode_font(pdf)
        pdf.add_page()
        pdf.set_font(family, size=12)
        pdf.cell(0, 10, "Compania Nandu")
        assert pdf.output().startswith(b"%PDF")


class TestBackwardsCompatibility:
    """The hard requirement: a workspace that configures nothing keeps its PDF.

    Note that "CBOS" also appears in the footer ("Generado por CBOS") on every
    invoice, configured or not. So a bare `"CBOS" in text` proves nothing —
    these tests count occurrences to tell the header apart from the footer.
    """

    def test_no_profile_renders_cbos_as_the_issuer(self):
        text = _text(generate_invoice_pdf(_invoice()))
        assert text.count("CBOS") == 2, (
            "Expected CBOS twice (issuer header + footer credit); got "
            f"{text.count('CBOS')}"
        )

    def test_no_profile_call_signature_unchanged(self):
        """The single-argument call used by the existing endpoint must work."""
        assert generate_invoice_pdf(_invoice()).startswith(b"%PDF")

    def test_empty_profile_still_renders_cbos(self):
        """A profile row exists but has no legal name — still the fallback."""
        profile = CompanyProfile(workspace_id="ws-1")
        text = _text(generate_invoice_pdf(_invoice(), profile=profile))
        assert text.count("CBOS") == 2

    def test_invoice_fields_still_render(self):
        text = _text(generate_invoice_pdf(_invoice()))
        assert "INV-2026-0001" in text
        assert "Servicio de consultoria" in text
        assert "1,160.00" in text


class TestIssuerRendering:
    def test_legal_name_replaces_cbos_in_the_header(self):
        profile = CompanyProfile(
            workspace_id="ws-1", legal_name="Compania Nandu S.A. de C.V."
        )
        text = _text(generate_invoice_pdf(_invoice(), profile=profile))
        assert "Compania Nandu S.A. de C.V." in text
        assert text.count("CBOS") == 1, "Only the footer credit should remain"

    def test_renders_the_issuer_details(self):
        profile = CompanyProfile(
            workspace_id="ws-1",
            legal_name="Compania Nandu S.A. de C.V.",
            tax_id="ABC010203XYZ",
            tax_id_label="RFC",
            address_line="Av. Reforma 123",
            city="Ciudad de Mexico",
            country="Mexico",
            email="hola@nandu.mx",
        )
        text = _text(generate_invoice_pdf(_invoice(), profile=profile))
        assert "RFC: ABC010203XYZ" in text
        assert "Av. Reforma 123" in text
        assert "Ciudad de Mexico" in text
        assert "Mexico" in text
        assert "hola@nandu.mx" in text

    def test_renders_the_footer_note(self):
        profile = CompanyProfile(
            workspace_id="ws-1",
            legal_name="Acme",
            invoice_footer_note="Gracias por su preferencia",
        )
        text = _text(generate_invoice_pdf(_invoice(), profile=profile))
        assert "Gracias por su preferencia" in text

    def test_accented_legal_name_renders_intact(self):
        profile = CompanyProfile(
            workspace_id="ws-1", legal_name="Compañía Ñandú S.A. de C.V."
        )
        text = _text(generate_invoice_pdf(_invoice(), profile=profile))
        assert "Compañía Ñandú S.A. de C.V." in text

    def test_renders_with_logo(self):
        profile = CompanyProfile(
            workspace_id="ws-1", legal_name="Acme", logo_data_uri=_LOGO_URI
        )
        text = _text(generate_invoice_pdf(_invoice(), profile=profile))
        assert "Acme" in text

    def test_corrupt_logo_does_not_break_generation(self):
        """A bad stored logo must degrade, not take the invoice down."""
        profile = CompanyProfile(
            workspace_id="ws-1",
            legal_name="Acme",
            logo_data_uri="data:image/png;base64,zzzznotanimage",
        )
        text = _text(generate_invoice_pdf(_invoice(), profile=profile))
        assert "Acme" in text, "The issuer name must survive a broken logo"


class TestCustomerRendering:
    def test_renders_customer_block(self):
        party = InvoiceParty(
            name="Cliente Ejemplo S.A.",
            contact_name="Maria Rodriguez",
            email="maria@example.com",
            country="Peru",
        )
        text = _text(generate_invoice_pdf(_invoice(), party=party))
        assert "Cliente Ejemplo S.A." in text
        assert "Atn: Maria Rodriguez" in text
        assert "maria@example.com" in text
        assert "Peru" in text

    def test_empty_party_omits_the_block(self):
        text = _text(generate_invoice_pdf(_invoice(), party=InvoiceParty()))
        assert "Cliente" not in text

    def test_invoice_with_no_lines_renders(self):
        inv = _invoice()
        inv.lines = []
        assert generate_invoice_pdf(inv).startswith(b"%PDF")


class TestPdfEndpoint:
    """End to end: the configured profile must reach the downloaded file."""

    @pytest.mark.asyncio
    async def test_download_uses_the_configured_issuer(self, client, auth_headers):
        created = await client.post(
            "/api/v1/accounting/invoices",
            json={
                "issue_date": "2026-08-03",
                "currency": "USD",
                "lines": [
                    {"description": "Servicio de consultoria", "quantity": 2, "unit_price": 500}
                ],
            },
            headers=auth_headers,
        )
        assert created.status_code == 201
        invoice_id = created.json()["id"]

        await client.put(
            "/api/v1/accounting/company-profile",
            json={
                "legal_name": "Compania Nandu S.A. de C.V.",
                "tax_id": "ABC010203XYZ",
                "tax_id_label": "RFC",
                "invoice_footer_note": "Gracias por su preferencia",
            },
            headers=auth_headers,
        )

        resp = await client.get(
            f"/api/v1/accounting/invoices/{invoice_id}/pdf", headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"

        text = _text(resp.content)
        assert "Compania Nandu S.A. de C.V." in text
        assert "RFC: ABC010203XYZ" in text
        assert "Gracias por su preferencia" in text

    @pytest.mark.asyncio
    async def test_download_without_a_profile_still_says_cbos(self, client, auth_headers):
        """A workspace that never configured anything keeps the old document."""
        created = await client.post(
            "/api/v1/accounting/invoices",
            json={
                "issue_date": "2026-08-03",
                "currency": "USD",
                "lines": [{"description": "Servicio", "quantity": 1, "unit_price": 100}],
            },
            headers=auth_headers,
        )
        invoice_id = created.json()["id"]

        resp = await client.get(
            f"/api/v1/accounting/invoices/{invoice_id}/pdf", headers=auth_headers
        )
        assert resp.status_code == 200
        assert _text(resp.content).count("CBOS") == 2
