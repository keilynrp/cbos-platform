import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity, ArrowRight, BarChart3, Bot, Brain, Cable, CheckCircle2, ChevronRight,
  CircleDot, Clock, Cloud, Code2, Cpu, Database, DollarSign, Eye, FileCode2,
  Filter, Gauge, Globe, KeyRound, Layers, LayoutGrid, Link2, ListChecks,
  Lock, MessageSquare, Network, Plug, Plus, Route, Search, Server,
  Settings, Shield, Sparkles, Terminal, TrendingUp, Users, Workflow, Zap,
  AlertTriangle, XCircle, RefreshCw, Copy, Play, History, GitBranch,
  Fingerprint, FileText, Monitor, PlugZap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

/* ─────────────────── Mock Data ─────────────────── */

const usageOverTime = [
  { day: "Mon", tokens: 142000, cost: 4.2, requests: 890 },
  { day: "Tue", tokens: 198000, cost: 5.8, requests: 1240 },
  { day: "Wed", tokens: 175000, cost: 5.1, requests: 1100 },
  { day: "Thu", tokens: 210000, cost: 6.3, requests: 1380 },
  { day: "Fri", tokens: 188000, cost: 5.5, requests: 1200 },
  { day: "Sat", tokens: 95000, cost: 2.8, requests: 620 },
  { day: "Sun", tokens: 78000, cost: 2.3, requests: 510 },
];

const costByProvider = [
  { name: "OpenAI", value: 42, color: "hsl(152, 60%, 48%)" },
  { name: "Anthropic", value: 31, color: "hsl(262, 80%, 55%)" },
  { name: "Google", value: 18, color: "hsl(220, 80%, 55%)" },
  { name: "xAI", value: 9, color: "hsl(38, 92%, 50%)" },
];

const moduleUsage = [
  { module: "CRM", tokens: 320000, pct: 28 },
  { module: "RevPath", tokens: 180000, pct: 16 },
  { module: "Events", tokens: 145000, pct: 13 },
  { module: "Portal", tokens: 130000, pct: 11 },
  { module: "Knowledge", tokens: 120000, pct: 10 },
  { module: "Analytics", tokens: 98000, pct: 9 },
  { module: "Projects", tokens: 85000, pct: 7 },
  { module: "Other", tokens: 72000, pct: 6 },
];

const latencyData = [
  { time: "00:00", p50: 120, p95: 340, p99: 890 },
  { time: "04:00", p50: 110, p95: 310, p99: 820 },
  { time: "08:00", p50: 145, p95: 420, p99: 980 },
  { time: "12:00", p50: 160, p95: 480, p99: 1100 },
  { time: "16:00", p50: 155, p95: 450, p99: 1050 },
  { time: "20:00", p50: 130, p95: 370, p99: 910 },
];

const providers = [
  {
    name: "OpenAI", status: "connected", models: ["GPT-5", "GPT-5-mini", "GPT-5-nano", "GPT-5.2"],
    capabilities: ["Text", "Vision", "Code", "Structured Output", "Function Calling"],
    priority: 1, usage: "$14.20/day", latency: "142ms",
  },
  {
    name: "Anthropic", status: "connected", models: ["Claude 4 Opus", "Claude 4 Sonnet", "Claude 3.5 Haiku"],
    capabilities: ["Text", "Vision", "Code", "Long Context", "Structured Output"],
    priority: 2, usage: "$10.50/day", latency: "168ms",
  },
  {
    name: "Google Gemini", status: "connected", models: ["Gemini 3 Pro", "Gemini 3 Flash", "Gemini 2.5 Pro"],
    capabilities: ["Text", "Vision", "Multimodal", "Code", "Grounding"],
    priority: 3, usage: "$6.10/day", latency: "135ms",
  },
  {
    name: "xAI", status: "limited", models: ["Grok-3", "Grok-3 mini"],
    capabilities: ["Text", "Reasoning", "Code"],
    priority: 4, usage: "$3.00/day", latency: "195ms",
  },
];

