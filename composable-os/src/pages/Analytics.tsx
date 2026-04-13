import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { analyticsService } from "@/services/analytics";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

/** "2026-04" → "Apr '26" */
function fmtMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const abbr = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1];
  return `${abbr} '${String(y).slice(2)}`;
}

const STAGE_COLORS: Record<string, string> = {
  new:         "hsl(262,80%,62%)",
  qualified:   "hsl(220,80%,58%)",
  proposal:    "hsl(152,60%,48%)",
  negotiation: "hsl(38,92%,50%)",
};

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <Skeleton style={{ height }} className="w-full rounded-lg" />;
}

// ── Revenue Tab ───────────────────────────────────────────────────────────────

function RevenueTab() {
  const summaryQ = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: analyticsService.getSummary,
    staleTime: 60_000,
  });
  const revenueQ = useQuery({
    queryKey: ["analytics-revenue", 12],
    queryFn: () => analyticsService.getRevenue(12),
    staleTime: 60_000,
  });

  const loading = summaryQ.isLoading || revenueQ.isLoading;
  const err = summaryQ.error || revenueQ.error;

  const summary = summaryQ.data;
  const series = revenueQ.data?.series ?? [];

  const chartData = series.map((s) => ({
    month: fmtMonth(s.month),
    invoiced: s.invoiced,
    paid: s.paid,
    outstanding: s.outstanding,
  }));

  const kpis = [
    {
      label: "Total facturado",
      value: fmt(summary?.revenue.total_invoiced ?? 0),
      icon: DollarSign,
      sub: "acumulado",
    },
    {
      label: "Total cobrado",
      value: fmt(summary?.revenue.total_paid ?? 0),
      icon: CheckCircle2,
      sub: "pagos recibidos",
    },
    {
      label: "Por cobrar",
      value: fmt(summary?.revenue.total_outstanding ?? 0),
      icon: Clock,
      sub: "pendiente",
    },
    {
      label: "Vencidas",
      value: fmt(summary?.revenue.overdue_amount ?? 0),
      icon: AlertCircle,
      sub: `${summary?.revenue.overdue_count ?? 0} facturas`,
    },
  ];

  if (err) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        Error cargando datos de ingresos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border border-border/60">
                <CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent>
              </Card>
            ))
          : kpis.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="border border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <Card className="border border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Ingresos — últimos 12 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartSkeleton height={280} />
          ) : chartData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              Sin facturas registradas aún.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="aInvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262, 80%, 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(262, 80%, 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aPaidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(152, 60%, 48%)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(152, 60%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => fmt(v)}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [fmt(v), name]}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
                />
                <Area
                  type="monotone"
                  dataKey="invoiced"
                  name="Facturado"
                  stroke="hsl(262, 80%, 55%)"
                  fill="url(#aInvGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="paid"
                  name="Cobrado"
                  stroke="hsl(152, 60%, 48%)"
                  fill="url(#aPaidGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(262, 80%, 55%)" }} />
          Facturado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(152, 60%, 48%)" }} />
          Cobrado
        </span>
      </div>
    </div>
  );
}

// ── Pipeline Tab ──────────────────────────────────────────────────────────────

function PipelineTab() {
  const pipelineQ = useQuery({
    queryKey: ["analytics-pipeline"],
    queryFn: analyticsService.getPipeline,
    staleTime: 60_000,
  });
  const summaryQ = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: analyticsService.getSummary,
    staleTime: 60_000,
  });

  const loading = pipelineQ.isLoading || summaryQ.isLoading;
  const err = pipelineQ.error || summaryQ.error;

  const pipeline = pipelineQ.data;
  const summary = summaryQ.data;

  const stageData = (pipeline?.stages ?? []).map((s) => ({
    stage: s.stage.charAt(0).toUpperCase() + s.stage.slice(1),
    count: s.count,
    value: s.value,
    fill: STAGE_COLORS[s.stage] ?? "hsl(240,5%,55%)",
  }));

  const kpis = [
    { label: "Oportunidades abiertas", value: pipeline?.total_open ?? 0, format: "int" },
    { label: "Valor del pipeline", value: pipeline?.total_value ?? 0, format: "currency" },
    { label: "Tasa de cierre (30d)", value: pipeline?.won_rate_30d ?? 0, format: "pct" },
    { label: "Valor promedio / deal", value: pipeline?.avg_deal_size ?? 0, format: "currency" },
  ];

  const monthlyWon = summary ? [
    { label: "Ganadas este mes", value: summary.pipeline.won_this_month, format: "int" },
    { label: "Valor ganado este mes", value: summary.pipeline.won_value_this_month, format: "currency" },
    { label: "Leads activos", value: summary.leads.total_active, format: "int" },
    { label: "Leads nuevos (mes)", value: summary.leads.new_this_month, format: "int" },
  ] : [];

  function renderValue(val: number, format: string) {
    if (format === "currency") return fmt(val);
    if (format === "pct") return fmtPct(val);
    return String(val);
  }

  if (err) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        Error cargando datos del pipeline.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border border-border/60">
                <CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent>
              </Card>
            ))
          : kpis.map((k) => (
              <Card key={k.label} className="border border-border/60">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                  <p className="text-xl font-bold">{renderValue(k.value as number, k.format)}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Stage breakdown chart */}
      <Card className="border border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Oportunidades por etapa</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ChartSkeleton height={260} />
          ) : stageData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              Sin oportunidades abiertas actualmente.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  dataKey="stage"
                  type="category"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  width={90}
                />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === "value" ? [fmt(v), "Valor"] : [v, "Cantidad"]
                  }
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="count" name="count" radius={[0, 6, 6, 0]} barSize={20}>
                  {stageData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly won + leads grid */}
      {!loading && summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {monthlyWon.map((k) => (
            <Card key={k.label} className="border border-border/60">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                <p className="text-xl font-bold">{renderValue(k.value as number, k.format)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Coming Soon placeholder ───────────────────────────────────────────────────

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        {name} — sin datos disponibles aún
      </p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Esta pestaña se habilitará cuando el módulo correspondiente genere datos reales.
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const Analytics = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Dashboards de negocio con datos reales — facturación, pipeline CRM y operaciones.
        </p>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Ingresos
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Target className="h-3.5 w-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="marketing" className="gap-1.5 opacity-50 cursor-not-allowed" disabled>
            <TrendingUp className="h-3.5 w-3.5" /> Marketing
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-1.5 opacity-50 cursor-not-allowed" disabled>
            <BarChart3 className="h-3.5 w-3.5" /> Conocimiento
          </TabsTrigger>
        </TabsList>
        <TabsContent value="revenue" className="mt-4">
          <RevenueTab />
        </TabsContent>
        <TabsContent value="pipeline" className="mt-4">
          <PipelineTab />
        </TabsContent>
        <TabsContent value="marketing" className="mt-4">
          <ComingSoon name="Marketing" />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-4">
          <ComingSoon name="Knowledge Graph" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
