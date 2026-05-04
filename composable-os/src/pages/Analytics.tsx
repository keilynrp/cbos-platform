import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Target,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  FolderKanban,
  ScrollText,
  UserMinus,
  UserPlus,
  Building2,
  ListTodo,
  AlertTriangle,
  FileCheck,
  FileClock,
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
  PieChart,
  Pie,
  Legend,
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

const STATUS_COLORS: Record<string, string> = {
  // pipeline
  new:         "hsl(262,80%,62%)",
  qualified:   "hsl(220,80%,58%)",
  proposal:    "hsl(152,60%,48%)",
  negotiation: "hsl(38,92%,50%)",
  // projects
  planning:    "hsl(220,80%,58%)",
  active:      "hsl(152,60%,48%)",
  on_hold:     "hsl(38,92%,50%)",
  completed:   "hsl(262,80%,55%)",
  cancelled:   "hsl(0,60%,55%)",
  // contracts
  draft:       "hsl(240,5%,60%)",
  sent:        "hsl(200,80%,55%)",
  signed:      "hsl(152,60%,48%)",
  executed:    "hsl(262,80%,55%)",
  expired:     "hsl(38,92%,50%)",
  terminated:  "hsl(0,60%,55%)",
  // employment
  full_time:   "hsl(262,80%,62%)",
  part_time:   "hsl(200,80%,55%)",
  contractor:  "hsl(38,92%,50%)",
  intern:      "hsl(152,60%,48%)",
};

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <Skeleton style={{ height }} className="w-full rounded-lg" />;
}

