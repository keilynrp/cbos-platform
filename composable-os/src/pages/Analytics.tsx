import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Brain,
  Target,
  Users,
  FolderKanban,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Zap,
  Eye,
  MousePointer,
  Mail,
  Share2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";

// --- Mock Data ---

const revenueData = [
  { month: "Sep", revenue: 42000, recurring: 38000 },
  { month: "Oct", revenue: 48000, recurring: 41000 },
  { month: "Nov", revenue: 52000, recurring: 44000 },
  { month: "Dec", revenue: 61000, recurring: 48000 },
  { month: "Jan", revenue: 58000, recurring: 51000 },
  { month: "Feb", revenue: 67000, recurring: 55000 },
  { month: "Mar", revenue: 74000, recurring: 62000 },
];

const mrrBreakdown = [
  { name: "Enterprise", value: 38000, color: "hsl(262, 80%, 55%)" },
  { name: "Team", value: 16000, color: "hsl(220, 80%, 55%)" },
  { name: "Starter", value: 8000, color: "hsl(152, 60%, 48%)" },
];

const projectPerformance = [
  { sprint: "S10", velocity: 28, planned: 32 },
  { sprint: "S11", velocity: 35, planned: 34 },
  { sprint: "S12", velocity: 34, planned: 36 },
  { sprint: "S13", velocity: 41, planned: 38 },
  { sprint: "S14", velocity: 38, planned: 40 },
];

const projectStats = [
  { name: "Composable OS Core", progress: 72, tasks: 48, completed: 35, status: "on-track" },
  { name: "CRM Module", progress: 58, tasks: 32, completed: 19, status: "on-track" },
  { name: "Knowledge Graph", progress: 85, tasks: 24, completed: 20, status: "ahead" },
  { name: "AI Agents Framework", progress: 34, tasks: 40, completed: 14, status: "at-risk" },
  { name: "Marketplace", progress: 15, tasks: 18, completed: 3, status: "on-track" },
];

const funnelData = [
  { name: "Visitors", value: 12400, fill: "hsl(262, 80%, 55%)" },
  { name: "Signups", value: 3200, fill: "hsl(262, 70%, 60%)" },
  { name: "Activated", value: 1800, fill: "hsl(220, 80%, 55%)" },
  { name: "Paying", value: 640, fill: "hsl(220, 70%, 60%)" },
  { name: "Enterprise", value: 86, fill: "hsl(152, 60%, 48%)" },
];

const channelData = [
  { channel: "Organic Search", visitors: 4800, conversions: 380, rate: "7.9%" },
  { channel: "Direct", visitors: 3100, conversions: 290, rate: "9.4%" },
  { channel: "Social Media", visitors: 2200, conversions: 140, rate: "6.4%" },
  { channel: "Email", visitors: 1400, conversions: 210, rate: "15.0%" },
  { channel: "Referral", visitors: 900, conversions: 120, rate: "13.3%" },
];

const campaignMetrics = [
  { name: "Product Launch Email", sent: 8400, opened: 3200, clicked: 840, icon: Mail },
  { name: "LinkedIn Ads — Enterprise", sent: 45000, opened: 2100, clicked: 380, icon: Share2 },
  { name: "Blog — Knowledge Graph Guide", sent: 0, opened: 6200, clicked: 1400, icon: Eye },
];

const knowledgeMetrics = [
  { label: "Entities", value: "1,284", change: "+124", trend: "up" },
  { label: "Relationships", value: "3,412", change: "+287", trend: "up" },
  { label: "Avg Connections", value: "4.8", change: "+0.3", trend: "up" },
  { label: "Orphan Nodes", value: "23", change: "-8", trend: "down" },
];

const entityGrowth = [
  { week: "W1", authors: 42, articles: 68, datasets: 12, institutions: 8 },
  { week: "W2", authors: 48, articles: 82, datasets: 15, institutions: 9 },
  { week: "W3", authors: 55, articles: 96, datasets: 18, institutions: 11 },
  { week: "W4", authors: 61, articles: 114, datasets: 22, institutions: 12 },
];

