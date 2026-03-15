import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  DollarSign, Handshake, Zap, PackageSearch,
  TrendingUp, TrendingDown, ArrowRight, Bot, Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area, AreaChart, Bar, BarChart, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { salesService } from "@/services/sales";
import { crmService } from "@/services/crm";
import { inventoryService } from "@/services/inventory";
import { workflowsService } from "@/services/workflows";
import { useAuth } from "@/lib/auth";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function last8Months() {
  const now = new Date();
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 7 + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()] };
  });
}

const PIPELINE_COLORS: Record<string, string> = {
  lead:        "hsl(262,80%,62%)",
  qualified:   "hsl(262,80%,52%)",
  proposal:    "hsl(220,80%,58%)",
  negotiation: "hsl(220,80%,48%)",
  won:         "hsl(152,60%,48%)",
  lost:        "hsl(0,72%,51%)",
};

const AI_INSIGHTS = [
  { agent: "Sales Assistant", text: "Review your open quotes — some may be near expiry.", icon: Sparkles },
  { agent: "Inventory Agent", text: "Check low-stock items before placing new orders.", icon: TrendingUp },
  { agent: "Workflow Engine", text: "Automate repetitive follow-ups with a triggered workflow.", icon: Bot },
];

// ── component ─────────────────────────────────────────────────────────────────

const Index = () => {
  const { user } = useAuth();

  const results = useQueries({
    queries: [
      { queryKey: ["sales-orders"],       queryFn: salesService.getOrders,       staleTime: 30_000 },
      { queryKey: ["crm-opportunities"],  queryFn: crmService.getOpportunities,  staleTime: 30_000 },
      { queryKey: ["inventory-items"],    queryFn: inventoryService.getItems,    staleTime: 30_000 },
      { queryKey: ["workflows"],          queryFn: workflowsService.getAll,      staleTime: 30_000 },
      { queryKey: ["crm-activities"],     queryFn: crmService.getActivities,     staleTime: 30_000 },
    ],
  });

  const [ordersQ, oppsQ, inventoryQ, workflowsQ, activitiesQ] = results;
  const loading = results.some((r) => r.isLoading);

  const orders     = ordersQ.data     ?? [];
  const opps       = oppsQ.data       ?? [];
  const items      = inventoryQ.data  ?? [];
  const workflows  = workflowsQ.data  ?? [];
  const activities = activitiesQ.data ?? [];

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const revenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + o.total, 0);

    const openDeals = opps.filter(
      (o) => o.stage !== "won" && o.stage !== "lost"
    ).length;

    const lowStock = items.filter(
      (i) => i.status === "low_stock" || i.status === "out_of_stock"
    ).length;

    const activeWorkflows = workflows.filter((w) => w.is_active).length;

    return { revenue, openDeals, lowStock, activeWorkflows };
  }, [orders, opps, items, workflows]);

  // ── Revenue chart (last 8 months) ─────────────────────────────────────────
  const revenueData = useMemo(() => {
    const months = last8Months();
    const totals: Record<string, number> = {};
    months.forEach((m) => { totals[m.key] = 0; });
    orders
      .filter((o) => o.status !== "cancelled")
      .forEach((o) => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key in totals) totals[key] += o.total;
      });
    return months.map((m) => ({ month: m.label, revenue: totals[m.key] }));
  }, [orders]);

  // ── Pipeline chart ─────────────────────────────────────────────────────────
  const pipelineData = useMemo(() => {
    const counts: Record<string, number> = {};
    opps.forEach((o) => { counts[o.stage] = (counts[o.stage] ?? 0) + 1; });
    return Object.entries(counts).map(([stage, count]) => ({
      stage: stage.charAt(0).toUpperCase() + stage.slice(1),
      count,
      fill: PIPELINE_COLORS[stage] ?? "hsl(240,5%,55%)",
    }));
  }, [opps]);

  // ── Low-stock alerts ───────────────────────────────────────────────────────
  const lowStockItems = useMemo(
    () => items.filter((i) => i.status === "low_stock" || i.status === "out_of_stock").slice(0, 5),
    [items]
  );

  // ── Recent activities ─────────────────────────────────────────────────────
  const recentActivities = useMemo(
    () => [...activities].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 5),
    [activities]
  );

  const greeting = user?.full_name ? `Hola, ${user.full_name.split(" ")[0]}` : "Dashboard";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground text-sm">Resumen del negocio en tiempo real.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-sm"><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <KpiCard label="Revenue total" value={fmtCurrency(kpis.revenue)}
              icon={DollarSign} color="bg-primary/10 text-primary"
              sub={`${orders.filter(o => o.status !== "cancelled").length} órdenes`} up />
            <KpiCard label="Deals abiertos" value={String(kpis.openDeals)}
              icon={Handshake} color="bg-blue-100 text-blue-600"
              sub={`de ${opps.length} oportunidades`} up={kpis.openDeals > 0} />
            <KpiCard label="Workflows activos" value={String(kpis.activeWorkflows)}
              icon={Zap} color="bg-violet-100 text-violet-600"
              sub={`de ${workflows.length} workflows`} up={kpis.activeWorkflows > 0} />
            <KpiCard label="Alertas de stock" value={String(kpis.lowStock)}
              icon={PackageSearch} color="bg-orange-100 text-orange-600"
              sub={`de ${items.length} SKUs`} up={kpis.lowStock === 0} />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue — últimos 8 meses</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[260px] w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(262,80%,55%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(262,80%,55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,6%,90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(240,4%,46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(240,4%,46%)"
                    tickFormatter={(v) => v === 0 ? "$0" : fmtCurrency(v)} />
                  <Tooltip formatter={(v: number) => [fmtCurrency(v), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(262,80%,55%)"
                    fill="url(#revGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pipeline CRM</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[260px] w-full" /> : pipelineData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                Sin oportunidades aún.{" "}
                <Link to="/crm" className="text-primary ml-1 hover:underline">Crear una</Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pipelineData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(240,4%,46%)" />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }}
                    stroke="hsl(240,4%,46%)" width={90} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                    {pipelineData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Low stock alerts */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Alertas de inventario</CardTitle>
            <Link to="/inventory-orders" className="text-xs text-primary flex items-center gap-1 hover:underline">
              Ver todo <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-32 w-full" /> : lowStockItems.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-sm text-emerald-600">
                <TrendingUp className="h-4 w-4" />
                Todo el inventario en niveles óptimos.
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.product_name ?? item.sku}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity_available} disponibles</p>
                    </div>
                    <Badge className={`text-[10px] ml-2 shrink-0 ${item.status === "out_of_stock"
                      ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"}`}>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {item.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent CRM activity */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Actividad reciente</CardTitle>
            <Link to="/crm" className="text-xs text-primary flex items-center gap-1 hover:underline">
              CRM <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-32 w-full" /> : recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Sin actividad registrada aún.</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((a) => {
                  const initials = (a.title ?? "??").slice(0, 2).toUpperCase();
                  const ago = timeAgo(a.created_at);
                  return (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm leading-tight font-medium truncate">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {a.type} · {ago}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights (static — se conecta en fase D) */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">AI Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {AI_INSIGHTS.map((ins, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-2">
                  <ins.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold text-primary">{ins.agent}</span>
                </div>
                <p className="text-sm text-foreground leading-snug">{ins.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color, sub, up }: {
  label: string; value: string; icon: React.ElementType;
  color: string; sub: string; up: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3">
          {up
            ? <TrendingUp className="h-3 w-3 text-emerald-500" />
            : <TrendingDown className="h-3 w-3 text-destructive" />}
          <span className="text-xs text-muted-foreground">{sub}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default Index;
