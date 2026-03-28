import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, Clock, Package, Building2,
  FileText, Calendar, AlertCircle, Loader2, ShieldCheck,
} from "lucide-react";

// ── Public fetch (no auth header) ──────────────────────────────────────────
const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:8100/api/v1";

async function publicFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Error ${res.status}`);
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

interface PortalOrderView {
  order_number: string;
  status: string;
  total: number;
  currency: string;
  confirmed_at: string | null;
  fulfilled_at: string | null;
  workspace_name: string;
  org_name: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency, maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmado",
  in_fulfillment: "En preparación",
  fulfilled: "Entregado",
  cancelled: "Cancelado",
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  in_fulfillment: "bg-amber-100 text-amber-700",
  fulfilled: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

// ── Order status view (after accepting) ───────────────────────────────────
function OrderStatus({ token, orderNumber, currency, workspaceName }: {
  token: string; orderNumber: string; currency: string; workspaceName: string;
}) {
  const { data: order, isLoading } = useQuery<PortalOrderView>({
    queryKey: ["portal-order", token],
    queryFn: () => publicFetch(`/portal/order/${token}`),
    refetchInterval: 30_000,
  });

  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800 text-lg">¡Cotización aceptada!</p>
            <p className="text-sm text-emerald-700">Orden de compra generada: <span className="font-mono font-bold">{orderNumber}</span></p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando estado de la orden…
          </div>
        ) : order ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado</span>
              <Badge className={ORDER_STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-700"}>
                {ORDER_STATUS_LABEL[order.status] ?? order.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-semibold">{fmt(order.total, order.currency)}</span>
            </div>
            {order.confirmed_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confirmado</span>
                <span className="text-sm">{fmtDate(order.confirmed_at)}</span>
              </div>
            )}
            {order.fulfilled_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Entregado</span>
                <span className="text-sm">{fmtDate(order.fulfilled_at)}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-2">
              El equipo de <strong>{workspaceName}</strong> estará en contacto contigo. Esta página se actualiza automáticamente.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const { token } = useParams<{ token: string }>();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [acceptForm, setAcceptForm] = useState({ client_name: "", client_email: "", client_notes: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [result, setResult] = useState<PortalActionResult | null>(null);

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
          client_name: acceptForm.client_name || undefined,
          client_email: acceptForm.client_email || undefined,
          client_notes: acceptForm.client_notes || undefined,
        }),
      }),
    onSuccess: (res) => { setResult(res); setAcceptOpen(false); },
  });

  const reject = useMutation<PortalActionResult, Error, void>({
    mutationFn: () =>
      publicFetch(`/portal/quote/${token}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason || undefined }),
      }),
    onSuccess: (res) => { setResult(res); setRejectOpen(false); },
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando cotización…</span>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !quote) {
    const msg = (error as Error)?.message ?? "No encontrado";
    const isExpired = msg.toLowerCase().includes("expir");
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
            <p className="font-semibold text-lg">{isExpired ? "Enlace expirado" : "Enlace no válido"}</p>
            <p className="text-sm text-muted-foreground">
              {isExpired
                ? "Este enlace ya venció. Solicita un nuevo enlace al equipo que te envió la cotización."
                : msg}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currency = quote.currency;
  const acted = quote.already_acted || !!result;
  const accepted = result?.action === "accepted" || (acted && quote.status === "accepted");

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 bg-white border rounded-full px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
            <Building2 className="h-3.5 w-3.5" />
            {quote.workspace_name}
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-3">{quote.title}</h1>
          <p className="text-muted-foreground text-sm">
            Cotización {quote.quote_number}
            {quote.contact_name && ` · Para ${quote.contact_name}`}
            {quote.org_name && ` · ${quote.org_name}`}
          </p>
        </div>

        {/* Post-action banners */}
        {result?.action === "rejected" && (
          <Card className="border-red-200 bg-red-50/40">
            <CardContent className="p-5 flex items-center gap-3">
              <XCircle className="h-7 w-7 text-red-500 shrink-0" />
              <div>
                <p className="font-semibold text-red-800">Cotización rechazada</p>
                <p className="text-sm text-red-700">{result.message}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {accepted && result?.order_number && (
          <OrderStatus
            token={token!}
            orderNumber={result.order_number}
            currency={currency}
            workspaceName={quote.workspace_name}
          />
        )}

        {quote.already_acted && !result && (
          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="p-5 flex items-center gap-3">
              <Clock className="h-6 w-6 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">Ya realizaste una acción en esta cotización anteriormente.</p>
            </CardContent>
          </Card>
        )}

        {/* Quote details */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Detalle de cotización
              </CardTitle>
              {quote.valid_until && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Válida hasta {fmtDate(quote.valid_until)}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lines */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1">
                <span className="col-span-6">Descripción</span>
                <span className="col-span-2 text-right">Cant.</span>
                <span className="col-span-2 text-right">P/U</span>
                <span className="col-span-2 text-right">Total</span>
              </div>
              {quote.lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 text-sm py-1.5 border-b border-border/50 last:border-0">
                  <span className="col-span-6 text-foreground">{line.description}</span>
                  <span className="col-span-2 text-right text-muted-foreground">{line.quantity}</span>
                  <span className="col-span-2 text-right text-muted-foreground">{fmt(line.unit_price, currency)}</span>
                  <span className="col-span-2 text-right font-medium">{fmt(line.amount, currency)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <Separator />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{fmt(quote.subtotal, currency)}</span>
              </div>
              {quote.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Descuento</span>
                  <span>−{fmt(quote.discount_amount, currency)}</span>
                </div>
              )}
              {quote.tax_rate > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Impuesto ({(quote.tax_rate * 100).toFixed(0)}%)</span>
                  <span>{fmt(quote.tax_amount, currency)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{fmt(quote.total, currency)}</span>
              </div>
            </div>

            {/* Notes / Terms */}
            {quote.notes && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded p-3 space-y-0.5">
                <p className="font-medium text-foreground">Notas</p>
                <p>{quote.notes}</p>
              </div>
            )}
            {quote.terms && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded p-3 space-y-0.5">
                <p className="font-medium text-foreground">Términos y condiciones</p>
                <p>{quote.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {quote.can_accept && !acted && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">¿Deseas proceder con esta cotización?</p>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => setAcceptOpen(true)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Aceptar cotización
                </Button>
                <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setRejectOpen(true)}>
                  <XCircle className="h-4 w-4 mr-2" /> Rechazar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Enlace válido hasta {fmtDate(quote.session_expires_at)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Package icon if no action available */}
        {!quote.can_accept && !acted && (
          <Card className="border-dashed">
            <CardContent className="p-5 flex items-center gap-3 text-muted-foreground">
              <Package className="h-5 w-5 shrink-0" />
              <p className="text-sm">Esta cotización ya no está disponible para aceptar (estado: {quote.status}).</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Powered by <span className="font-semibold">CBOS</span>
        </p>
      </div>

      {/* Accept dialog */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar aceptación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Al aceptar, se generará una orden de compra por{" "}
              <span className="font-semibold text-foreground">{fmt(quote.total, currency)}</span>.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Tu nombre <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                id="c-name"
                placeholder="Nombre completo"
                value={acceptForm.client_name}
                onChange={e => setAcceptForm(f => ({ ...f, client_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Tu correo <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                id="c-email"
                type="email"
                placeholder="correo@empresa.com"
                value={acceptForm.client_email}
                onChange={e => setAcceptForm(f => ({ ...f, client_email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-notes">Comentarios <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea
                id="c-notes"
                placeholder="Instrucciones especiales, condiciones de entrega…"
                rows={3}
                value={acceptForm.client_notes}
                onChange={e => setAcceptForm(f => ({ ...f, client_notes: e.target.value }))}
              />
            </div>
            {accept.error && (
              <p className="text-sm text-red-600">{(accept.error as Error).message}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)} disabled={accept.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => accept.mutate()} disabled={accept.isPending}>
              {accept.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando…</> : "Confirmar aceptación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar cotización</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Puedes indicar el motivo del rechazo. El equipo de <strong>{quote.workspace_name}</strong> será notificado.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="r-reason">Motivo <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea
                id="r-reason"
                placeholder="Precio fuera de presupuesto, cambio de necesidades…"
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            {reject.error && (
              <p className="text-sm text-red-600">{(reject.error as Error).message}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={reject.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => reject.mutate()}
              disabled={reject.isPending}
            >
              {reject.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando…</> : "Confirmar rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