const aiInsights = [
  { id: 1, icon: DollarSign, color: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/10", title: "Revenue growth accelerating", description: "MRR growth rate increased from 8% to 12% month-over-month. Enterprise tier driving 62% of new revenue.", confidence: 94 },
  { id: 2, icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10", title: "AI Agents project at risk", description: "Sprint velocity declining for 2 consecutive sprints. Team capacity utilization at 92% — consider redistributing workload.", confidence: 87 },
  { id: 3, icon: Lightbulb, color: "text-[hsl(var(--cbs-amber))]", bg: "bg-[hsl(var(--cbs-amber))]/10", title: "Email channel outperforming", description: "Email campaigns show 15% conversion rate vs 7.9% for organic. Recommend increasing email nurture frequency by 2x.", confidence: 91 },
  { id: 4, icon: Share2, color: "text-primary", bg: "bg-primary/10", title: "Knowledge graph density improving", description: "Average connections per entity rose from 4.5 to 4.8. Orphan nodes decreased 26% — data quality initiatives working.", confidence: 88 },
  { id: 5, icon: Zap, color: "text-accent", bg: "bg-accent/10", title: "Q2 revenue projection: $248K", description: "Based on current pipeline ($346K) and historical win rate (34%), projected Q2 closed revenue is $248K ± $18K.", confidence: 82 },
];

// --- Helpers ---

const kpiColor = (good: boolean) => good ? "text-[hsl(var(--cbs-green))]" : "text-destructive";

const statusColor: Record<string, string> = {
  "on-track": "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))] border-[hsl(var(--cbs-green))]/20",
  "ahead": "bg-accent/15 text-accent border-accent/20",
  "at-risk": "bg-destructive/15 text-destructive border-destructive/20",
};

// --- Tab Content ---

function RevenueTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "MRR", value: "$62,000", change: "+12.7%", icon: DollarSign },
          { label: "ARR", value: "$744,000", change: "+18.2%", icon: TrendingUp },
          { label: "Avg Revenue / User", value: "$148", change: "+6.3%", icon: Users },
          { label: "Churn Rate", value: "2.1%", change: "-0.4%", icon: Activity },
        ].map(s => {
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
                <p className={`text-xs font-medium flex items-center gap-0.5 mt-1 ${kpiColor(true)}`}>
                  <ArrowUpRight className="h-3 w-3" /> {s.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="aRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262, 80%, 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(262, 80%, 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aRecGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(220, 80%, 55%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(220, 80%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${v / 1000}k`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(262, 80%, 55%)" fill="url(#aRevGrad)" strokeWidth={2} name="Total Revenue" />
                <Area type="monotone" dataKey="recurring" stroke="hsl(220, 80%, 55%)" fill="url(#aRecGrad)" strokeWidth={2} name="Recurring" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">MRR by Plan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <RechartsPie>
                <Pie data={mrrBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {mrrBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }} />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              {mrrBreakdown.map(p => (
                <div key={p.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProjectsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sprint Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={projectPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="sprint" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="planned" fill="hsl(var(--border))" radius={[4, 4, 0, 0]} name="Planned" />
                <Bar dataKey="velocity" fill="hsl(262, 80%, 55%)" radius={[4, 4, 0, 0]} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Active Sprints", value: "1" },
              { label: "Avg Velocity", value: "35.2 pts" },
              { label: "Tasks This Week", value: "24" },
              { label: "Completion Rate", value: "87%" },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className="text-sm font-semibold">{s.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Project Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {projectStats.map(p => (
            <div key={p.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{p.name}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor[p.status]}`}>{p.status}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{p.completed}/{p.tasks} tasks · {p.progress}%</span>
              </div>
              <Progress value={p.progress} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MarketingTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Visitors", value: "12,400", change: "+18%", icon: Eye },
          { label: "Signups", value: "3,200", change: "+24%", icon: Users },
          { label: "Conversion", value: "5.2%", change: "+0.8%", icon: Target },
          { label: "CAC", value: "$42", change: "-$6", icon: MousePointer },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                </div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs font-medium text-[hsl(var(--cbs-green))] flex items-center gap-0.5 mt-1">
                  <ArrowUpRight className="h-3 w-3" /> {s.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelData.map((stage, i) => {
                const pct = i === 0 ? 100 : Math.round((stage.value / funnelData[0].value) * 100);
                return (
                  <div key={stage.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-muted-foreground">{stage.value.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: stage.fill }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Channel Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {channelData.map(ch => (
                <div key={ch.channel} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-28 shrink-0 truncate">{ch.channel}</span>
                  <div className="flex-1">
                    <Progress value={(ch.visitors / 5000) * 100} className="h-2" />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">{ch.visitors.toLocaleString()}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-[hsl(var(--cbs-green))]/10 text-[hsl(var(--cbs-green))] border-[hsl(var(--cbs-green))]/20 w-12 justify-center">{ch.rate}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Active Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {campaignMetrics.map(c => {
            const Icon = c.icon;
            return (
              <div key={c.name} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                </div>
                <div className="grid grid-cols-3 gap-6 text-center shrink-0">
                  {[
                    { label: c.sent > 0 ? "Sent" : "Views", val: (c.sent || c.opened).toLocaleString() },
                    { label: "Engaged", val: c.opened.toLocaleString() },
                    { label: "Clicked", val: c.clicked.toLocaleString() },
                  ].map(m => (
                    <div key={m.label}>
                      <p className="text-xs font-semibold">{m.val}</p>
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function KnowledgeTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {knowledgeMetrics.map(m => (
          <Card key={m.label} className="border border-border/60">
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
              <p className={`text-xs font-medium mt-1 ${kpiColor(m.label === "Orphan Nodes" ? m.trend === "down" : m.trend === "up")}`}>
                {m.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Entity Growth (Last 4 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={entityGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="articles" stroke="hsl(220, 80%, 55%)" strokeWidth={2} dot={{ r: 3 }} name="Articles" />
              <Line type="monotone" dataKey="authors" stroke="hsl(262, 80%, 55%)" strokeWidth={2} dot={{ r: 3 }} name="Authors" />
              <Line type="monotone" dataKey="datasets" stroke="hsl(152, 60%, 48%)" strokeWidth={2} dot={{ r: 3 }} name="Datasets" />
              <Line type="monotone" dataKey="institutions" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 3 }} name="Institutions" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-5 mt-3">
            {[
              { label: "Articles", color: "hsl(220, 80%, 55%)" },
              { label: "Authors", color: "hsl(262, 80%, 55%)" },
              { label: "Datasets", color: "hsl(152, 60%, 48%)" },
              { label: "Institutions", color: "hsl(38, 92%, 50%)" },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AIInsightsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">AI-generated insights based on cross-module analysis.</p>
      </div>
      {aiInsights.map(insight => {
        const Icon = insight.icon;
        return (
          <Card key={insight.id} className="border border-border/60 hover:border-primary/20 transition-colors cursor-pointer">
            <CardContent className="p-4 flex gap-4">
              <div className={`h-10 w-10 rounded-lg ${insight.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${insight.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold">{insight.title}</p>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                    {insight.confidence}% confidence
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 self-center">Explore</Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// --- Main ---

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("revenue");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Cross-module dashboards powered by unified data and AI insights.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="revenue" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Revenue</TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Projects</TabsTrigger>
          <TabsTrigger value="marketing" className="gap-1.5"><Target className="h-3.5 w-3.5" /> Marketing</TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-1.5"><Share2 className="h-3.5 w-3.5" /> Knowledge</TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5"><Brain className="h-3.5 w-3.5" /> AI Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="revenue" className="mt-4"><RevenueTab /></TabsContent>
        <TabsContent value="projects" className="mt-4"><ProjectsTab /></TabsContent>
        <TabsContent value="marketing" className="mt-4"><MarketingTab /></TabsContent>
        <TabsContent value="knowledge" className="mt-4"><KnowledgeTab /></TabsContent>
        <TabsContent value="ai" className="mt-4"><AIInsightsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
