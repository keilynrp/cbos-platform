"""
Email module — sends via SMTP if configured, logs in dev mode otherwise.
Ready to connect to any SMTP provider (SendGrid, Resend, Mailgun, etc.).
"""

import html as _html
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from app.core.config import settings
from app.core.i18n import DEFAULT_LOCALE
from app.core.i18n.catalogue import translate
from app.core.i18n.format import format_money

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
#
# El texto de cada correo vive en el catalogo `email` (`core/i18n/locales/<idioma>/
# email.json`); aqui solo queda la estructura del HTML y los estilos. Todas las
# plantillas reciben `locale` y devuelven `(subject, text_body, html_body)`.
#
# Quien llama decide el idioma, una vez:
#   - los correos internos (al vendedor y a los usuarios del workspace) usan el
#     idioma del destinatario, `app.core.deps.resolve_user_locale`;
#   - los dos que van al cliente final usan el de la sesion de portal,
#     `app.core.deps.resolve_portal_locale` (ADR 0016, punto 2).
#
# Los marcadores del HTML escapado (nombres de cliente y de workspace) llegan ya
# escapados: el catalogo no escapa nada. El formato de importes (`USD 1,234.50`) no
# sigue al idioma todavia, como en el PDF de factura (plan i18n, tarea 10).


def _scope(group: str, locale: str):
    """`t("subject", number=...)` -> el mensaje `email:<group>.subject` en `locale`."""

    def t(key: str, **params: object) -> str:
        return translate(f"email:{group}.{key}", locale, **params)

    return t


def fallback_text(key: str, locale: str = DEFAULT_LOCALE) -> str:
    """Texto de reserva para un dato que falta (`Cliente`, `Desconocido`...).

    Es de quien llama —el correo se arma con el dato o con esto— y por eso es publico:
    el texto de reserva tiene que salir en el idioma del correo, no en el del codigo.
    """
    return translate(f"email:fallback.{key}", locale)


def quote_portal_email(
    contact_name: str | None,
    workspace_name: str,
    quote_number: str,
    total: float,
    currency: str,
    valid_until: Any,
    portal_url: str,
    locale: str = DEFAULT_LOCALE,
) -> tuple[str, str, str]:
    """Returns (subject, text_body, html_body)."""
    t = _scope("quotePortal", locale)
    greeting = t("greeting", name=contact_name) if contact_name else t("greetingAnonymous")
    valid_str = str(valid_until) if valid_until else t("noExpiry")
    amount = format_money(total, currency, locale)

    subject = t("subject", number=quote_number, workspace=workspace_name)

    text_body = t(
        "text",
        greeting=greeting,
        workspace=workspace_name,
        number=quote_number,
        amount=amount,
        validUntil=valid_str,
        url=portal_url,
    )

    intro = t("intro")
    label_number = t("number")
    label_total = t("total")
    label_valid_until = t("validUntil")
    cta = t("cta")
    fallback_link = t("fallbackLink")
    signoff = t("signoff")

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #1e40af; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">{workspace_name}</h1>
  </div>
  <div style="background: #f8fafc; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">{greeting}</p>
    <p>{intro}</p>
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">{label_number}</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">{quote_number}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">{label_total}</td>
            <td style="padding: 8px 0; font-weight: bold; font-size: 18px; color: #1e40af; text-align: right;">{amount}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">{label_valid_until}</td>
            <td style="padding: 8px 0; text-align: right;">{valid_str}</td></tr>
      </table>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{portal_url}"
         style="background: #1e40af; color: white; padding: 14px 32px; border-radius: 6px;
                text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        {cta}
      </a>
    </div>
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
      {fallback_link}<br>
      <a href="{portal_url}" style="color: #1e40af;">{portal_url}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="font-size: 13px; color: #64748b; margin: 0;">
      {signoff}<br><strong>{workspace_name}</strong>
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
    locale: str = DEFAULT_LOCALE,
) -> tuple[str, str, str]:
    """Email notification when a quote is accepted by the customer."""
    t = _scope("quoteAccepted", locale)
    amount = format_money(total, currency, locale)
    subject = t("subject", number=quote_number)
    text = t("text", number=quote_number, amount=amount, order=order_number)
    title = t("title")
    body = t("body", number=quote_number, amount=amount)
    order = t("order", order=order_number)
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#16a34a">{title}</h2>
      <p>{body}</p>
      <p>{order}</p>
      <hr style="border:1px solid #e5e7eb"/>
      <p style="color:#6b7280;font-size:12px">CBOS Platform</p>
    </div>"""
    return subject, text, html


def sales_order_created_email(
    order_number: str,
    total: float,
    currency: str,
    locale: str = DEFAULT_LOCALE,
) -> tuple[str, str, str]:
    """Email notification when a new sales order is created."""
    t = _scope("salesOrderCreated", locale)
    amount = format_money(total, currency, locale)
    subject = t("subject", order=order_number)
    text = t("text", order=order_number, amount=amount)
    title = t("title")
    body = t("body", order=order_number, amount=amount)
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#2563eb">{title}</h2>
      <p>{body}</p>
      <hr style="border:1px solid #e5e7eb"/>
      <p style="color:#6b7280;font-size:12px">CBOS Platform</p>
    </div>"""
    return subject, text, html


