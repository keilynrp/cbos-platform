import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService, type Quote, type SalesOrder } from "@/services/sales";
import { QuoteStatusBadge } from "@/components/sales/QuoteStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { translateApiError } from "@/lib/errors";
import {
  Plus, DollarSign, TrendingUp, FileText, ShoppingCart, Loader2, Download,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD" }).format(n);
}

// ── Status badge helpers ───────────────────────────────────────────────────

type OrderStatus = SalesOrder["status"];

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { variant: "secondary" | "default" | "destructive" | "outline"; label: string; className?: string }> = {
    draft:          { variant: "secondary", label: "Draft" },
    confirmed:      { variant: "default",   label: "Confirmed" },
    in_fulfillment: { variant: "outline",   label: "In Fulfillment", className: "bg-yellow-50 text-yellow-700 border-yellow-300" },
    fulfilled:      { variant: "secondary", label: "Fulfilled", className: "bg-green-100 text-green-700 border-green-200" },
    cancelled:      { variant: "destructive", label: "Cancelled" },
  };
  const cfg = map[status] ?? { variant: "secondary" as const, label: status };
  return (
    <Badge variant={cfg.variant} className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

// ── Filter chip component ──────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "outline"}
      className="h-7 px-3 text-xs"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

// ── Reject Quote Dialog ────────────────────────────────────────────────────

function RejectQuoteDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  function handleConfirm() {
    onConfirm(reason || "No reason provided");
    setReason("");
  }

  function handleCancel() {
    setReason("");
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Rechazar Cotización</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Razón (opcional)</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Razón de rechazo..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={handleConfirm}>Rechazar</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── New Quote Dialog ───────────────────────────────────────────────────────

function NewQuoteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");

  const create = useMutation({
    mutationFn: () =>
      salesService.createQuote({
        title,
        currency: "USD",
        tax_rate: 0,
        discount_amount: 0,
        lines: [{ description: "Item", quantity: 1, unit_price: 0, discount_percent: 0, line_order: 1 }],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-quotes"] });
      toast.success("Cotización creada");
      onClose();
      setTitle("");
    },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nueva Cotización</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Propuesta de servicios Q1"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending} className="gap-2">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Cotizaciones tab ───────────────────────────────────────────────────────

const QUOTE_FILTERS: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
];

function CotizacionesTab() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const { data: quotes = [], isLoading, error } = useQuery({
    queryKey: ["sales-quotes", filter],
    queryFn: () => salesService.getQuotes(filter ? { status: filter } : undefined),
    retry: 1,
  });

  useEffect(() => {
    if (error) toast.error("Error cargando cotizaciones: " + (error as Error)?.message);
  }, [error]);

  const sendQuote = useMutation({
    mutationFn: (id: string) => salesService.sendQuote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-quotes"] });
      toast.success("Cotización enviada");
    },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const acceptQuote = useMutation({
    mutationFn: (id: string) => salesService.acceptQuote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-quotes"] });
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      toast.success("Cotización aceptada — orden creada");
    },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const rejectQuote = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      salesService.rejectQuote(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-quotes"] });
      toast.success("Cotización rechazada");
    },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  function handleReject(id: string) {
    setRejectTarget(id);
  }

  function handleDownloadPdf(id: string) {
    window.open(salesService.getQuotePdfUrl(id), "_blank");
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {QUOTE_FILTERS.map((f) => (
            <FilterChip
              key={f.label}
              label={f.label}
              active={filter === f.value}
              onClick={() => setFilter(f.value)}
            />
          ))}
        </div>
        <Button className="gap-2 h-8" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva Cotización
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Sin cotizaciones</p>
      ) : (
        <div className="border border-border/60 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => (
                <TableRow
                  key={quote.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/sales/quotes/${quote.id}`)}
                >
                  <TableCell className="font-mono text-xs">{quote.quote_number}</TableCell>
                  <TableCell className="font-medium">{quote.title}</TableCell>
                  <TableCell><QuoteStatusBadge status={quote.status} /></TableCell>
                  <TableCell className="text-right">{fmtCurrency(quote.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1.5 justify-end flex-wrap">
                      {quote.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={sendQuote.isPending}
                          onClick={(e) => { e.stopPropagation(); sendQuote.mutate(quote.id); }}
                        >
                          {sendQuote.isPending && sendQuote.variables === quote.id
                            ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            : null}
                          Send
                        </Button>
                      )}
                      {quote.status === "sent" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                            disabled={acceptQuote.isPending}
                            onClick={(e) => { e.stopPropagation(); acceptQuote.mutate(quote.id); }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                            disabled={rejectQuote.isPending}
                            onClick={(e) => { e.stopPropagation(); handleReject(quote.id); }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => { e.stopPropagation(); handleDownloadPdf(quote.id); }}
                      >
                        <Download className="h-3 w-3" /> PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <NewQuoteDialog open={newOpen} onClose={() => setNewOpen(false)} />
      <RejectQuoteDialog
        open={rejectTarget !== null}
        onConfirm={(reason) => {
          if (rejectTarget) rejectQuote.mutate({ id: rejectTarget, reason });
          setRejectTarget(null);
        }}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}

// ── Órdenes tab ────────────────────────────────────────────────────────────

const ORDER_FILTERS: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "Draft", value: "draft" },
  { label: "Confirmed", value: "confirmed" },
  { label: "In Fulfillment", value: "in_fulfillment" },
  { label: "Fulfilled", value: "fulfilled" },
  { label: "Cancelled", value: "cancelled" },
];

function OrdenesTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string | null>(null);

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ["sales-orders", filter],
    queryFn: () => salesService.getOrders(filter ? { status: filter } : undefined),
    retry: 1,
  });

  useEffect(() => {
    if (error) toast.error("Error cargando órdenes: " + (error as Error)?.message);
  }, [error]);

  const confirmOrder = useMutation({
    mutationFn: (id: string) => salesService.confirmOrder(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales-orders"] }); toast.success("Orden confirmada"); },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const startFulfillment = useMutation({
    mutationFn: (id: string) => salesService.startFulfillment(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales-orders"] }); toast.success("Fulfillment iniciado"); },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const fulfillOrder = useMutation({
    mutationFn: (id: string) => salesService.fulfillOrder(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales-orders"] }); toast.success("Orden completada"); },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const cancelOrder = useMutation({
    mutationFn: (id: string) => salesService.cancelOrder(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales-orders"] }); toast.success("Orden cancelada"); },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {ORDER_FILTERS.map((f) => (
          <FilterChip
            key={f.label}
            label={f.label}
            active={filter === f.value}
            onClick={() => setFilter(f.value)}
          />
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Sin órdenes</p>
      ) : (
        <div className="border border-border/60 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Quote ID</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.order_number}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {order.quote_id ? order.quote_id.slice(0, 8) + "…" : "—"}
                  </TableCell>
                  <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-right">{fmtCurrency(order.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1.5 justify-end flex-wrap">
                      {order.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={confirmOrder.isPending}
                          onClick={() => confirmOrder.mutate(order.id)}
                        >
                          Confirm
                        </Button>
                      )}
                      {order.status === "confirmed" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={startFulfillment.isPending}
                            onClick={() => startFulfillment.mutate(order.id)}
                          >
                            Start Fulfillment
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                            disabled={cancelOrder.isPending}
                            onClick={() => cancelOrder.mutate(order.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {order.status === "in_fulfillment" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                            disabled={fulfillOrder.isPending}
                            onClick={() => fulfillOrder.mutate(order.id)}
                          >
                            Fulfill
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                            disabled={cancelOrder.isPending}
                            onClick={() => cancelOrder.mutate(order.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const Sales = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Fetch all quotes for KPI calculations (no filter)
  const { data: allQuotes = [], isLoading: loadingQuotes, error: quotesError } = useQuery({
    queryKey: ["sales-quotes", null],
    queryFn: () => salesService.getQuotes(),
    retry: 1,
  });

  // Fetch all orders for KPI calculations (no filter)
  const { data: allOrders = [], isLoading: loadingOrders, error: ordersError } = useQuery({
    queryKey: ["sales-orders", null],
    queryFn: () => salesService.getOrders(),
    retry: 1,
  });

  useEffect(() => {
    if (quotesError) toast.error("Error cargando cotizaciones: " + (quotesError as Error)?.message);
  }, [quotesError]);

  useEffect(() => {
    if (ordersError) toast.error("Error cargando órdenes: " + (ordersError as Error)?.message);
  }, [ordersError]);

  // KPI calculations
  const openQuotes = allQuotes.filter((q) => q.status === "draft" || q.status === "sent");
  const pipelineValue = openQuotes.reduce((sum, q) => sum + q.total, 0);

  const accepted = allQuotes.filter((q) => q.status === "accepted").length;
  const rejected = allQuotes.filter((q) => q.status === "rejected").length;
  const conversionDenominator = accepted + rejected;
  const conversionRate =
    conversionDenominator > 0 ? Math.round((accepted / conversionDenominator) * 100) + "%" : "N/A";

  const activeOrders = allOrders.filter(
    (o) => o.status !== "fulfilled" && o.status !== "cancelled"
  ).length;

  const kpiStats = [
    { label: "Open Quotes", value: String(openQuotes.length), icon: FileText },
    { label: "Pipeline Value", value: pipelineValue > 0 ? fmtCurrency(pipelineValue) : "$0", icon: DollarSign },
    { label: "Conversion Rate", value: conversionRate, icon: TrendingUp },
    { label: "Active Orders", value: String(activeOrders), icon: ShoppingCart },
  ];

  const loadingKpis = loadingQuotes || loadingOrders;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona cotizaciones y órdenes — conectado al backend en tiempo real.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="cotizaciones" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Cotizaciones
          </TabsTrigger>
          <TabsTrigger value="ordenes" className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" /> Órdenes
          </TabsTrigger>
        </TabsList>

        {/* Dashboard tab */}
        <TabsContent value="dashboard" className="mt-4">
          {loadingKpis ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="border border-border/60">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="text-lg font-bold">{stat.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Quick stats cards below KPIs */}
          {!loadingKpis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="border border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Cotizaciones por estado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(["draft", "sent", "accepted", "rejected", "expired"] as const).map((s) => {
                    const count = allQuotes.filter((q) => q.status === s).length;
                    return (
                      <div key={s} className="flex items-center justify-between text-sm">
                        <QuoteStatusBadge status={s} />
                        <span className="font-medium">{count}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Órdenes por estado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(["draft", "confirmed", "in_fulfillment", "fulfilled", "cancelled"] as const).map((s) => {
                    const count = allOrders.filter((o) => o.status === s).length;
                    return (
                      <div key={s} className="flex items-center justify-between text-sm">
                        <OrderStatusBadge status={s} />
                        <span className="font-medium">{count}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Cotizaciones tab */}
        <TabsContent value="cotizaciones" className="mt-4">
          <CotizacionesTab />
        </TabsContent>

        {/* Órdenes tab */}
        <TabsContent value="ordenes" className="mt-4">
          <OrdenesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sales;