function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border border-border/60">
          <CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent>
        </Card>
      ))}
    </>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function TabError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      {message}
    </div>
  );
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
    { label: "Total facturado",  value: fmt(summary?.revenue.total_invoiced ?? 0),  icon: DollarSign,   sub: "acumulado" },
    { label: "Total cobrado",    value: fmt(summary?.revenue.total_paid ?? 0),       icon: CheckCircle2, sub: "pagos recibidos" },
    { label: "Por cobrar",       value: fmt(summary?.revenue.total_outstanding ?? 0),icon: Clock,        sub: "pendiente" },
    { label: "Vencidas",         value: fmt(summary?.revenue.overdue_amount ?? 0),   icon: AlertCircle,  sub: `${summary?.revenue.overdue_count ?? 0} facturas` },
  ];

  if (err) return <TabError message="Error cargando datos de ingresos." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? <KpiSkeleton count={4} /> : kpis.map((s) => {
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
          <CardTitle className="text-sm font-semibold">Ingresos — últimos 12 meses</CardTitle>
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
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmt(v)} />
                <Tooltip
                  formatter={(v: number, name: string) => [fmt(v), name]}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
                />
                <Area type="monotone" dataKey="invoiced" name="Facturado" stroke="hsl(262, 80%, 55%)" fill="url(#aInvGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="paid" name="Cobrado" stroke="hsl(152, 60%, 48%)" fill="url(#aPaidGrad)" strokeWidth={2} />
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
    fill: STATUS_COLORS[s.stage] ?? "hsl(240,5%,55%)",
  }));

  const kpis = [
    { label: "Oportunidades abiertas", value: pipeline?.total_open ?? 0,    format: "int" },
    { label: "Valor del pipeline",      value: pipeline?.total_value ?? 0,   format: "currency" },
    { label: "Tasa de cierre (30d)",    value: pipeline?.won_rate_30d ?? 0,  format: "pct" },
    { label: "Valor promedio / deal",   value: pipeline?.avg_deal_size ?? 0, format: "currency" },
  ];

  const monthlyWon = summary ? [
    { label: "Ganadas este mes",    value: summary.pipeline.won_this_month,       format: "int" },
    { label: "Valor ganado este mes",value: summary.pipeline.won_value_this_month, format: "currency" },
    { label: "Leads activos",       value: summary.leads.total_active,            format: "int" },
    { label: "Leads nuevos (mes)",  value: summary.leads.new_this_month,          format: "int" },
  ] : [];

  function renderValue(val: number, format: string) {
    if (format === "currency") return fmt(val);
    if (format === "pct") return fmtPct(val);
    return String(val);
  }

  if (err) return <TabError message="Error cargando datos del pipeline." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? <KpiSkeleton count={4} /> : kpis.map((k) => (
          <Card key={k.label} className="border border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
              <p className="text-xl font-bold">{renderValue(k.value as number, k.format)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={90} />
                <Tooltip
                  formatter={(v: number, name: string) => name === "value" ? [fmt(v), "Valor"] : [v, "Cantidad"]}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="count" name="count" radius={[0, 6, 6, 0]} barSize={20}>
                  {stageData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

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

// ── HR Tab ────────────────────────────────────────────────────────────────────

const EMP_TYPE_LABELS: Record<string, string> = {
  full_time:  "Tiempo completo",
  part_time:  "Tiempo parcial",
  contractor: "Contratista",
  intern:     "Pasante",
};

function HRTab() {
  const hrQ = useQuery({
    queryKey: ["analytics-hr"],
    queryFn: analyticsService.getHR,
    staleTime: 60_000,
  });

  const loading = hrQ.isLoading;
  const hr = hrQ.data;

  if (hrQ.error) return <TabError message="Error cargando datos de equipo." />;

  const kpis = [
    { label: "Empleados activos",    value: hr?.active_count ?? 0,        icon: Users,     color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "En permiso",           value: hr?.on_leave_count ?? 0,      icon: Clock,     color: "text-amber-500",   bg: "bg-amber-500/10" },
    { label: "Nuevas contrataciones (mes)", value: hr?.new_hires_this_month ?? 0, icon: UserPlus, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Terminaciones (mes)",  value: hr?.terminations_this_month ?? 0, icon: UserMinus, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  const typeData = (hr?.by_employment_type ?? []).map((t) => ({
    name: EMP_TYPE_LABELS[t.employment_type] ?? t.employment_type,
    value: t.count,
    fill: STATUS_COLORS[t.employment_type] ?? "hsl(240,5%,55%)",
  }));

  const totalActive = hr ? hr.active_count + hr.on_leave_count : 0;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? <KpiSkeleton count={4} /> : kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                  <div className={`h-8 w-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${k.color}`} />
                  </div>
                </div>
                <p className="text-xl font-bold">{k.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Employment type pie */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tipo de empleo (activos)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton height={220} />
            ) : typeData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Sin empleados activos registrados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {typeData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [v, "Empleados"]}
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Org health summary */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Estructura organizacional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {loading ? (
              <ChartSkeleton height={220} />
            ) : (
              <>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>Departamentos</span>
                  </div>
                  <span className="font-semibold">{hr?.department_count ?? 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Headcount total (activos)</span>
                  </div>
                  <span className="font-semibold">{totalActive}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>Sin departamento asignado</span>
                  </div>
                  <Badge
                    variant={hr && hr.unassigned_employees > 0 ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {hr?.unassigned_employees ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span>Ex-empleados</span>
                  </div>
                  <span className="font-semibold text-muted-foreground">{hr?.terminated_count ?? 0}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Projects Tab ──────────────────────────────────────────────────────────────

const STATUS_LABELS_PRJ: Record<string, string> = {
  planning:  "Planificación",
  active:    "Activo",
  on_hold:   "En pausa",
  completed: "Completado",
  cancelled: "Cancelado",
};

function ProjectsTab() {
  const prjQ = useQuery({
    queryKey: ["analytics-projects"],
    queryFn: analyticsService.getProjects,
    staleTime: 60_000,
  });

  const loading = prjQ.isLoading;
  const prj = prjQ.data;

  if (prjQ.error) return <TabError message="Error cargando datos de proyectos." />;

  const kpis = [
    { label: "Proyectos activos",    value: prj?.active_count ?? 0,              format: "int",      icon: FolderKanban, color: "text-primary",       bg: "bg-primary/10" },
    { label: "Budget activo total",  value: fmt(prj?.total_budget_active ?? 0),  format: "preformatted", icon: DollarSign,   color: "text-emerald-500",   bg: "bg-emerald-500/10" },
    { label: "Completados (mes)",    value: prj?.completed_this_month ?? 0,      format: "int",      icon: CheckCircle2, color: "text-emerald-500",   bg: "bg-emerald-500/10" },
    { label: "Cancelados (mes)",     value: prj?.cancelled_this_month ?? 0,      format: "int",      icon: AlertCircle,  color: "text-red-500",       bg: "bg-red-500/10" },
  ];

  const statusData = (prj?.by_status ?? []).map((s) => ({
    status: STATUS_LABELS_PRJ[s.status] ?? s.status,
    count: s.count,
    fill: STATUS_COLORS[s.status] ?? "hsl(240,5%,55%)",
  }));

  const completionRate = prj?.task_completion_rate ?? 0;
  const completionPct = Math.round(completionRate * 100);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? <KpiSkeleton count={4} /> : kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                  <div className={`h-8 w-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${k.color}`} />
                  </div>
                </div>
                <p className="text-xl font-bold">
                  {k.format === "preformatted" ? k.value : String(k.value)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status bar chart */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Proyectos por estado</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton height={220} />
            ) : statusData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Sin proyectos registrados aún.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip
                    formatter={(v: number) => [v, "Proyectos"]}
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={32}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Task health */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Salud de tareas (proyectos activos)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {loading ? (
              <ChartSkeleton height={220} />
            ) : (
              <>
                {/* Completion progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tasa de completitud</span>
                    <span className="font-semibold">{completionPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    <span>Tareas totales (activos)</span>
                  </div>
                  <span className="font-semibold">{prj?.total_tasks ?? 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Completadas</span>
                  </div>
                  <span className="font-semibold text-emerald-600">{prj?.done_tasks ?? 0}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>Vencidas</span>
                  </div>
                  <Badge
                    variant={prj && prj.overdue_tasks > 0 ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {prj?.overdue_tasks ?? 0}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Contracts Tab ─────────────────────────────────────────────────────────────

const STATUS_LABELS_CTR: Record<string, string> = {
  draft:      "Borrador",
  sent:       "Enviado",
  signed:     "Firmado",
  executed:   "Ejecutado",
  expired:    "Vencido",
  terminated: "Terminado",
};

function ContractsTab() {
  const ctrQ = useQuery({
    queryKey: ["analytics-contracts"],
    queryFn: analyticsService.getContracts,
    staleTime: 60_000,
  });

  const loading = ctrQ.isLoading;
  const ctr = ctrQ.data;

  if (ctrQ.error) return <TabError message="Error cargando datos de contratos." />;

  const kpis = [
    { label: "Total contratos",    value: ctr?.total_contracts ?? 0,              format: "int",          icon: ScrollText,  color: "text-primary",     bg: "bg-primary/10" },
    { label: "Valor firmado",      value: fmt(ctr?.total_value_signed ?? 0),      format: "preformatted", icon: FileCheck,   color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Firmados (mes)",     value: ctr?.signed_this_month ?? 0,            format: "int",          icon: TrendingUp,  color: "text-blue-500",    bg: "bg-blue-500/10" },
    { label: "Por vencer (30d)",   value: ctr?.expiring_soon ?? 0,               format: "int",          icon: FileClock,   color: "text-amber-500",   bg: "bg-amber-500/10" },
  ];

  const statusData = (ctr?.by_status ?? []).map((s) => ({
    status: STATUS_LABELS_CTR[s.status] ?? s.status,
    count: s.count,
    fill: STATUS_COLORS[s.status] ?? "hsl(240,5%,55%)",
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? <KpiSkeleton count={4} /> : kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                  <div className={`h-8 w-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${k.color}`} />
                  </div>
                </div>
                <p className="text-xl font-bold">
                  {k.format === "preformatted" ? k.value : String(k.value)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status breakdown */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Contratos por estado</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton height={220} />
            ) : statusData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Sin contratos registrados aún.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip
                    formatter={(v: number) => [v, "Contratos"]}
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={32}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Value summary */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Valor comprometido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            {loading ? (
              <ChartSkeleton height={220} />
            ) : (
              <>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <FileCheck className="h-4 w-4 text-emerald-500" />
                    <span>Valor firmado + ejecutado</span>
                  </div>
                  <span className="font-semibold">{fmt(ctr?.total_value_signed ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Valor ejecutado</span>
                  </div>
                  <span className="font-semibold">{fmt(ctr?.total_value_executed ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span>Ejecutados este mes</span>
                  </div>
                  <span className="font-semibold">{ctr?.executed_this_month ?? 0}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileClock className="h-4 w-4 text-amber-500" />
                    <span>Por vencer en 30 días</span>
                  </div>
                  <Badge
                    variant={ctr && ctr.expiring_soon > 0 ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {ctr?.expiring_soon ?? 0}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
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
          Dashboards de negocio con datos reales — facturación, pipeline, proyectos, contratos y equipo.
        </p>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="revenue" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Ingresos
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Target className="h-3.5 w-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" /> Proyectos
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1.5">
            <ScrollText className="h-3.5 w-3.5" /> Contratos
          </TabsTrigger>
          <TabsTrigger value="hr" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Equipo
          </TabsTrigger>
        </TabsList>
        <TabsContent value="revenue" className="mt-4">
          <RevenueTab />
        </TabsContent>
        <TabsContent value="pipeline" className="mt-4">
          <PipelineTab />
        </TabsContent>
        <TabsContent value="projects" className="mt-4">
          <ProjectsTab />
        </TabsContent>
        <TabsContent value="contracts" className="mt-4">
          <ContractsTab />
        </TabsContent>
        <TabsContent value="hr" className="mt-4">
          <HRTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
