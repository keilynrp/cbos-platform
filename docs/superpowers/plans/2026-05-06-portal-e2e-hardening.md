# Portal End-to-End Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the quote portal flow so sellers can share links from QuoteDetail, customers see a professional branded portal, and sellers receive email notifications on accept/reject.

**Architecture:** Three backend changes (3 email templates + 2 service wiring calls + 3 new tests) and two frontend changes (share button/dialog in QuoteDetail + full redesign of CustomerPortal). No new routes, models, or migrations needed.

**Tech Stack:** FastAPI + SQLAlchemy async (backend), React + TanStack Query + Tailwind (frontend), pytest-asyncio + httpx (tests).

---

## File Map

| File | Change |
|------|--------|
| `backend/app/core/email.py` | Add 3 email templates: `seller_accept_email`, `seller_reject_email`, `client_confirmation_email` |
| `backend/app/modules/portal/service.py` | Wire email calls into `portal_accept` and `portal_reject`; import `User` model |
| `backend/tests/test_portal_contract.py` | Add 3 tests: seller notified on accept, seller notified on reject, no client email when session has none |
| `composable-os/src/pages/QuoteDetail.tsx` | Add share button, active session banner, and share dialog |
| `composable-os/src/pages/CustomerPortal.tsx` | Full Level C redesign: dark branded layout, inline forms, post-action screen |

---

## Task 1: Write failing backend tests

**Files:**
- Modify: `backend/tests/test_portal_contract.py`

- [ ] **Step 1: Add 3 new tests to `test_portal_contract.py`**

  Append to the bottom of the file (after `test_create_session_emits_portal_session_created_event`):

  ```python
  # ── Email notifications ───────────────────────────────────────────────────────

  async def test_accept_sends_seller_notification(
      client: AsyncClient, auth_headers: dict
  ):
      """portal_accept calls send_email with seller notification after commit."""
      from unittest.mock import patch

      quote = await _create_quote(client, auth_headers)
      session = await _create_session(
          client, auth_headers, quote["id"],
          client_email="buyer@example.com",
      )
      token = session["token"]

      sent_calls: list[tuple] = []

      async def capture(*args, **kwargs):
          sent_calls.append(args)
          return True

      with patch("app.modules.portal.service.send_email", side_effect=capture):
          resp = await client.post(f"{PUBLIC}/quote/{token}/accept", json={
              "client_name": "Ana García",
          })
      assert resp.status_code == 200, resp.text

      # At least one email call: seller notification
      assert len(sent_calls) >= 1
      seller_call = sent_calls[0]
      assert "@" in seller_call[0]           # valid email address
      assert quote["quote_number"] in seller_call[1]   # subject contains quote number


  async def test_reject_sends_seller_notification(
      client: AsyncClient, auth_headers: dict
  ):
      """portal_reject calls send_email with seller notification after commit."""
      from unittest.mock import patch

      quote = await _create_quote(client, auth_headers)
      session = await _create_session(client, auth_headers, quote["id"])
      token = session["token"]

      sent_calls: list[tuple] = []

      async def capture(*args, **kwargs):
          sent_calls.append(args)
          return True

      with patch("app.modules.portal.service.send_email", side_effect=capture):
          resp = await client.post(f"{PUBLIC}/quote/{token}/reject", json={
              "reason": "Precio muy alto",
          })
      assert resp.status_code == 200, resp.text

      assert len(sent_calls) >= 1
      seller_call = sent_calls[0]
      assert "@" in seller_call[0]
      assert quote["quote_number"] in seller_call[1]


  async def test_accept_sends_only_seller_email_when_no_client_email(
      client: AsyncClient, auth_headers: dict
  ):
      """portal_accept skips client confirmation when session.client_email is None."""
      from unittest.mock import patch

      quote = await _create_quote(client, auth_headers)
      # Create session with NO client email
      resp = await client.post(f"{PORTAL}/sessions", headers=auth_headers, json={
          "quote_id": quote["id"],
      })
      assert resp.status_code == 201
      token = resp.json()["token"]

      sent_calls: list[tuple] = []

      async def capture(*args, **kwargs):
          sent_calls.append(args)
          return True

      with patch("app.modules.portal.service.send_email", side_effect=capture):
          resp = await client.post(f"{PUBLIC}/quote/{token}/accept", json={})
      assert resp.status_code == 200, resp.text

      # Only seller email (1 call), no client confirmation
      assert len(sent_calls) == 1
  ```

