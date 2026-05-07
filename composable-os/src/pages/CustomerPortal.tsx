import { useState } from "react";
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
type Phase = "view" | "accept-form" | "reject-form" | "done-accept" | "done-reject";
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

        <div className="bg-[#313244] rounded-xl p-5 text-center">
          <p className="text-[#6c7086] text-[10px] uppercase tracking-wide mb-2">Tu número de orden</p>
          {orderNumber ? (
            <p className="text-[#89b4fa] text-3xl font-bold font-mono">{orderNumber}</p>
          ) : (
            <p className="text-[#6c7086] text-sm">Revisa tu email de confirmación</p>
          )}
          <p className="text-[#6c7086] text-[11px] mt-2">Guarda este número para consultas</p>
        </div>

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
    mutationFn: () => {
      if (!token) return Promise.reject(new Error("Token missing"));
      return publicFetch(`/portal/quote/${token}/accept`, {
        method: "POST",
        body: JSON.stringify({
          client_name: formName || undefined,
          client_notes: formNotes || undefined,
        }),
      });
    },
    onSuccess: (res) => {
      setOrderNumber(res.order_number);
      setPhase("done-accept");
    },
  });

  const reject = useMutation<PortalActionResult, Error, void>({
    mutationFn: () => {
      if (!token) return Promise.reject(new Error("Token missing"));
      return publicFetch(`/portal/quote/${token}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: formReason || undefined }),
      });
    },
    onSuccess: () => setPhase("done-reject"),
  });

  if (isLoading) return <LoadingScreen />;

  if (error || !quote) {
    const msg = ((error as Error & { status?: number })?.message ?? "").toLowerCase();
    const isExpired = msg.includes("expir") || (error as Error & { status?: number })?.status === 410;
    return <ErrorScreen isExpired={isExpired} />;
  }

  // Synchronous redirect for already-acted sessions — avoids flash of quote view
  if (quote.already_acted) {
    if (quote.status === "accepted")
      return <AcceptConfirmationScreen workspaceName={quote.workspace_name} orderNumber={null} />;
    if (quote.status === "rejected")
      return <RejectConfirmationScreen workspaceName={quote.workspace_name} />;
    return <ErrorScreen isExpired={false} workspaceName={quote.workspace_name} />;
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
            {quote.lines.length === 0 ? (
              <p className="text-[#6c7086] text-xs">Sin líneas de detalle</p>
            ) : quote.lines.map((line, i) => (
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
            {quote.discount_amount > 0 && (
              <div className="flex justify-between text-[11px] text-[#6c7086] mb-1">
                <span>Descuento</span>
                <span>-{fmt(quote.discount_amount, quote.currency)}</span>
              </div>
            )}
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

          {/* Terms */}
          {quote.terms && (
            <div className="bg-[#313244] rounded-xl p-3">
              <p className="text-[#6c7086] text-[10px] uppercase tracking-wide mb-1">Términos y condiciones</p>
              <p className="text-[#6c7086] text-[11px] leading-relaxed">{quote.terms}</p>
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
