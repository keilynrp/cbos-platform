"""
Email module — sends via SMTP if configured, logs in dev mode otherwise.
Ready to connect to any SMTP provider (SendGrid, Resend, Mailgun, etc.).
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> bool:
    """
    Send an email. Returns True on success.
    Falls back to logging when SMTP is not configured (dev mode).
    """
    if not settings.email_enabled:
        logger.info(
            "EMAIL (dev mode — no SMTP configured)\n"
            "  To: %s\n  Subject: %s\n  Body preview: %.200s",
            to, subject, text_body or html_body,
        )
        return True

    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _send_smtp, to, subject, html_body, text_body)


def _send_smtp(to: str, subject: str, html_body: str, text_body: str | None) -> bool:
    """Blocking SMTP send — runs in thread executor."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.from_name} <{settings.from_email}>"
        msg["To"] = to

        if text_body:
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.from_email, to, msg.as_string())

        logger.info("Email sent to %s — %s", to, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


# ── Email templates ───────────────────────────────────────────────────────────

def quote_portal_email(
    contact_name: str | None,
    workspace_name: str,
    quote_number: str,
    total: float,
    currency: str,
    valid_until: Any,
    portal_url: str,
) -> tuple[str, str, str]:
    """Returns (subject, text_body, html_body)."""
    greeting = f"Hola {contact_name}," if contact_name else "Hola,"
    valid_str = str(valid_until) if valid_until else "Sin fecha límite"
    amount = f"{currency} {total:,.2f}"

    subject = f"Cotización {quote_number} de {workspace_name}"

    text_body = (
        f"{greeting}\n\n"
        f"{workspace_name} te ha enviado una cotización para tu revisión.\n\n"
        f"  Número:     {quote_number}\n"
        f"  Total:      {amount}\n"
        f"  Válida hasta: {valid_str}\n\n"
        f"Revisa y acepta tu cotización aquí:\n{portal_url}\n\n"
        f"Saludos,\n{workspace_name}"
    )

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #1e40af; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">{workspace_name}</h1>
  </div>
  <div style="background: #f8fafc; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">{greeting}</p>
    <p>Te hemos enviado una cotización para tu revisión y aprobación.</p>
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Número</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">{quote_number}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Total</td>
            <td style="padding: 8px 0; font-weight: bold; font-size: 18px; color: #1e40af; text-align: right;">{amount}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Válida hasta</td>
            <td style="padding: 8px 0; text-align: right;">{valid_str}</td></tr>
      </table>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{portal_url}"
         style="background: #1e40af; color: white; padding: 14px 32px; border-radius: 6px;
                text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        Ver y Aceptar Cotización →
      </a>
    </div>
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
      Si el botón no funciona, copia este enlace en tu navegador:<br>
      <a href="{portal_url}" style="color: #1e40af;">{portal_url}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="font-size: 13px; color: #64748b; margin: 0;">
      Saludos,<br><strong>{workspace_name}</strong>
    </p>
  </div>
</body>
</html>"""

    return subject, text_body, html_body


def quote_accepted_email(
    contact_name: str,
    quote_number: str,
    total: float,
    currency: str,
    order_number: str,
) -> tuple[str, str, str]:
    """Email notification when a quote is accepted by the customer."""
    subject = f"Cotización {quote_number} aceptada"
    text = (
        f"Hola,\n\n"
        f"La cotización {quote_number} por {currency} {total:,.2f} ha sido aceptada.\n"
        f"Número de orden generada: {order_number}\n\n"
        f"CBOS Platform"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#16a34a">Cotización aceptada ✓</h2>
      <p>La cotización <strong>{quote_number}</strong> por <strong>{currency} {total:,.2f}</strong> fue aceptada.</p>
      <p>Orden generada: <strong>{order_number}</strong></p>
      <hr style="border:1px solid #e5e7eb"/>
      <p style="color:#6b7280;font-size:12px">CBOS Platform</p>
    </div>"""
    return subject, text, html


def sales_order_created_email(
    order_number: str,
    total: float,
    currency: str,
) -> tuple[str, str, str]:
    """Email notification when a new sales order is created."""
    subject = f"Nueva orden de venta {order_number}"
    text = (
        f"Se ha creado la orden de venta {order_number} por {currency} {total:,.2f}.\n\n"
        f"CBOS Platform"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#2563eb">Nueva orden de venta</h2>
      <p>Orden <strong>{order_number}</strong> creada por <strong>{currency} {total:,.2f}</strong>.</p>
      <hr style="border:1px solid #e5e7eb"/>
      <p style="color:#6b7280;font-size:12px">CBOS Platform</p>
    </div>"""
    return subject, text, html


def workflow_failed_email(
    workflow_name: str,
    error: str,
) -> tuple[str, str, str]:
    """Email alert when a workflow fails."""
    subject = f"Workflow falló: {workflow_name}"
    text = f"El workflow '{workflow_name}' falló con el error:\n{error}\n\nCBOS Platform"
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#dc2626">Workflow falló</h2>
      <p>El workflow <strong>{workflow_name}</strong> falló.</p>
      <pre style="background:#fef2f2;padding:12px;border-radius:4px;font-size:13px">{error}</pre>
      <hr style="border:1px solid #e5e7eb"/>
      <p style="color:#6b7280;font-size:12px">CBOS Platform</p>
    </div>"""
    return subject, text, html


def invoice_overdue_email(
    invoice_number: str,
    total: float,
    amount_due: float,
    currency: str,
    due_date: str,
) -> tuple[str, str, str]:
    """Email alert when an invoice becomes overdue."""
    subject = f"Factura vencida: {invoice_number}"
    text = (
        f"La factura {invoice_number} por {currency} {total:,.2f} esta vencida.\n"
        f"Monto pendiente: {currency} {amount_due:,.2f}\n"
        f"Fecha de vencimiento: {due_date}\n\n"
        f"CBOS Platform"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#d97706">Factura vencida</h2>
      <p>La factura <strong>{invoice_number}</strong> por <strong>{currency} {total:,.2f}</strong> ha vencido.</p>
      <p>Monto pendiente: <strong>{currency} {amount_due:,.2f}</strong></p>
      <p>Fecha de vencimiento: <strong>{due_date}</strong></p>
      <hr style="border:1px solid #e5e7eb"/>
      <p style="color:#6b7280;font-size:12px">CBOS Platform</p>
    </div>"""
    return subject, text, html


def low_stock_email(
    product_name: str,
    sku: str,
    current_stock: float,
    min_stock: float,
) -> tuple[str, str, str]:
    """Email alert when inventory falls below threshold."""
    subject = f"Stock bajo: {product_name} ({sku})"
    text = (
        f"El producto {product_name} (SKU: {sku}) tiene stock bajo.\n"
        f"Stock actual: {current_stock} | Mínimo: {min_stock}\n\nCBOS Platform"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#d97706">Alerta de stock bajo</h2>
      <p>Producto: <strong>{product_name}</strong> (SKU: {sku})</p>
      <p>Stock actual: <strong>{current_stock}</strong> | Mínimo requerido: <strong>{min_stock}</strong></p>
      <hr style="border:1px solid #e5e7eb"/>
      <p style="color:#6b7280;font-size:12px">CBOS Platform</p>
    </div>"""
    return subject, text, html