def workflow_failed_email(
    workflow_name: str,
    error: str,
    locale: str = DEFAULT_LOCALE,
) -> tuple[str, str, str]:
    """Email alert when a workflow fails."""
    t = _scope("workflowFailed", locale)
    subject = t("subject", name=workflow_name)
    text = t("text", name=workflow_name, error=error)
    title = t("title")
    body = t("body", name=workflow_name)
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#dc2626">{title}</h2>
      <p>{body}</p>
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
    locale: str = DEFAULT_LOCALE,
) -> tuple[str, str, str]:
    """Email alert when an invoice becomes overdue."""
    t = _scope("invoiceOverdue", locale)
    amount = format_money(total, currency, locale)
    pending = format_money(amount_due, currency, locale)
    subject = t("subject", number=invoice_number)
    text = t("text", number=invoice_number, amount=amount, pending=pending, dueDate=due_date)
    title = t("title")
    body = t("body", number=invoice_number, amount=amount)
    pending_line = t("pending", pending=pending)
    due_line = t("dueDate", dueDate=due_date)
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#d97706">{title}</h2>
      <p>{body}</p>
      <p>{pending_line}</p>
      <p>{due_line}</p>
      <hr style="border:1px solid #e5e7eb"/>
      <p style="color:#6b7280;font-size:12px">CBOS Platform</p>
    </div>"""
    return subject, text, html


def low_stock_email(
    product_name: str,
    sku: str,
    current_stock: float,
    min_stock: float,
    locale: str = DEFAULT_LOCALE,
) -> tuple[str, str, str]:
    """Email alert when inventory falls below threshold."""
    t = _scope("lowStock", locale)
    subject = t("subject", product=product_name, sku=sku)
    text = t("text", product=product_name, sku=sku, current=current_stock, min=min_stock)
    title = t("title")
    product_line = t("product", product=product_name, sku=sku)
    stock_line = t("stock", current=current_stock, min=min_stock)
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#d97706">{title}</h2>
      <p>{product_line}</p>
      <p>{stock_line}</p>
      <hr style="border:1px solid #e5e7eb"/>
      <p style="color:#6b7280;font-size:12px">CBOS Platform</p>
    </div>"""
    return subject, text, html


def seller_accept_email(
    client_name: str,
    workspace_name: str,
    quote_number: str,
    order_number: str,
    total: float,
    currency: str,
    locale: str = DEFAULT_LOCALE,
) -> tuple[str, str, str]:
    """Seller notification when a client accepts via portal."""
    t = _scope("sellerAccept", locale)
    _client = _html.escape(client_name)
    _workspace = _html.escape(workspace_name)
    amount = format_money(total, currency, locale)
    subject = t("subject", client=client_name, number=quote_number)
    text = t(
        "text",
        client=client_name,
        number=quote_number,
        order=order_number,
        amount=amount,
        workspace=workspace_name,
    )
    title = t("title")
    body = t("body", client=_client, number=quote_number)
    order_label = t("orderLabel")
    total_line = t("total", amount=amount)
    footer = translate("email:workspaceFooter", locale, workspace=_workspace)
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#16a34a">{title}</h2>
      <p>{body}</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0 0 8px;font-size:13px;color:#166534">{order_label}</p>
        <p style="margin:0;font-size:24px;font-weight:700;color:#15803d;font-family:monospace">{order_number}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#166534">{total_line}</p>
      </div>
      <hr style="border:1px solid #e5e7eb"/>
      <p style="color:#6b7280;font-size:12px">{footer}</p>
    </div>"""
    return subject, text, html


def seller_reject_email(
    client_name: str,
    workspace_name: str,
    quote_number: str,
    reason: str | None,
    locale: str = DEFAULT_LOCALE,
) -> tuple[str, str, str]:
    """Seller notification when a client rejects via portal."""
    t = _scope("sellerReject", locale)
    _client = _html.escape(client_name)
    _workspace = _html.escape(workspace_name)
    _reason = _html.escape(reason) if reason else None
    subject = t("subject", client=client_name, number=quote_number)
    reason_line = t("reasonLine", reason=reason) if reason else ""
    text = t(
        "text",
        client=client_name,
        number=quote_number,
        reasonLine=reason_line,
        workspace=workspace_name,
    )
    title = t("title")
    body = t("body", client=_client, number=quote_number)
    reason_html = (
        f'<p style="color:#6b7280;font-size:13px">{t("reason", reason=_reason)}</p>' if _reason else ""
    )
    footer = translate("email:workspaceFooter", locale, workspace=_workspace)
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#dc2626">{title}</h2>
      <p>{body}</p>
      {reason_html}
      <hr style="border:1px solid #e5e7eb"/>
      <p style="color:#6b7280;font-size:12px">{footer}</p>
    </div>"""
    return subject, text, html


def client_confirmation_email(
    workspace_name: str,
    quote_number: str,
    order_number: str,
    locale: str = DEFAULT_LOCALE,
) -> tuple[str, str, str]:
    """Confirmation email sent to client after accepting a portal quote."""
    t = _scope("clientConfirmation", locale)
    _workspace = _html.escape(workspace_name)
    subject = t("subject", number=quote_number)
    text = t("text", number=quote_number, order=order_number, workspace=workspace_name)
    title = t("title")
    body = t("body", number=quote_number)
    order_label = t("orderLabel")
    save_note = t("saveNote")
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#2563eb">{title}</h2>
      <p>{body}</p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
        <p style="margin:0 0 8px;font-size:13px;color:#1e40af">{order_label}</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#1d4ed8;font-family:monospace">{order_number}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#1e40af">{save_note}</p>
      </div>
      <hr style="border:1px solid #e5e7eb"/>
      <p style="color:#6b7280;font-size:12px">{_workspace}</p>
    </div>"""
    return subject, text, html