const mcpServers = [
  { name: "Document Retrieval", transport: "SSE", auth: "Bearer Token", tools: 4, health: "healthy", modules: ["CRM", "Knowledge"], calls: 2340 },
  { name: "Calendar Access", transport: "HTTP", auth: "OAuth 2.0", tools: 3, health: "healthy", modules: ["Appointments", "Events"], calls: 1890 },
  { name: "CRM Actions", transport: "HTTP", auth: "API Key", tools: 8, health: "healthy", modules: ["CRM", "RevPath"], calls: 4120 },
  { name: "Knowledge Graph", transport: "WebSocket", auth: "mTLS", tools: 5, health: "degraded", modules: ["Knowledge", "Analytics"], calls: 1560 },
  { name: "Project Updater", transport: "HTTP", auth: "Bearer Token", tools: 6, health: "healthy", modules: ["Projects", "CRM"], calls: 980 },
  { name: "Portal Publisher", transport: "SSE", auth: "API Key", tools: 3, health: "healthy", modules: ["Portal", "Events"], calls: 670 },
];

const prompts = [
  { name: "crm.account_summary", version: "v3", modules: ["CRM"], output: "Structured JSON", tests: 42, pass: 40 },
  { name: "revpath.pipeline_forecast", version: "v2", modules: ["RevPath"], output: "Markdown", tests: 28, pass: 27 },
  { name: "event.agenda_generator", version: "v1", modules: ["Events"], output: "Structured JSON", tests: 15, pass: 15 },
  { name: "portal.personalization", version: "v4", modules: ["Portal"], output: "HTML", tests: 33, pass: 31 },
  { name: "pm.risk_detection", version: "v2", modules: ["Projects"], output: "Structured JSON", tests: 20, pass: 18 },
  { name: "analytics.insight_summary", version: "v1", modules: ["Analytics"], output: "Markdown", tests: 12, pass: 12 },
];

const routingRules = [
  { task: "Reasoning & Analysis", provider: "OpenAI", model: "GPT-5", fallback: "Claude 4 Opus", modules: ["CRM", "RevPath", "Analytics"] },
  { task: "Classification", provider: "Google Gemini", model: "Gemini 3 Flash", fallback: "GPT-5-mini", modules: ["CRM", "Lead Magnets"] },
  { task: "Summarization", provider: "Anthropic", model: "Claude 4 Sonnet", fallback: "Gemini 3 Flash", modules: ["CRM", "Knowledge", "Projects"] },
  { task: "Content Generation", provider: "Anthropic", model: "Claude 4 Opus", fallback: "GPT-5", modules: ["Portal", "Events", "Lead Magnets"] },
  { task: "Code Generation", provider: "OpenAI", model: "GPT-5.2", fallback: "Claude 4 Sonnet", modules: ["Projects", "Store"] },
  { task: "Vision & Multimodal", provider: "Google Gemini", model: "Gemini 3 Pro", fallback: "GPT-5", modules: ["Knowledge", "Documents"] },
  { task: "Structured Outputs", provider: "OpenAI", model: "GPT-5", fallback: "Claude 4 Sonnet", modules: ["All Modules"] },
];

const erpModules = [
  { name: "CRM", capabilities: 6, providers: 3, prompts: 4, tools: 5, triggers: 8, icon: Users },
  { name: "RevPath", capabilities: 4, providers: 2, prompts: 3, tools: 3, triggers: 5, icon: GitBranch },
  { name: "Projects", capabilities: 5, providers: 2, prompts: 2, tools: 4, triggers: 6, icon: ListChecks },
  { name: "Lead Magnets", capabilities: 3, providers: 2, prompts: 2, tools: 2, triggers: 4, icon: Zap },
  { name: "Events", capabilities: 4, providers: 2, prompts: 3, tools: 3, triggers: 5, icon: Activity },
  { name: "Appointments", capabilities: 3, providers: 1, prompts: 2, tools: 3, triggers: 4, icon: Clock },
  { name: "Portal Builder", capabilities: 5, providers: 3, prompts: 4, tools: 3, triggers: 6, icon: Globe },
  { name: "Store Builder", capabilities: 3, providers: 2, prompts: 2, tools: 2, triggers: 3, icon: LayoutGrid },
  { name: "Knowledge Graph", capabilities: 4, providers: 2, prompts: 3, tools: 5, triggers: 4, icon: Network },
  { name: "Analytics", capabilities: 5, providers: 3, prompts: 3, tools: 4, triggers: 5, icon: BarChart3 },
];

