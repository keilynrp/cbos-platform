"""Tests for invoice PDF rendering, including issuer and customer blocks."""

import os
from unittest.mock import patch

import pytest
from fpdf import FPDF

from app.modules.accounting.fonts import (
    FONT_CANDIDATES,
    UNICODE_FAMILY,
    register_unicode_font,
)

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
