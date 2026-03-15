import { DollarSign, FolderKanban, Handshake, Users, TrendingUp, TrendingDown, ArrowRight, Bot, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const revenueData = [
  { month: "Jul", revenue: 32000 }, { month: "Aug", revenue: 38000 },
  { month: "Sep", revenue: 35000 }, { month: "Oct", revenue: 42000 },
  { month: "Nov", revenue: 48000 }, { month: "Dec", revenue: 52000 },
  { month: "Jan", revenue: 58000 }, { month: "Feb", revenue: 62000 },
];

const pipelineData = [
  { stage: "Lead", count: 42, fill: "hsl(262, 80%, 55%)" },
  { stage: "Qualified", count: 28, fill: "hsl(262, 80%, 65%)" },
  { stage: "Proposal", count: 18, fill: "hsl(220, 80%, 55%)" },
  { stage: "Negotiation", count: 12, fill: "hsl(220, 80%, 65%)" },
  { stage: "Closed", count: 8, fill: "hsl(152, 60%, 48%)" },
];

const projects = [
  { name: "Platform Redesign", progress: 72, status: "On Track" },
  { name: "Mobile App v2", progress: 45, status: "At Risk" },
  { name: "API Gateway", progress: 90, status: "On Track" },
  { name: "Data Pipeline", progress: 30, status: "On Track" },
];

const activities = [
  { user: "AL", name: "Ana López", action: "closed deal with Acme Corp", time: "12m ago" },
  { user: "MK", name: "Mark Kim", action: "completed sprint review", time: "1h ago" },
  { user: "SR", name: "Sara Ruiz", action: "published knowledge article", time: "2h ago" },
  { user: "JD", name: "John Doe", action: "deployed API Gateway v2.1", time: "3h ago" },
  { user: "LP", name: "Lisa Park", action: "created marketing campaign", time: "4h ago" },
];

const aiInsights = [
  { agent: "Research Agent", text: "3 new papers match your knowledge graph topics", icon: Sparkles },
  { agent: "Marketing Agent", text: "Email campaign CTR is 23% above benchmark", icon: TrendingUp },
  { agent: "Project Assistant", text: "Mobile App v2 may miss deadline — suggest adding 1 dev", icon: Bot },
];

const stats = [
  { label: "Revenue", value: "$62K", change: "+12.5%", up: true, icon: DollarSign, color: "bg-primary/10 text-primary" },
  { label: "Active Projects", value: "12", change: "+2", up: true, icon: FolderKanban, color: "bg-[hsl(var(--cbs-blue))]/10 text-[hsl(var(--cbs-blue))]" },
  { label: "Open Deals", value: "28", change: "+5", up: true, icon: Handshake, color: "bg-[hsl(var(--cbs-green))]/10 text-[hsl(var(--cbs-green))]" },
  { label: "Team Members", value: "34", change: "-1", up: false, icon: Users, color: "bg-[hsl(var(--cbs-amber))]/10 text-[hsl(var(--cbs-amber))]" },
];

const Index = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back. Here's your business overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                {s.up ? <TrendingUp className="h-3 w-3 text-[hsl(var(--cbs-green))]" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                <span className={`text-xs font-medium ${s.up ? "text-[hsl(var(--cbs-green))]" : "text-destructive"}`}>{s.change}</span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262, 80%, 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(262, 80%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(240, 4%, 46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(240, 4%, 46%)" tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(262, 80%, 55%)" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipelineData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(240, 4%, 46%)" />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} stroke="hsl(240, 4%, 46%)" width={80} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                  {pipelineData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Projects */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Active Projects</CardTitle>
            <button className="text-xs text-primary flex items-center gap-1 hover:underline">View all <ArrowRight className="h-3 w-3" /></button>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.map((p) => (
              <div key={p.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.name}</span>
                  <Badge variant={p.status === "On Track" ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0">
                    {p.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={p.progress} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{p.progress}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Team Activity */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Team Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                  {a.user}
                </div>
                <div className="min-w-0">
                  <p className="text-sm leading-tight">
                    <span className="font-medium">{a.name}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">AI Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiInsights.map((ins, i) => (
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

export default Index;
