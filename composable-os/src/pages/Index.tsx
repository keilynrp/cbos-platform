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
import { analyticsService } from "@/services/analytics";
import { inventoryService } from "@/services/inventory";
import { crmService } from "@/services/crm";
import { useAuth } from "@/lib/auth";
import { useEnumLabel } from "@/i18n/enumLabel";
import { useFormat } from "@/i18n/useFormat";
import { useT } from "@/i18n/useT";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Meses de facturacion que pide el grafico; el titulo lo cita. */
const REVENUE_MONTHS = 8;

const STAGE_COLORS: Record<string, string> = {
  new:         "hsl(262,80%,62%)",
  qualified:   "hsl(262,80%,52%)",
  proposal:    "hsl(220,80%,58%)",
  negotiation: "hsl(220,80%,48%)",
  won:         "hsl(152,60%,48%)",
  lost:        "hsl(0,72%,51%)",
};

/** Tarjetas de sugerencia estaticas: el texto de cada una vive en el catalogo. */
const AI_INSIGHTS = [
  { key: "sales", icon: Sparkles },
  { key: "inventory", icon: TrendingUp },
  { key: "workflows", icon: Bot },
] as const;

// ── component ─────────────────────────────────────────────────────────────────

const Index = () => {
  const t = useT();
  const label = useEnumLabel();
  const { formatCompactCurrency, formatMonthShort, formatRelativeTime } = useFormat();
  const { user } = useAuth();

  const results = useQueries({
    queries: [
      { queryKey: ["analytics-summary"],    queryFn: analyticsService.getSummary,      staleTime: 60_000 },
      { queryKey: ["analytics-revenue", REVENUE_MONTHS], queryFn: () => analyticsService.getRevenue(REVENUE_MONTHS), staleTime: 60_000 },
      { queryKey: ["analytics-pipeline"],   queryFn: analyticsService.getPipeline,     staleTime: 60_000 },
      { queryKey: ["inventory-items"],      queryFn: inventoryService.getItems,         staleTime: 30_000 },
      { queryKey: ["crm-activities"],       queryFn: () => crmService.getActivities(),  staleTime: 30_000 },
    ],
  });

  const [summaryQ, revenueQ, pipelineQ, inventoryQ, activitiesQ] = results;
  const loading = results.some((r) => r.isLoading);

  const summary   = summaryQ.data;
  const items     = inventoryQ.data  ?? [];
  const activities = activitiesQ.data ?? [];

  // ── KPIs from analytics summary ───────────────────────────────────────────
  const kpis = {
    invoiced:         summary?.revenue.total_invoiced       ?? 0,
    openDeals:        summary?.pipeline.open_opportunities  ?? 0,
    pipelineValue:    summary?.pipeline.pipeline_value      ?? 0,
    activeWorkflows:  summary?.operations.active_workflow_runs ?? 0,
    ordersPending:    summary?.operations.orders_pending    ?? 0,
    lowStock:         summary?.operations.low_stock_items   ?? 0,
  };

  // ── Revenue chart from analytics revenue ──────────────────────────────────
  const revenueData = (revenueQ.data?.series ?? []).map((s) => ({
    month: formatMonthShort(s.month),
    revenue: s.invoiced,
  }));

  // ── Pipeline chart from analytics pipeline ────────────────────────────────
  const pipelineData = (pipelineQ.data?.stages ?? []).map((s) => ({
    stage: label("common:crmStage", s.stage),
    count: s.count,
    fill: STAGE_COLORS[s.stage] ?? "hsl(240,5%,55%)",
  }));

  // ── Low-stock alerts from inventory ───────────────────────────────────────
  const lowStockItems = items
    .filter((i) => i.status === "low_stock" || i.status === "out_of_stock")
    .slice(0, 5);

  // ── Recent activities ─────────────────────────────────────────────────────
  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const greeting = user?.full_name
    ? t("dashboard:greeting", { name: user.full_name.split(" ")[0] })
    : t("dashboard:title");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground text-sm">{t("dashboard:subtitle")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent>
            </Card>
          ))
        ) : (
          <>
            <KpiCard
              label={t("dashboard:kpi.invoiced")}
              value={formatCompactCurrency(kpis.invoiced)}
              icon={DollarSign}
              color="bg-primary/10 text-primary"
              sub={t("dashboard:kpi.invoicedSub")}
              up
            />
            <KpiCard
              label={t("dashboard:kpi.openDeals")}
              value={String(kpis.openDeals)}
              icon={Handshake}
              color="bg-blue-100 text-blue-600"
              sub={t("dashboard:kpi.openDealsSub", { value: formatCompactCurrency(kpis.pipelineValue) })}
              up={kpis.openDeals > 0}
            />
            <KpiCard
              label={t("dashboard:kpi.pendingOrders")}
              value={String(kpis.ordersPending)}
              icon={Zap}
              color="bg-violet-100 text-violet-600"
              sub={t("dashboard:kpi.pendingOrdersSub", { count: kpis.activeWorkflows })}
              up={kpis.ordersPending > 0}
            />
            <KpiCard
              label={t("dashboard:kpi.stockAlerts")}
              value={String(kpis.lowStock)}
              icon={PackageSearch}
              color="bg-orange-100 text-orange-600"
              sub={t("dashboard:kpi.stockAlertsSub")}
              up={kpis.lowStock === 0}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {t("dashboard:revenue.title", { months: REVENUE_MONTHS })}
            </CardTitle>
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
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="hsl(240,4%,46%)"
                    tickFormatter={(v) => formatCompactCurrency(v)}
                  />
                  <Tooltip formatter={(v: number) => [formatCompactCurrency(v), t("dashboard:revenue.series")]} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(262,80%,55%)"
                    fill="url(#revGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t("dashboard:pipeline.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[260px] w-full" /> : pipelineData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                {t("dashboard:pipeline.empty")}{" "}
                <Link to="/crm" className="text-primary ml-1 hover:underline">{t("dashboard:pipeline.create")}</Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pipelineData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(240,4%,46%)" />
                  <YAxis
                    dataKey="stage"
                    type="category"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(240,4%,46%)"
                    width={90}
                  />
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
            <CardTitle className="text-sm font-semibold">{t("dashboard:inventory.title")}</CardTitle>
            <Link to="/inventory" className="text-xs text-primary flex items-center gap-1 hover:underline">
              {t("dashboard:inventory.viewAll")} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-32 w-full" /> : lowStockItems.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-sm text-emerald-600">
                <TrendingUp className="h-4 w-4" />
                {t("dashboard:inventory.allGood")}
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.product_name ?? item.sku}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard:inventory.available", { count: item.quantity_available })}
                      </p>
                    </div>
                    <Badge
                      className={`text-[10px] ml-2 shrink-0 ${
                        item.status === "out_of_stock"
                          ? "bg-red-100 text-red-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {label("common:inventoryStatus", item.status)}
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
            <CardTitle className="text-sm font-semibold">{t("dashboard:activity.title")}</CardTitle>
            <Link to="/crm" className="text-xs text-primary flex items-center gap-1 hover:underline">
              {t("dashboard:activity.crm")} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-32 w-full" /> : recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t("dashboard:activity.empty")}</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((a) => {
                  const initials = (a.title ?? "??").slice(0, 2).toUpperCase();
                  return (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm leading-tight font-medium truncate">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {label("common:activityType", a.activity_type)} · {formatRelativeTime(a.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights (static prompt cards) */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">{t("dashboard:insights.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {AI_INSIGHTS.map((ins) => (
              <div key={ins.key} className="p-3 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-2">
                  <ins.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold text-primary">{t(`dashboard:insights.${ins.key}.agent`)}</span>
                </div>
                <p className="text-sm text-foreground leading-snug">{t(`dashboard:insights.${ins.key}.text`)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, color, sub, up,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  sub: string;
  up: boolean;
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

export default Index;