const workflows = [
  {
    name: "Lead Intelligence Pipeline",
    steps: ["New Lead", "Classify Persona", "Summarize Account", "Score Lead", "Update CRM"],
    status: "active", runs: 1240, success: 97,
  },
  {
    name: "Event Content Generator",
    steps: ["New Event", "Generate Agenda", "Create Landing Copy", "Design Portal", "Publish"],
    status: "active", runs: 340, success: 99,
  },
  {
    name: "Pre-Call Intelligence",
    steps: ["Meeting Booked", "Fetch CRM Data", "Build Brief", "Analyze Sentiment", "Notify Sales"],
    status: "active", runs: 890, success: 95,
  },
  {
    name: "Project Risk Monitor",
    steps: ["Task Updated", "Detect Blockers", "Analyze Dependencies", "Suggest Actions", "Alert PM"],
    status: "paused", runs: 520, success: 92,
  },
];

const auditLogs = [
  { time: "2 min ago", user: "System", action: "Model fallback triggered", detail: "GPT-5 → Claude 4 Opus (timeout)", level: "warning" },
  { time: "15 min ago", user: "admin@corp.com", action: "Provider config updated", detail: "Anthropic API key rotated", level: "info" },
  { time: "1h ago", user: "System", action: "Rate limit reached", detail: "xAI Grok-3: 100 RPM exceeded", level: "warning" },
  { time: "2h ago", user: "ops@corp.com", action: "MCP server added", detail: "Portal Publisher registered", level: "info" },
  { time: "3h ago", user: "System", action: "PII detected and redacted", detail: "CRM summarization request", level: "alert" },
  { time: "5h ago", user: "admin@corp.com", action: "Prompt version published", detail: "crm.account_summary.v3", level: "info" },
];

const observabilityCost = [
  { module: "CRM", openai: 6.2, anthropic: 4.1, google: 2.8, xai: 0.9 },
  { module: "RevPath", openai: 3.1, anthropic: 2.8, google: 1.5, xai: 0.5 },
  { module: "Events", openai: 2.0, anthropic: 1.9, google: 1.2, xai: 0.3 },
  { module: "Portal", openai: 1.8, anthropic: 2.5, google: 0.9, xai: 0.2 },
  { module: "Knowledge", openai: 1.5, anthropic: 1.2, google: 1.8, xai: 0.1 },
  { module: "Analytics", openai: 2.2, anthropic: 0.8, google: 1.1, xai: 0.4 },
];

const aiRecommendations = [
  { type: "cost", title: "Switch CRM summarization to Gemini 3 Flash", impact: "Save ~$3.20/day", confidence: 92 },
  { type: "performance", title: "Enable streaming for Portal content generation", impact: "Reduce TTFB by 40%", confidence: 88 },
  { type: "routing", title: "Add Grok-3 as fallback for classification tasks", impact: "Improve availability to 99.9%", confidence: 85 },
  { type: "connector", title: "Connect Stripe MCP server for revenue data", impact: "Enable real-time billing insights", confidence: 78 },
];

/* ─────────────────── Helpers ─────────────────── */