- [ ] **Step 2: Run the 3 new tests to verify they fail**

  ```
  docker compose exec backend pytest tests/test_portal_contract.py::test_accept_sends_seller_notification tests/test_portal_contract.py::test_reject_sends_seller_notification tests/test_portal_contract.py::test_accept_sends_only_seller_email_when_no_client_email -v
  ```

  Expected: **3 FAILED** — `AssertionError: assert 0 >= 1` (send_email is never called because the service doesn't call it yet).

---

## Task 2: Add email templates

**Files:**
- Modify: `backend/app/core/email.py`

- [ ] **Step 3: Append 3 template functions to `backend/app/core/email.py`**

  Append after the `low_stock_email` function:

  ```python


  def seller_accept_email(
      client_name: str,
      workspace_name: str,
      quote_number: str,
      order_number: str,
      total: float,
      currency: str,
  ) -> tuple[str, str, str]:
      """Seller notification when a client accepts via portal."""
      subject = f"{client_name} aceptó la propuesta {quote_number}"
      text = (
          f"¡Buenas noticias!\n\n"
          f"{client_name} ha aceptado la propuesta {quote_number}.\n\n"
          f"  Orden creada: {order_number}\n"
          f"  Total:        {currency} {total:,.2f}\n\n"
          f"{workspace_name} · CBOS Platform"
      )
      html = f"""
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#16a34a">✓ Propuesta aceptada</h2>
        <p><strong>{client_name}</strong> aceptó la propuesta <strong>{quote_number}</strong>.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px;font-size:13px;color:#166534">Orden generada</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#15803d;font-family:monospace">{order_number}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#166534">Total: {currency} {total:,.2f}</p>
        </div>
        <hr style="border:1px solid #e5e7eb"/>
        <p style="color:#6b7280;font-size:12px">{workspace_name} · CBOS Platform</p>
      </div>"""
      return subject, text, html


  def seller_reject_email(
      client_name: str,
      workspace_name: str,
      quote_number: str,
      reason: str | None,
  ) -> tuple[str, str, str]:
      """Seller notification when a client rejects via portal."""
      subject = f"{client_name} rechazó la propuesta {quote_number}"
      reason_line = f"\n  Motivo: {reason}" if reason else ""
      text = (
          f"{client_name} rechazó la propuesta {quote_number}.{reason_line}\n\n"
          f"{workspace_name} · CBOS Platform"
      )
      reason_html = (
          f'<p style="color:#6b7280;font-size:13px">Motivo: {reason}</p>' if reason else ""
      )
      html = f"""
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#dc2626">✗ Propuesta rechazada</h2>
        <p><strong>{client_name}</strong> rechazó la propuesta <strong>{quote_number}</strong>.</p>
        {reason_html}
        <hr style="border:1px solid #e5e7eb"/>
        <p style="color:#6b7280;font-size:12px">{workspace_name} · CBOS Platform</p>
      </div>"""
      return subject, text, html


  def client_confirmation_email(
      workspace_name: str,
      quote_number: str,
      order_number: str,
  ) -> tuple[str, str, str]:
      """Confirmation email sent to client after accepting a portal quote."""
      subject = f"Confirmación — {quote_number} aceptada"
      text = (
          f"Gracias por aceptar la propuesta {quote_number}.\n\n"
          f"Tu número de orden es: {order_number}\n"
          f"Guarda este número para consultas futuras.\n\n"
          f"{workspace_name}"
      )
      html = f"""
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563eb">Confirmación de propuesta</h2>
        <p>Gracias por aceptar la propuesta <strong>{quote_number}</strong>.</p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
          <p style="margin:0 0 8px;font-size:13px;color:#1e40af">Tu número de orden</p>
          <p style="margin:0;font-size:28px;font-weight:700;color:#1d4ed8;font-family:monospace">{order_number}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#1e40af">Guarda este número para consultas</p>
        </div>
        <hr style="border:1px solid #e5e7eb"/>
        <p style="color:#6b7280;font-size:12px">{workspace_name}</p>
      </div>"""
      return subject, text, html
  ```

---

## Task 3: Wire email notifications into portal service

**Files:**
- Modify: `backend/app/modules/portal/service.py`

- [ ] **Step 4: Update the import block at the top of `service.py`**

  Replace:
  ```python
  from app.core.email import quote_portal_email, send_email
  ```

  With:
  ```python
  from app.core.email import (
      client_confirmation_email,
      quote_portal_email,
      seller_accept_email,
      seller_reject_email,
      send_email,
  )
  ```

  Also update the identity models import to include `User`:

  Replace:
  ```python
  from app.modules.identity.models import Organization, Person, Workspace
  ```

  With:
  ```python
  from app.modules.identity.models import Organization, Person, User, Workspace
  ```

- [ ] **Step 5: Add seller + client emails at the end of `portal_accept`, after `await db.commit()`**

  Find this block in `portal_accept` (after `await db.commit()`):

  ```python
      await db.commit()

      # Best-effort auto-reserve inventory
  ```

  Replace with:

  ```python
      await db.commit()

      # Email notifications — non-blocking, log on failure
      workspace_name = await _get_workspace_name(db, session.workspace_id)
      creator = await db.get(User, session.created_by_id)
      seller_email = creator.email if creator else None

      if seller_email:
          subj, text, html = seller_accept_email(
              client_name=data.client_name or session.client_name or "Cliente",
              workspace_name=workspace_name,
              quote_number=quote.quote_number,
              order_number=order_number,
              total=quote.total,
              currency=quote.currency,
          )
          try:
              await send_email(seller_email, subj, html, text)
          except Exception as exc:
              logger.warning("Seller accept email failed: %s", exc)

      client_email_addr = (
          str(data.client_email) if data.client_email else session.client_email
      )
      if client_email_addr:
          subj, text, html = client_confirmation_email(
              workspace_name=workspace_name,
              quote_number=quote.quote_number,
              order_number=order_number,
          )
          try:
              await send_email(client_email_addr, subj, html, text)
          except Exception as exc:
              logger.warning("Client confirmation email failed: %s", exc)

      # Best-effort auto-reserve inventory
  ```

- [ ] **Step 6: Add seller rejection email at the end of `portal_reject`, after `await db.commit()`**

  Find this block in `portal_reject`:

  ```python
      await db.commit()
      return PortalActionResult(
          success=True,
          action="rejected",
          message="Cotización rechazada. Hemos notificado al equipo.",
      )
  ```

  Replace with:

  ```python
      await db.commit()

      # Seller notification — non-blocking
      workspace_name = await _get_workspace_name(db, session.workspace_id)
      creator = await db.get(User, session.created_by_id)
      seller_email = creator.email if creator else None

      if seller_email:
          subj, text, html = seller_reject_email(
              client_name=data.client_name or session.client_name or "Cliente",
              workspace_name=workspace_name,
              quote_number=quote.quote_number,
              reason=data.reason,
          )
          try:
              await send_email(seller_email, subj, html, text)
          except Exception as exc:
              logger.warning("Seller reject email failed: %s", exc)

      return PortalActionResult(
          success=True,
          action="rejected",
          message="Cotización rechazada. Hemos notificado al equipo.",
      )
  ```

- [ ] **Step 7: Run all 3 new tests to verify they pass**

  ```
  docker compose exec backend pytest tests/test_portal_contract.py::test_accept_sends_seller_notification tests/test_portal_contract.py::test_reject_sends_seller_notification tests/test_portal_contract.py::test_accept_sends_only_seller_email_when_no_client_email -v
  ```

  Expected: **3 PASSED**

- [ ] **Step 8: Run the full portal test suite to verify no regressions**

  ```
  docker compose exec backend pytest tests/test_portal_contract.py -v
  ```

  Expected: **all PASSED** (should be 17+ tests)

- [ ] **Step 9: Commit backend changes**

  ```bash
  git add backend/app/core/email.py backend/app/modules/portal/service.py backend/tests/test_portal_contract.py
  git commit -m "feat(portal): add seller/client email notifications on accept and reject"
  ```

---

## Task 4: QuoteDetail — share button + dialog

**Files:**
- Modify: `composable-os/src/pages/QuoteDetail.tsx`

- [ ] **Step 10: Update imports in `QuoteDetail.tsx`**

  Add `useState` to the React import (add a new first line):
  ```tsx
  import { useState } from "react";
  ```

  Add portal service import after the sales service import:
  ```tsx
  import { portalService, type PortalSession } from "@/services/portal";
  ```

  Add dialog and label imports after the Card import:
  ```tsx
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
  import { Label } from "@/components/ui/label";
  ```

  Add `Share2, Copy, Mail` to the lucide-react import line:
  ```tsx
  import { ArrowLeft, Plus, Trash2, Download, Loader2, Share2, Copy, Mail } from "lucide-react";
  ```

- [ ] **Step 11: Add state, session query, and share mutations inside the `QuoteDetail()` function**

  Add after `const isDraft = quote?.status === "draft";` (around line 156):

  ```tsx
  // ── Share portal state ─────────────────────────────────────────────────────

  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareName, setShareName] = useState("");
  const [shareDays, setShareDays] = useState<7 | 14 | 30>(14);

  const { data: sessions = [] } = useQuery({
    queryKey: ["portal-sessions", id],
    queryFn: () => portalService.getSessions(id!),
    enabled: !!id,
  });

  const activeSession: PortalSession | undefined = sessions.find(
    (s) => !s.action && new Date(s.expires_at) > new Date()
  );

  const copyLinkMutation = useMutation({
    mutationFn: () =>
      portalService.createSession({
        quote_id: id!,
        client_name: shareName || undefined,
        client_email: shareEmail || undefined,
        expire_hours: shareDays * 24,
      }),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["portal-sessions", id] });
      navigator.clipboard.writeText(s.portal_url).catch(() => {});
      toast.success("Link copiado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendPortalEmailMutation = useMutation({
    mutationFn: async () => {
      const s = await portalService.createSession({
        quote_id: id!,
        client_name: shareName || undefined,
        client_email: shareEmail || undefined,
        expire_hours: shareDays * 24,
      });
      qc.invalidateQueries({ queryKey: ["portal-sessions", id] });
      return portalService.sendEmail(s.id);
    },
    onSuccess: () => {
      toast.success(`Email enviado a ${shareEmail}`);
      setShareOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canShare = quote ? ["draft", "sent"].includes(quote.status) : false;
  ```

- [ ] **Step 12: Add the share button to the header button row**

  Find the closing of the button row div (after the PDF button, around line 239):
  ```tsx
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(salesService.getQuotePdfUrl(id!), "_blank")}
          >
            <Download className="h-3 w-3 mr-1" /> PDF
          </Button>
        </div>
  ```

  Replace with:
  ```tsx
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(salesService.getQuotePdfUrl(id!), "_blank")}
          >
            <Download className="h-3 w-3 mr-1" /> PDF
          </Button>
          <Button
            size="sm"
            variant={canShare ? "default" : "outline"}
            disabled={!canShare}
            title={!canShare ? "Cotización ya procesada" : undefined}
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-3 w-3 mr-1" /> Compartir
          </Button>
        </div>
  ```

- [ ] **Step 13: Add the active session banner + share dialog to the JSX**

  Find the opening of the main content (after `{/* Header */}` and its closing div, before `{/* Lines table */}`):
  ```tsx
      {/* Lines table */}
  ```

  Insert just before that comment:
  ```tsx
      {/* Active portal session banner */}
      {activeSession && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-emerald-300/40 bg-emerald-500/10 text-sm">
          <span className="text-emerald-400 text-xs">
            ✓ Link activo{activeSession.client_email ? ` — enviado a ${activeSession.client_email}` : ""} · expira {new Date(activeSession.expires_at).toLocaleDateString("es-MX")}
          </span>
          <button
            className="text-blue-400 text-xs hover:underline"
            onClick={() => setShareOpen(true)}
          >
            Reenviar / nuevo link
          </button>
        </div>
      )}

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={(o) => { setShareOpen(o); if (!o) { setShareEmail(""); setShareName(""); setShareDays(14); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Compartir cotización</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {quote.quote_number} · {quote.title} · {new Intl.NumberFormat("es-MX", { style: "currency", currency: quote.currency }).format(quote.total)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del cliente</Label>
              <Input
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
                placeholder="Juan Pérez"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Email del cliente <span className="text-red-400">*</span>
              </Label>
              <Input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="juan@empresa.com"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Válida por</Label>
              <div className="flex gap-2">
                {([7, 14, 30] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setShareDays(d)}
                    className={`flex-1 py-1.5 rounded-md text-xs border transition-colors ${
                      shareDays === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                disabled={copyLinkMutation.isPending}
                onClick={() => copyLinkMutation.mutate()}
              >
                {copyLinkMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <><Copy className="h-3 w-3 mr-1" /> Copiar link</>
                }
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs"
                disabled={!shareEmail || sendPortalEmailMutation.isPending}
                onClick={() => sendPortalEmailMutation.mutate()}
              >
                {sendPortalEmailMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <><Mail className="h-3 w-3 mr-1" /> Enviar email</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lines table */}
  ```

- [ ] **Step 14: Verify TypeScript compiles**

  ```
  cd composable-os && npx tsc --noEmit
  ```

  Expected: no errors

- [ ] **Step 15: Commit QuoteDetail changes**

  ```bash
  git add composable-os/src/pages/QuoteDetail.tsx
  git commit -m "feat(sales): add portal share button and dialog to QuoteDetail"
  ```

---

## Task 5: CustomerPortal — Level C redesign

**Files:**
- Modify: `composable-os/src/pages/CustomerPortal.tsx`

- [ ] **Step 16: Replace the entire content of `CustomerPortal.tsx`**

  Write the following as the new file content (complete replacement):

  ```tsx
  import { useState, useEffect } from "react";
  import { useParams } from "react-router-dom";
  import { useQuery, useMutation } from "@tanstack/react-query";
  import { Loader2 } from "lucide-react";

  // ── Public fetch (no auth header) ─────────────────────────────────────────
  const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:8100/api/v1";

  async function publicFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw Object.assign(new Error(body.detail || `Error ${res.status}`), { status: res.status });
    }
    return res.json();
  }

  // ── Types ──────────────────────────────────────────────────────────────────
  interface PortalQuoteLine {
    description: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    amount: number;
  }

  interface PortalQuoteView {
    quote_number: string;
    title: string;
    status: string;
    valid_until: string | null;
    currency: string;
    subtotal: number;
    discount_amount: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    notes: string | null;
    terms: string | null;
    lines: PortalQuoteLine[];
    workspace_name: string;
    org_name: string | null;
    contact_name: string | null;
    can_accept: boolean;
    session_expires_at: string;
    already_acted: boolean;
  }

  interface PortalActionResult {
    success: boolean;
    action: string;
    message: string;
    order_number: string | null;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function fmt(n: number, currency: string) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency", currency, maximumFractionDigits: 2,
    }).format(n);
  }

  function daysUntil(iso: string): number {
    const ms = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  function initials(name: string): string {
    return name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "?";
  }

  // ── Sub-screens ────────────────────────────────────────────────────────────

  function LoadingScreen() {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1e1e2e" }}>
        <div className="flex items-center gap-3 text-[#6c7086]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Cargando propuesta…</span>
        </div>
      </div>
    );
  }

  function ErrorScreen({ isExpired, workspaceName }: { isExpired: boolean; workspaceName?: string }) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#1e1e2e" }}>
        <div className="bg-[#1e1e2e] border border-[#45475a] rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
          <div className="w-12 h-12 bg-[#f38ba8]/10 border border-[#f38ba8]/30 rounded-full flex items-center justify-center text-2xl mx-auto">
            {isExpired ? "⏰" : "❌"}
          </div>
          <p className="text-[#cdd6f4] font-semibold">
            {isExpired ? "Este link expiró" : "Link inválido"}
          </p>
          <p className="text-[#6c7086] text-sm">
            {isExpired
              ? `Contacta a ${workspaceName ?? "la empresa"} para solicitar uno nuevo.`
              : "Verifica que hayas copiado la URL completa."}
          </p>
        </div>
      </div>
    );
  }

  function AcceptConfirmationScreen({
    workspaceName,
    orderNumber,
  }: {
    workspaceName: string;
    orderNumber: string | null;
  }) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#1e1e2e" }}>
        <div className="max-w-sm w-full space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 bg-[#a6e3a1]/10 border-2 border-[#a6e3a1] rounded-full flex items-center justify-center text-2xl">
              ✓
            </div>
            <p className="text-[#cdd6f4] text-lg font-bold">¡Propuesta aceptada!</p>
            <p className="text-[#6c7086] text-sm">Hemos recibido tu confirmación.</p>
          </div>

          {orderNumber && (
            <div className="bg-[#313244] rounded-xl p-5 text-center">
              <p className="text-[#6c7086] text-[10px] uppercase tracking-wide mb-2">Tu número de orden</p>
              <p className="text-[#89b4fa] text-3xl font-bold font-mono">{orderNumber}</p>
              <p className="text-[#6c7086] text-[11px] mt-2">Guarda este número para consultas</p>
            </div>
          )}

          <div className="bg-[#313244] rounded-xl p-4 space-y-2">
            <p className="text-[#6c7086] text-[11px] font-semibold">Próximos pasos</p>
            <p className="text-[#cdd6f4] text-xs leading-relaxed">
              📧 Recibirás un email de confirmación<br />
              📞 {workspaceName} se pondrá en contacto<br />
              {orderNumber && <>🗂️ Referencia: <span className="text-[#89b4fa]">{orderNumber}</span></>}
            </p>
          </div>

          <p className="text-[#6c7086] text-[10px] text-center">
            Este link ya no está disponible para más acciones
          </p>
        </div>
      </div>
    );
  }

  function RejectConfirmationScreen({ workspaceName }: { workspaceName: string }) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#1e1e2e" }}>
        <div className="max-w-sm w-full space-y-4 text-center">
          <div className="w-14 h-14 bg-[#f38ba8]/10 border-2 border-[#f38ba8] rounded-full flex items-center justify-center text-2xl mx-auto">
            ✗
          </div>
          <p className="text-[#cdd6f4] text-lg font-bold">Propuesta rechazada</p>
          <p className="text-[#6c7086] text-sm">
            Si cambias de opinión, contacta a {workspaceName}.
          </p>
          <p className="text-[#6c7086] text-[10px]">
            Este link ya no está disponible para más acciones
          </p>
        </div>
      </div>
    );
  }

  // ── Main page ──────────────────────────────────────────────────────────────
  export default function CustomerPortal() {
    const { token } = useParams<{ token: string }>();

    type Phase = "view" | "accept-form" | "reject-form" | "done-accept" | "done-reject";
    const [phase, setPhase] = useState<Phase>("view");
    const [formName, setFormName] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formReason, setFormReason] = useState("");
    const [orderNumber, setOrderNumber] = useState<string | null>(null);

    const { data: quote, isLoading, error } = useQuery<PortalQuoteView>({
      queryKey: ["portal-quote", token],
      queryFn: () => publicFetch(`/portal/quote/${token}`),
      enabled: !!token,
      retry: false,
    });

    const accept = useMutation<PortalActionResult, Error, void>({
      mutationFn: () =>
        publicFetch(`/portal/quote/${token}/accept`, {
          method: "POST",
          body: JSON.stringify({
            client_name: formName || undefined,
            client_notes: formNotes || undefined,
          }),
        }),
      onSuccess: (res) => {
        setOrderNumber(res.order_number);
        setPhase("done-accept");
      },
    });

    const reject = useMutation<PortalActionResult, Error, void>({
      mutationFn: () =>
        publicFetch(`/portal/quote/${token}/reject`, {
          method: "POST",
          body: JSON.stringify({ reason: formReason || undefined }),
        }),
      onSuccess: () => setPhase("done-reject"),
    });

    // Handle already-acted sessions loaded from backend
    useEffect(() => {
      if (!quote?.already_acted) return;
      if (quote.status === "accepted") setPhase("done-accept");
      else if (quote.status === "rejected") setPhase("done-reject");
    }, [quote?.already_acted, quote?.status]);

    if (isLoading) return <LoadingScreen />;

    if (error || !quote) {
      const msg = ((error as Error & { status?: number })?.message ?? "").toLowerCase();
      const isExpired = msg.includes("expir") || (error as Error & { status?: number })?.status === 410;
      return <ErrorScreen isExpired={isExpired} />;
    }

    if (phase === "done-accept") {
      return (
        <AcceptConfirmationScreen
          workspaceName={quote.workspace_name}
          orderNumber={orderNumber}
        />
      );
    }

    if (phase === "done-reject") {
      return <RejectConfirmationScreen workspaceName={quote.workspace_name} />;
    }

    const days = daysUntil(quote.session_expires_at);

    return (
      <div className="min-h-screen py-8 px-4" style={{ background: "linear-gradient(135deg, #1e1e2e 0%, #181825 100%)" }}>
        <div className="max-w-md mx-auto">

          {/* Branded header */}
          <div
            className="rounded-t-2xl p-5 text-center"
            style={{ background: "linear-gradient(135deg, #1e66f5 0%, #7c3aed 100%)" }}
          >
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">
              {initials(quote.workspace_name)}
            </div>
            <p className="text-white font-semibold text-sm">{quote.workspace_name}</p>
            <p className="text-white/70 text-xs mt-0.5">Te envió una propuesta</p>
          </div>

          {/* Quote body */}
          <div className="bg-[#1e1e2e] rounded-b-2xl px-4 pb-6 space-y-3">

            {/* Title + countdown */}
            <div className="flex items-start justify-between pt-4">
              <div>
                <p className="text-[#cdd6f4] font-semibold text-sm">{quote.title}</p>
                <p className="text-[#6c7086] text-[11px] mt-0.5">{quote.quote_number}</p>
              </div>
              <div
                className={`rounded-lg p-2 text-center border ${
                  days < 3
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-[#f38ba8]/10 border-[#f38ba8]/30"
                }`}
              >
                <p className={`text-[10px] font-semibold ${days < 3 ? "text-red-400" : "text-[#f38ba8]"}`}>
                  ⏰ Expira
                </p>
                <p className={`text-sm font-bold ${days < 3 ? "text-red-400" : "text-[#f38ba8]"}`}>
                  {days}d
                </p>
              </div>
            </div>

            {/* Line items + breakdown */}
            <div className="bg-[#313244] rounded-xl p-3">
              <p className="text-[#6c7086] text-[10px] uppercase tracking-wide mb-2">Detalle</p>
              {quote.lines.map((line, i) => (
                <div key={i} className="flex justify-between text-xs text-[#cdd6f4] mb-1.5">
                  <span className="truncate pr-2">{line.description}</span>
                  <span className="shrink-0">{fmt(line.amount, quote.currency)}</span>
                </div>
              ))}
              <div className="h-px bg-[#45475a] my-2" />
              <div className="flex justify-between text-[11px] text-[#6c7086] mb-1">
                <span>Subtotal</span>
                <span>{fmt(quote.subtotal, quote.currency)}</span>
              </div>
              {quote.tax_rate > 0 && (
                <div className="flex justify-between text-[11px] text-[#6c7086] mb-2">
                  <span>IVA ({(quote.tax_rate * 100).toFixed(0)}%)</span>
                  <span>{fmt(quote.tax_amount, quote.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#a6e3a1]">
                <span>Total</span>
                <span>{fmt(quote.total, quote.currency)}</span>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="bg-[#313244] rounded-xl p-3 text-[11px] text-[#6c7086] italic">
                "{quote.notes}"
              </div>
            )}

            {/* CTA: pending view */}
            {phase === "view" && quote.can_accept && (
              <div className="space-y-2 pt-1">
                <button
                  className="w-full bg-[#a6e3a1] text-[#1e1e2e] rounded-xl py-3 text-sm font-bold active:opacity-80"
                  onClick={() => setPhase("accept-form")}
                >
                  ✓ Aceptar y firmar propuesta
                </button>
                <button
                  className="w-full bg-[#313244] text-[#cdd6f4] rounded-xl py-2.5 text-xs"
                  onClick={() => setPhase("reject-form")}
                >
                  ✗ Rechazar propuesta
                </button>
                <p className="text-center text-[10px] text-[#6c7086]">
                  ¿Preguntas? Contacta a {quote.workspace_name}
                </p>
              </div>
            )}

            {/* Inline accept form */}
            {phase === "accept-form" && (
              <div className="bg-[#313244] rounded-xl p-4 space-y-3">
                <p className="text-[#cdd6f4] text-sm font-semibold">Confirmar aceptación</p>
                <div>
                  <label className="block text-[10px] text-[#6c7086] uppercase tracking-wide mb-1">
                    Tu nombre
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full bg-[#1e1e2e] border border-[#45475a] rounded-lg px-3 py-2 text-xs text-[#cdd6f4] outline-none focus:border-[#89b4fa]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#6c7086] uppercase tracking-wide mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Instrucciones adicionales..."
                    rows={2}
                    className="w-full bg-[#1e1e2e] border border-[#45475a] rounded-lg px-3 py-2 text-xs text-[#cdd6f4] outline-none focus:border-[#89b4fa] resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-[#45475a] text-[#cdd6f4] rounded-lg py-2 text-xs"
                    onClick={() => setPhase("view")}
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={accept.isPending}
                    onClick={() => accept.mutate()}
                    className="flex-1 bg-[#a6e3a1] text-[#1e1e2e] rounded-lg py-2 text-xs font-bold disabled:opacity-50"
                  >
                    {accept.isPending ? "…" : "Confirmar aceptación"}
                  </button>
                </div>
                {accept.isError && (
                  <p className="text-[#f38ba8] text-xs">{(accept.error as Error).message}</p>
                )}
              </div>
            )}

            {/* Inline reject form */}
            {phase === "reject-form" && (
              <div className="bg-[#313244] rounded-xl p-4 space-y-3">
                <p className="text-[#cdd6f4] text-sm font-semibold">Confirmar rechazo</p>
                <div>
                  <label className="block text-[10px] text-[#6c7086] uppercase tracking-wide mb-1">
                    Motivo (opcional)
                  </label>
                  <textarea
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="Razón del rechazo..."
                    rows={3}
                    className="w-full bg-[#1e1e2e] border border-[#45475a] rounded-lg px-3 py-2 text-xs text-[#cdd6f4] outline-none focus:border-[#89b4fa] resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-[#45475a] text-[#cdd6f4] rounded-lg py-2 text-xs"
                    onClick={() => setPhase("view")}
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={reject.isPending}
                    onClick={() => reject.mutate()}
                    className="flex-1 bg-[#f38ba8]/20 text-[#f38ba8] border border-[#f38ba8]/30 rounded-lg py-2 text-xs font-medium disabled:opacity-50"
                  >
                    {reject.isPending ? "…" : "Confirmar rechazo"}
                  </button>
                </div>
                {reject.isError && (
                  <p className="text-[#f38ba8] text-xs">{(reject.error as Error).message}</p>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 17: Verify TypeScript compiles**

  ```
  cd composable-os && npx tsc --noEmit
  ```

  Expected: no errors

- [ ] **Step 18: Start the frontend dev server and manually verify the portal**

  ```
  cd composable-os && npm run dev
  ```

  Manual checks:
  - Open `http://localhost:5173`
  - Navigate to a draft quote → verify "Compartir" button appears in header
  - Click "Compartir" → verify dialog opens with name/email/days fields
  - Fill email → click "Copiar link" → verify toast "Link copiado"
  - Open the copied URL in a new tab → verify branded portal loads with dark theme
  - Verify expiration countdown badge appears
  - Verify line items and totals render correctly
  - Click "Aceptar y firmar propuesta" → verify inline form appears (not a modal)
  - Submit accept → verify confirmation screen with order number SO-XXXX
  - Reload the same portal URL → verify it shows confirmation screen (already_acted)
  - Open a different quote → create portal link → open it → reject → verify reject confirmation screen
  - Open expired or invalid token URL → verify friendly error screen

- [ ] **Step 19: Verify share button states**

  - Navigate to an **accepted** quote → verify "Compartir" button is disabled and shows tooltip "Cotización ya procesada"
  - Navigate to a **draft** quote that had a session created → verify the green "Link activo" banner appears above the lines table

- [ ] **Step 20: Commit frontend changes**

  ```bash
  git add composable-os/src/pages/CustomerPortal.tsx
  git commit -m "feat(portal): Level C redesign — branded layout, inline forms, post-action screen"
  ```

---

## Task 6: Final validation

- [ ] **Step 21: Run complete backend test suite**

  ```
  docker compose exec backend pytest -v
  ```

  Expected: all tests pass, no regressions.

- [ ] **Step 22: Run TypeScript type check one final time**

  ```
  cd composable-os && npx tsc --noEmit
  ```

  Expected: zero errors.

- [ ] **Step 23: Push to GitHub**

  ```bash
  git push
  ```

---

## Self-Review

**Spec coverage check:**
- ✓ "Compartir con cliente" button — Task 4
- ✓ Share dialog (name, email, days, copy/send) — Task 4
- ✓ Active session banner with "Reenviar / nuevo link" — Task 4
- ✓ CustomerPortal branded header, countdown, line items, subtotal/tax/total — Task 5
- ✓ "Aceptar y firmar" CTA → inline form — Task 5
- ✓ Post-accept screen with order number — Task 5
- ✓ Reject flow → confirmation screen — Task 5
- ✓ Seller email on accept — Task 3
- ✓ Client confirmation email on accept — Task 3
- ✓ Seller email on reject — Task 3
- ✓ Expired link → friendly 410 screen — Task 5 (ErrorScreen handles it)
- ✓ Already-used link shows confirmation (idempotent) — Task 5 (useEffect sets phase from already_acted)
- ✓ Backend tests — Task 1 + 2 + 3
- ✓ TypeScript type checks — Steps 14, 17, 22
- ✓ `test_expired_token_returns_410` already exists in the test file — not added again (no duplication)
