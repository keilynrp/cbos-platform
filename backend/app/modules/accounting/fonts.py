"""
Unicode font registration for invoice PDFs.

fpdf2's built-in Helvetica is latin-1 only, which mangles user-entered company
names and addresses. We register a Unicode TTF when one is available on the
system and fall back to Helvetica otherwise — a missing font must degrade the
typography, never break invoice generation.
"""
from __future__ import annotations

import logging
import os

from fpdf import FPDF

logger = logging.getLogger(__name__)

UNICODE_FAMILY = "DejaVu"

# (style, absolute path). Style "" is regular, "B" is bold.
FONT_CANDIDATES: list[tuple[str, str]] = [
    ("",  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ("B", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
]


def register_unicode_font(pdf: FPDF) -> str:
    """Register a Unicode TTF on `pdf` and return the family name to use.

    Returns "Helvetica" when no usable font file is present.
    """
    available = [(style, path) for style, path in FONT_CANDIDATES if os.path.exists(path)]

    # The regular style is mandatory — bold alone is not a usable family.
    if not any(style == "" for style, _ in available):
        logger.warning(
            "No Unicode TTF found; falling back to Helvetica. "
            "Accented characters may render incorrectly."
        )
        return "Helvetica"

    for style, path in available:
        try:
            pdf.add_font(UNICODE_FAMILY, style=style, fname=path)
        except Exception:
            logger.warning("Could not register font %s (style=%r)", path, style)
            return "Helvetica"

    return UNICODE_FAMILY