const StatusDot = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    connected: "bg-[hsl(var(--cbs-green))]",
    healthy: "bg-[hsl(var(--cbs-green))]",
    active: "bg-[hsl(var(--cbs-green))]",
    limited: "bg-[hsl(var(--cbs-amber))]",
    degraded: "bg-[hsl(var(--cbs-amber))]",
    paused: "bg-muted-foreground",
    error: "bg-destructive",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || "bg-muted-foreground"}`} />;
};

const StatCard = ({ icon: Icon, label, value, sub, trend }: {
  icon: any; label: string; value: string; sub?: string; trend?: string;
}) => (
  <Card className="border-border/60">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {trend && (
          <Badge variant="secondary" className="text-[10px] font-medium">
            <TrendingUp className="mr-1 h-3 w-3" />{trend}
          </Badge>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-1">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

/* ─────────────────── Tab: Dashboard ─────────────────── */

const DashboardTab = () => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Plug} label="Active Providers" value="4" sub="All healthy" trend="+1 this week" />
      <StatCard icon={Server} label="MCP Servers" value="6" sub="1 degraded" trend="98.5% uptime" />
      <StatCard icon={Cpu} label="Tokens Today" value="1.09M" sub="Across all modules" trend="+12%" />
      <StatCard icon={DollarSign} label="Daily Cost" value="$32.10" sub="Avg $28.40/day" trend="-4.2%" />
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2 border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Token Consumption & Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageOverTime}>
                <defs>
                  <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262,80%,55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(262,80%,55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(240,4%,46%)" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(240,4%,46%)" }} />
                <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(240,6%,90%)", borderRadius: "8px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="tokens" stroke="hsl(262,80%,55%)" fill="url(#tokenGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Cost by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={costByProvider} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {costByProvider.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(240,6%,90%)", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {costByProvider.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                {p.name} ({p.value}%)
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Usage by Module</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {moduleUsage.map((m) => (
              <div key={m.module} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{m.module}</span>
                  <span className="text-muted-foreground">{(m.tokens / 1000).toFixed(0)}K tokens ({m.pct}%)</span>
                </div>
                <Progress value={m.pct} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">AI Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {aiRecommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  r.type === "cost" ? "bg-[hsl(var(--cbs-green))]/10" :
                  r.type === "performance" ? "bg-[hsl(var(--cbs-blue))]/10" :
                  r.type === "routing" ? "bg-primary/10" : "bg-[hsl(var(--cbs-amber))]/10"
                }`}>
                  <Sparkles className={`h-4 w-4 ${
                    r.type === "cost" ? "text-[hsl(var(--cbs-green))]" :
                    r.type === "performance" ? "text-accent" :
                    r.type === "routing" ? "text-primary" : "text-[hsl(var(--cbs-amber))]"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{r.impact} · {r.confidence}% confidence</p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0">Apply</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>

    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {auditLogs.slice(0, 4).map((log, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
              <StatusDot status={log.level === "warning" ? "limited" : log.level === "alert" ? "error" : "healthy"} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{log.action}</p>
                <p className="text-[10px] text-muted-foreground">{log.detail}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{log.time}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

/* ─────────────────── Tab: Providers ─────────────────── */

const ProvidersTab = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold text-foreground">Provider Registry</h3>
        <p className="text-xs text-muted-foreground">Manage frontier AI providers and their configurations</p>
      </div>
      <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Provider</Button>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {providers.map((p) => (
        <Card key={p.name} className="border-border/60 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{p.name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusDot status={p.status} />
                    <span className="text-[10px] text-muted-foreground capitalize">{p.status}</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">Priority {p.priority}</Badge>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Models</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.models.map((m) => (
                    <Badge key={m} variant="secondary" className="text-[10px] font-normal">{m}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Capabilities</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.capabilities.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px] font-normal">{c}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />{p.usage}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />{p.latency} avg
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <KeyRound className="h-3 w-3" />Configured
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─────────────────── Tab: Router ─────────────────── */

const RouterTab = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold text-foreground">Model Router</h3>
        <p className="text-xs text-muted-foreground">Configure intelligent model routing by task type</p>
      </div>
      <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Rule</Button>
    </div>
    <div className="space-y-3">
      {routingRules.map((rule, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <Route className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-foreground">{rule.task}</h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{rule.provider}</Badge>
                  <span className="text-foreground font-medium">{rule.model}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-muted-foreground">Fallback: {rule.fallback}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                {rule.modules.map((m) => (
                  <Badge key={m} variant="outline" className="text-[10px] font-normal">{m}</Badge>
                ))}
              </div>
              <Button size="sm" variant="ghost" className="shrink-0"><Settings className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card className="border-border/60 border-dashed">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mx-auto mb-3">
            <Network className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Routing Architecture</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Every AI request is routed through the Model Router. Tasks are matched to optimal providers based on capability, cost, and latency. Automatic fallback ensures 99.9% availability.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);

/* ─────────────────── Tab: MCP Servers ─────────────────── */

const MCPServersTab = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold text-foreground">MCP Server Registry</h3>
        <p className="text-xs text-muted-foreground">Connected MCP servers and tool endpoints</p>
      </div>
      <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Register Server</Button>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {mcpServers.map((s) => (
        <Card key={s.name} className="border-border/60 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                  <Server className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{s.name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusDot status={s.health} />
                    <span className="text-[10px] text-muted-foreground capitalize">{s.health}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Transport</span>
                <Badge variant="outline" className="text-[10px]">{s.transport}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Auth</span>
                <span className="text-foreground font-medium">{s.auth}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tools</span>
                <span className="text-foreground font-medium">{s.tools} available</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">API Calls</span>
                <span className="text-foreground font-medium">{s.calls.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-border/60">
                <p className="text-[10px] text-muted-foreground mb-1">Module Access</p>
                <div className="flex flex-wrap gap-1">
                  {s.modules.map((m) => (
                    <Badge key={m} variant="secondary" className="text-[10px] font-normal">{m}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─────────────────── Tab: Prompts ─────────────────── */

const PromptsTab = () => {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Prompt Registry</h3>
          <p className="text-xs text-muted-foreground">Versioned prompt management across modules</p>
        </div>
        <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Prompt</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          {prompts.map((p, i) => (
            <Card
              key={i}
              className={`border-border/60 cursor-pointer transition-all hover:shadow-sm ${selected === i ? "ring-2 ring-primary/30" : ""}`}
              onClick={() => setSelected(i)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileCode2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-semibold text-foreground">{p.name}</code>
                      <Badge variant="outline" className="text-[10px]">{p.version}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span>Output: {p.output}</span>
                      <span>Tests: {p.pass}/{p.tests} passed</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.modules.map((m) => (
                      <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {selected !== null ? prompts[selected].name : "Select a Prompt"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selected !== null ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">System Instruction</p>
                  <Textarea
                    className="text-xs font-mono h-32 resize-none"
                    defaultValue={`You are an AI assistant for the ${prompts[selected].modules[0]} module.\n\nAnalyze the provided data and return a structured response.\n\nBe concise and actionable.`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Version</p>
                  <div className="flex items-center gap-1.5">
                    <History className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-foreground">{prompts[selected].version}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Test Results</p>
                  <span className="text-xs text-[hsl(var(--cbs-green))]">{prompts[selected].pass}/{prompts[selected].tests} passing</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs"><Play className="h-3 w-3" />Test</Button>
                  <Button size="sm" className="flex-1 gap-1 text-xs"><Copy className="h-3 w-3" />Clone</Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">Click a prompt to view details and edit</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/* ─────────────────── Tab: Module Adapters ─────────────────── */

const ModuleAdaptersTab = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-base font-semibold text-foreground">Module Adapters</h3>
      <p className="text-xs text-muted-foreground">How each ERP module connects to the MCP Integration Hub</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {erpModules.map((mod) => (
        <Card key={mod.name} className="border-border/60 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <mod.icon className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">{mod.name}</h4>
            </div>
            <div className="space-y-2">
              {[
                { label: "AI Capabilities", value: mod.capabilities, icon: Brain },
                { label: "Providers", value: mod.providers, icon: Cloud },
                { label: "Prompts", value: mod.prompts, icon: FileCode2 },
                { label: "MCP Tools", value: mod.tools, icon: Plug },
                { label: "Triggers", value: mod.triggers, icon: Zap },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <row.icon className="h-3 w-3" />{row.label}
                  </div>
                  <span className="font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4 text-xs gap-1">
              <Settings className="h-3 w-3" />Configure
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─────────────────── Tab: Workflows ─────────────────── */

const WorkflowsTab = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold text-foreground">AI Workflow Builder</h3>
        <p className="text-xs text-muted-foreground">Visual pipelines for AI-powered automation</p>
      </div>
      <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Workflow</Button>
    </div>
    <div className="space-y-4">
      {workflows.map((wf, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                  <Workflow className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{wf.name}</h4>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{wf.runs.toLocaleString()} runs</span>
                    <span>{wf.success}% success</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={wf.status === "active" ? "default" : "secondary"} className="text-[10px] capitalize">{wf.status}</Badge>
                <Switch checked={wf.status === "active"} />
              </div>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {wf.steps.map((step, si) => (
                <div key={si} className="flex items-center gap-1 shrink-0">
                  <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5">
                    <CircleDot className="h-3 w-3 text-primary" />
                    <span className="text-xs text-foreground whitespace-nowrap">{step}</span>
                  </div>
                  {si < wf.steps.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

/* ─────────────────── Tab: Governance ─────────────────── */

const GovernanceTab = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-base font-semibold text-foreground">Governance & Security</h3>
      <p className="text-xs text-muted-foreground">Access controls, policies, and audit trail</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Shield} label="Security Policies" value="12" sub="All enforced" />
      <StatCard icon={Lock} label="RBAC Rules" value="8" sub="3 roles configured" />
      <StatCard icon={Fingerprint} label="PII Redactions" value="47" sub="Last 7 days" trend="Active" />
      <StatCard icon={Eye} label="Audit Events" value="2.4K" sub="Last 30 days" />
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Policy Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { policy: "PII Auto-Redaction", desc: "Detect and mask personal data before sending to providers", enabled: true },
              { policy: "Provider Allowlist", desc: "Restrict which providers each module can access", enabled: true },
              { policy: "Request Approval", desc: "Require approval for requests over token threshold", enabled: false },
              { policy: "Tenant Isolation", desc: "Ensure data separation between organizational units", enabled: true },
              { policy: "Cost Limits", desc: "Set daily spending caps per module", enabled: true },
              { policy: "Data Residency", desc: "Restrict processing to specific geographic regions", enabled: false },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{p.policy}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
                <Switch checked={p.enabled} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5 border border-border/40 hover:bg-muted/30 transition-colors">
                {log.level === "warning" ? <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--cbs-amber))] mt-0.5 shrink-0" /> :
                 log.level === "alert" ? <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" /> :
                 <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--cbs-green))] mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{log.action}</p>
                  <p className="text-[10px] text-muted-foreground">{log.detail}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">{log.user} · {log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

/* ─────────────────── Tab: Observability ─────────────────── */

const ObservabilityTab = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-base font-semibold text-foreground">Observability & Cost Control</h3>
      <p className="text-xs text-muted-foreground">Performance, cost, and reliability metrics</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Activity} label="Requests (24h)" value="6,940" trend="+8%" />
      <StatCard icon={Gauge} label="Avg Latency" value="148ms" sub="p95: 420ms" trend="-5%" />
      <StatCard icon={RefreshCw} label="Fallback Rate" value="2.1%" sub="14 fallbacks today" />
      <StatCard icon={CheckCircle2} label="Tool Call Success" value="97.8%" sub="MCP tool calls" />
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Latency Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" className="text-xs" tick={{ fill: "hsl(240,4%,46%)" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(240,4%,46%)" }} />
                <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(240,6%,90%)", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="p50" stroke="hsl(152,60%,48%)" strokeWidth={2} dot={false} name="p50" />
                <Line type="monotone" dataKey="p95" stroke="hsl(262,80%,55%)" strokeWidth={2} dot={false} name="p95" />
                <Line type="monotone" dataKey="p99" stroke="hsl(38,92%,50%)" strokeWidth={2} dot={false} name="p99" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Cost by Module × Provider ($/day)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={observabilityCost}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="module" className="text-xs" tick={{ fill: "hsl(240,4%,46%)" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(240,4%,46%)" }} />
                <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(240,6%,90%)", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="openai" stackId="a" fill="hsl(152,60%,48%)" name="OpenAI" radius={[0, 0, 0, 0]} />
                <Bar dataKey="anthropic" stackId="a" fill="hsl(262,80%,55%)" name="Anthropic" />
                <Bar dataKey="google" stackId="a" fill="hsl(220,80%,55%)" name="Google" />
                <Bar dataKey="xai" stackId="a" fill="hsl(38,92%,50%)" name="xAI" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Request Volume by Provider</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={usageOverTime}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220,80%,55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(220,80%,55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(240,4%,46%)" }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(240,4%,46%)" }} />
              <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(240,6%,90%)", borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="requests" stroke="hsl(220,80%,55%)" fill="url(#reqGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  </div>
);

/* ─────────────────── Tab: AI Assistant ─────────────────── */

const AIAssistantTab = () => {
  const [query, setQuery] = useState("");
  const insights = [
    { icon: DollarSign, title: "Cost Optimization", desc: "CRM module is 23% over budget. Switching summarization from Claude 4 Opus to Gemini 3 Flash would save $4.80/day with <2% quality loss.", action: "Apply Recommendation" },
    { icon: Route, title: "Routing Improvement", desc: "Classification tasks have 3.2% higher accuracy on GPT-5-mini vs current Gemini 3 Flash assignment. Consider A/B testing.", action: "Create A/B Test" },
    { icon: PlugZap, title: "Missing Connector", desc: "Portal Builder could benefit from a Stripe MCP server connection for real-time subscription data in personalization workflows.", action: "View Connector" },
    { icon: AlertTriangle, title: "Underused Model", desc: "Grok-3 has only 9% of traffic but shows strong performance on reasoning benchmarks. Consider routing more analytical tasks to it.", action: "Update Router" },
    { icon: Gauge, title: "Latency Alert", desc: "Knowledge Graph MCP server latency increased 40% in the last 6 hours. Current p95: 580ms (threshold: 500ms). Investigate connection pool.", action: "View Server" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">AI Admin Assistant</h3>
        <p className="text-xs text-muted-foreground">Intelligent recommendations for your AI infrastructure</p>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Ask about providers, costs, routing, performance..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button size="sm" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />Ask</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {insights.map((ins, i) => (
          <Card key={i} className="border-border/60 hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ins.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground">{ins.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ins.desc}</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs shrink-0">{ins.action}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────── Main Component ─────────────────── */

export default function MCPIntegrationHub() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Cable className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">MCP Integration Hub</h1>
            <p className="text-xs text-muted-foreground">AI Connectivity Control Center · Enterprise AI Orchestration Layer</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
          {[
            { value: "dashboard", icon: LayoutGrid, label: "Dashboard" },
            { value: "providers", icon: Brain, label: "Providers" },
            { value: "router", icon: Route, label: "Router" },
            { value: "mcp-servers", icon: Server, label: "MCP Servers" },
            { value: "prompts", icon: FileCode2, label: "Prompts" },
            { value: "modules", icon: Layers, label: "Modules" },
            { value: "workflows", icon: Workflow, label: "Workflows" },
            { value: "governance", icon: Shield, label: "Governance" },
            { value: "observability", icon: Monitor, label: "Observability" },
            { value: "assistant", icon: Bot, label: "AI Assistant" },
          ].map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-1.5 rounded-lg">
              <tab.icon className="h-3.5 w-3.5" />{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="providers"><ProvidersTab /></TabsContent>
        <TabsContent value="router"><RouterTab /></TabsContent>
        <TabsContent value="mcp-servers"><MCPServersTab /></TabsContent>
        <TabsContent value="prompts"><PromptsTab /></TabsContent>
        <TabsContent value="modules"><ModuleAdaptersTab /></TabsContent>
        <TabsContent value="workflows"><WorkflowsTab /></TabsContent>
        <TabsContent value="governance"><GovernanceTab /></TabsContent>
        <TabsContent value="observability"><ObservabilityTab /></TabsContent>
        <TabsContent value="assistant"><AIAssistantTab /></TabsContent>
      </Tabs>
    </div>
  );
}
