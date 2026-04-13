import { useState } from "react";
import {
  FileSignature, Shield, CheckCircle2, AlertTriangle, Clock, DollarSign,
  ArrowRight, Zap, Brain, Eye, Send, Lock, Globe, Layers, BarChart3,
  Users, GitBranch, Cable, Cpu, Warehouse as WarehouseIcon, Calendar,
  CalendarClock, PackageSearch, Network, FileText, Workflow, Activity,
  Target, TrendingUp, Scale, Gavel, Link2, Database, Bot, ChevronRight,
  Play, Pause, RefreshCw, Download, Upload, Plus, Search, Filter,
  MoreHorizontal, ExternalLink, Copy, Sparkles, CircleDot
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const Metric = ({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: any }) => (
  <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SectionCard = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <Card className="border border-border/60 shadow-sm">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {action}
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */
const contracts = [
  { id: "CTR-001", title: "Enterprise SaaS License Agreement", type: "Service Agreement", status: "active", value: "$240,000", parties: "Acme Corp ↔ TechVentures", milestone: 75, deployed: true },
  { id: "CTR-002", title: "Revenue Share – Partner Network", type: "Revenue Sharing", status: "pending_approval", value: "$180,000", parties: "Composable OS ↔ PartnerCo", milestone: 0, deployed: false },
  { id: "CTR-003", title: "Supplier Fulfillment SLA", type: "Fulfillment SLA", status: "active", value: "$95,000", parties: "LogiFlow ↔ WarehousePro", milestone: 50, deployed: true },
  { id: "CTR-004", title: "Event Sponsorship – TechSummit 2026", type: "Sponsorship", status: "draft", value: "$60,000", parties: "Composable OS ↔ EventOrg", milestone: 0, deployed: false },
  { id: "CTR-005", title: "Subscription Escrow Agreement", type: "Escrow", status: "active", value: "$320,000", parties: "FinanceCo ↔ Composable OS", milestone: 90, deployed: true },
  { id: "CTR-006", title: "Appointment Deposit – Clinic Network", type: "Deposit Agreement", status: "signing", value: "$15,000", parties: "HealthCo ↔ Patients", milestone: 25, deployed: false },
];

const templates = [
  { name: "Service Agreement", clauses: 12, vars: 18, icon: FileText },
  { name: "Escrow Contract", clauses: 8, vars: 14, icon: Lock },
  { name: "Revenue Sharing Agreement", clauses: 10, vars: 16, icon: GitBranch },
  { name: "Partnership Contract", clauses: 14, vars: 20, icon: Users },
  { name: "Subscription Agreement", clauses: 6, vars: 10, icon: RefreshCw },
  { name: "Event Sponsorship Agreement", clauses: 9, vars: 12, icon: Calendar },
  { name: "Supplier Agreement", clauses: 11, vars: 15, icon: PackageSearch },
  { name: "Appointment Deposit Agreement", clauses: 5, vars: 8, icon: CalendarClock },
  { name: "Fulfillment SLA", clauses: 7, vars: 11, icon: WarehouseIcon },
];

const clauses = [
  { label: "Release payment when milestone is completed", trigger: "milestone.completed", action: "payment.release", status: "active" },
  { label: "Trigger refund if event is cancelled", trigger: "event.cancelled", action: "payment.refund", status: "active" },
  { label: "Activate penalty if delivery is delayed", trigger: "delivery.delayed > 48h", action: "penalty.activate", status: "draft" },
  { label: "Unlock access if subscription is active", trigger: "subscription.status == active", action: "portal.unlock", status: "active" },
  { label: "Notify finance if contract value exceeds $100K", trigger: "contract.value > 100000", action: "notification.finance", status: "active" },
];

const approvalSteps = [
  { step: "Draft", status: "completed", user: "Sarah Chen" },
  { step: "Internal Review", status: "completed", user: "Mike Ross" },
  { step: "Legal Review", status: "completed", user: "Legal Team" },
  { step: "Finance Approval", status: "in_progress", user: "CFO Office" },
  { step: "Partner Approval", status: "pending", user: "Partner Rep" },
  { step: "Signing", status: "pending", user: "Both Parties" },
  { step: "Deployment", status: "pending", user: "System" },
  { step: "Active Monitoring", status: "pending", user: "Auto" },
];

const erpBindings = [
  { variable: "customer.name", source: "CRM", module: "Contact Record", icon: Users },
  { variable: "order.total", source: "Inventory & Orders", module: "Order Summary", icon: PackageSearch },
  { variable: "event.date", source: "Event Builder", module: "Event Schedule", icon: Calendar },
  { variable: "appointment.status", source: "Appointments", module: "Booking Status", icon: CalendarClock },
  { variable: "warehouse.delivery_time", source: "Warehouse Builder", module: "Shipment Tracker", icon: WarehouseIcon },
  { variable: "device.alert", source: "IoT Builder", module: "Sensor Alert", icon: Cpu },
  { variable: "revenue.forecast", source: "RevPath", module: "Revenue Pipeline", icon: GitBranch },
];

const events = [
  { time: "2 min ago", event: "Milestone completed", contract: "CTR-001", type: "milestone" },
  { time: "15 min ago", event: "Payment released – $60,000", contract: "CTR-005", type: "payment" },
  { time: "1 hr ago", event: "Contract paused – review pending", contract: "CTR-003", type: "pause" },
  { time: "2 hr ago", event: "Trigger activated – SLA threshold", contract: "CTR-003", type: "trigger" },
  { time: "4 hr ago", event: "Refund event queued", contract: "CTR-004", type: "refund" },
  { time: "6 hr ago", event: "Blockchain event confirmed", contract: "CTR-005", type: "blockchain" },
  { time: "8 hr ago", event: "ERP sync completed", contract: "CTR-001", type: "sync" },
];

const statusColor = (s: string) => {
  const m: Record<string, string> = { active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", pending_approval: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", draft: "bg-muted text-muted-foreground", signing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", pending: "bg-muted text-muted-foreground" };
  return m[s] ?? "bg-muted text-muted-foreground";
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
const ContractStudio = () => {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileSignature className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Programmable Contract Studio</h1>
              <p className="text-sm text-muted-foreground">Smart agreements · Programmable logic · ERP-native execution</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Search className="h-3.5 w-3.5 mr-1" /> Search</Button>
          <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> New Contract</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {[
            ["dashboard", "Intelligence Center"],
            ["templates", "Templates"],
            ["clauses", "Clause Builder"],
            ["bindings", "ERP Bindings"],
            ["approval", "Approval Flow"],
            ["portal", "Portal Integration"],
            ["deploy", "Deployment"],
            ["monitor", "Monitoring"],
            ["crm-rev", "CRM & RevPath"],
            ["iot-wh", "IoT & Warehouse"],
            ["ai", "AI Assistant"],
            ["synaptic", "Synaptic View"],
            ["analytics", "Analytics"],
          ].map(([k, v]) => (
            <TabsTrigger key={k} value={k} className="text-xs px-3 py-1.5">{v}</TabsTrigger>
          ))}
        </TabsList>

        {/* ============ DASHBOARD ============ */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Metric label="Active Contracts" value="48" sub="+6 this month" icon={FileSignature} />
            <Metric label="Pending Approvals" value="12" sub="3 urgent" icon={Clock} />
            <Metric label="Deployed Smart Agreements" value="31" sub="On-chain" icon={Shield} />
            <Metric label="Total Contract Value" value="$4.2M" sub="Across all active" icon={DollarSign} />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <SectionCard title="Contracts by Status">
              <div className="space-y-3">
                {[
                  { label: "Active", count: 28, pct: 58, color: "bg-emerald-500" },
                  { label: "Pending Approval", count: 12, pct: 25, color: "bg-amber-500" },
                  { label: "Draft", count: 5, pct: 10, color: "bg-muted-foreground/40" },
                  { label: "Signing", count: 3, pct: 7, color: "bg-blue-500" },
                ].map(s => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">{s.label}</span><span className="font-medium">{s.count}</span></div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} /></div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Milestone Completion">
              <div className="space-y-3">
                {contracts.filter(c => c.milestone > 0).map(c => (
                  <div key={c.id} className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="truncate text-muted-foreground">{c.id}</span><span className="font-medium">{c.milestone}%</span></div>
                    <Progress value={c.milestone} className="h-2" />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="AI Recommendations">
              <div className="space-y-3">
                {[
                  { text: "CTR-003 SLA at risk — delivery delay detected", type: "warning" },
                  { text: "CTR-002 approval bottleneck — escalate to CFO", type: "alert" },
                  { text: "3 contracts eligible for auto-renewal", type: "suggestion" },
                  { text: "Revenue share model optimization available", type: "suggestion" },
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${r.type === "warning" ? "bg-amber-500" : r.type === "alert" ? "bg-destructive" : "bg-primary"}`} />
                    <span className="text-muted-foreground">{r.text}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Recent Contracts" action={<Button variant="ghost" size="sm" className="text-xs">View All</Button>}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border">{["ID", "Title", "Type", "Status", "Value", "Milestone", "Deployed"].map(h => <th key={h} className="text-left py-2 px-2 font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-2 font-mono font-medium">{c.id}</td>
                      <td className="py-2.5 px-2 font-medium max-w-[200px] truncate">{c.title}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{c.type}</td>
                      <td className="py-2.5 px-2"><Badge variant="outline" className={`text-[10px] ${statusColor(c.status)}`}>{c.status.replace("_", " ")}</Badge></td>
                      <td className="py-2.5 px-2 font-medium">{c.value}</td>
                      <td className="py-2.5 px-2"><Progress value={c.milestone} className="h-1.5 w-16" /></td>
                      <td className="py-2.5 px-2">{c.deployed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <CircleDot className="h-3.5 w-3.5 text-muted-foreground/40" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ============ TEMPLATES ============ */}
        <TabsContent value="templates" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pre-built contract templates with configurable clauses, variables and payment terms.</p>
            <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Create Template</Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t => (
              <Card key={t.name} className="border border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <t.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{t.name}</h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{t.clauses} clauses</span>
                        <span>{t.vars} variables</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {["Parties", "Milestones", "Payment", "Approval"].map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px] bg-muted/50">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ============ CLAUSE BUILDER ============ */}
        <TabsContent value="clauses" className="space-y-6 mt-6">
          <SectionCard title="Programmable Clause & Rule Builder" action={<Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> New Clause</Button>}>
            <div className="space-y-3">
              {clauses.map((c, i) => (
                <div key={i} className="rounded-xl border border-border/60 p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Zap className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.label}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] font-mono bg-primary/5">{c.trigger}</Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge variant="outline" className="text-[10px] font-mono bg-accent/5">{c.action}</Badge>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${statusColor(c.status)}`}>{c.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Visual Logic Builder">
            <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
              <Workflow className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium">Drag conditions and actions to build contract logic</p>
              <p className="text-xs text-muted-foreground mt-1">IF → CONDITION → THEN → ACTION</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Badge variant="outline" className="bg-primary/10 text-primary">IF</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-amber-100 text-amber-700">milestone.completed</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-accent/10 text-accent">THEN</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700">payment.release</Badge>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ============ ERP BINDINGS ============ */}
        <TabsContent value="bindings" className="space-y-6 mt-6">
          <SectionCard title="ERP Data Bindings" action={<Button size="sm" variant="outline"><Link2 className="h-3.5 w-3.5 mr-1" /> Add Binding</Button>}>
            <div className="space-y-3">
              {erpBindings.map((b, i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-border/60 p-4 hover:bg-muted/20 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <b.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono font-semibold text-primary">{b.variable}</code>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.module}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Badge variant="outline" className="text-[10px] bg-accent/5">{b.source}</Badge>
                  <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700">Connected</Badge>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ============ APPROVAL FLOW ============ */}
        <TabsContent value="approval" className="space-y-6 mt-6">
          <SectionCard title="Contract Approval Workflow">
            <div className="relative">
              <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />
              <div className="space-y-4">
                {approvalSteps.map((s, i) => (
                  <div key={i} className="flex items-center gap-4 relative">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 z-10 ${s.status === "completed" ? "bg-emerald-100 dark:bg-emerald-900/30" : s.status === "in_progress" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted"}`}>
                      {s.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : s.status === "in_progress" ? <Activity className="h-5 w-5 text-blue-600" /> : <CircleDot className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 rounded-xl border border-border/60 p-3 bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{s.step}</p>
                          <p className="text-xs text-muted-foreground">{s.user}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${statusColor(s.status)}`}>{s.status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ============ PORTAL INTEGRATION ============ */}
        <TabsContent value="portal" className="space-y-6 mt-6">
          <SectionCard title="Customer & Partner Portal Experience">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: "Contract Preview", desc: "Clients view agreement terms, clauses and obligations", icon: Eye },
                { title: "Self-Service Approval", desc: "Partners approve or request changes directly", icon: CheckCircle2 },
                { title: "Digital Signing", desc: "Secure electronic signing with audit trail", icon: FileSignature },
                { title: "Milestone Tracking", desc: "Real-time visibility into milestone progress", icon: Target },
                { title: "Payment Progress", desc: "Track released, pending and scheduled payments", icon: DollarSign },
                { title: "Agreement Download", desc: "Download signed agreements as PDF", icon: Download },
              ].map(f => (
                <div key={f.title} className="rounded-xl border border-border/60 p-4 hover:bg-muted/20 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold">{f.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ============ DEPLOYMENT ============ */}
        <TabsContent value="deploy" className="space-y-6 mt-6">
          <SectionCard title="Smart Contract Deployment">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Deployment Configuration</h4>
                {[
                  { label: "Selected Network", value: "Ethereum Mainnet" },
                  { label: "Contract Type", value: "Escrow Agreement (ERC-20)" },
                  { label: "Wallet", value: "0x7a3f...c9e2" },
                  { label: "Gas Estimate", value: "0.0042 ETH (~$12.60)" },
                  { label: "Version", value: "v2.4.1" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-xs py-2 border-b border-border/40">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Deployment Status</h4>
                <div className="rounded-xl border border-border/60 p-6 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                    <Shield className="h-8 w-8 text-emerald-600" />
                  </div>
                  <p className="text-sm font-semibold mt-4">Ready to Deploy</p>
                  <p className="text-xs text-muted-foreground mt-1">All validations passed</p>
                  <Button className="mt-4" size="sm"><Send className="h-3.5 w-3.5 mr-1" /> Deploy Contract</Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Contract Address: <code className="font-mono text-primary">pending deployment</code></p>
                  <p>Deployment History: 3 previous versions</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ============ MONITORING ============ */}
        <TabsContent value="monitor" className="space-y-6 mt-6">
          <SectionCard title="Contract Event Monitor" action={<Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700"><Activity className="h-3 w-3 mr-1" /> Live</Badge>}>
            <div className="space-y-2">
              {events.map((e, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 p-3 hover:bg-muted/20 transition-colors">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${e.type === "payment" ? "bg-emerald-500" : e.type === "milestone" ? "bg-primary" : e.type === "pause" ? "bg-amber-500" : e.type === "trigger" ? "bg-blue-500" : e.type === "refund" ? "bg-destructive" : "bg-muted-foreground"}`} />
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{e.time}</span>
                  <span className="text-xs font-medium flex-1">{e.event}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">{e.contract}</Badge>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ============ CRM & REVPATH ============ */}
        <TabsContent value="crm-rev" className="space-y-6 mt-6">
          <SectionCard title="Contract → Revenue Lifecycle">
            <div className="flex items-center justify-center gap-2 flex-wrap py-4">
              {["Lead", "Opportunity", "Contract", "Revenue", "Expansion"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className="rounded-xl border border-border/60 px-4 py-2.5 bg-card hover:bg-muted/30 transition-colors">
                    <p className="text-xs font-semibold">{s}</p>
                  </div>
                  {i < 4 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid sm:grid-cols-2 gap-4">
            <SectionCard title="CRM Triggers">
              <div className="space-y-3">
                {[
                  { trigger: "Signed contract", action: "Update opportunity stage to 'Closed Won'" },
                  { trigger: "Contract activated", action: "Create revenue forecast entry" },
                  { trigger: "Milestone reached", action: "Update customer lifecycle stage" },
                  { trigger: "Contract completed", action: "Trigger upsell/renewal workflow" },
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <div><span className="font-medium">{r.trigger}</span> <span className="text-muted-foreground">→ {r.action}</span></div>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="RevPath Integration">
              <div className="space-y-3">
                {[
                  { label: "Contract-sourced Revenue", value: "$2.4M", pct: 72 },
                  { label: "Renewal Pipeline", value: "$860K", pct: 45 },
                  { label: "Expansion Contracts", value: "$340K", pct: 28 },
                ].map(r => (
                  <div key={r.label} className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">{r.label}</span><span className="font-medium">{r.value}</span></div>
                    <Progress value={r.pct} className="h-2" />
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ============ IOT & WAREHOUSE ============ */}
        <TabsContent value="iot-wh" className="space-y-6 mt-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <SectionCard title="IoT → Contract Triggers">
              <div className="space-y-3">
                {[
                  { signal: "Delivery confirmed (GPS)", action: "Release payment milestone" },
                  { signal: "Temperature exceeded 40°C", action: "Trigger quality alert clause" },
                  { signal: "Asset tracker confirms receipt", action: "Update contract milestone" },
                  { signal: "Service sensor validates completion", action: "Mark clause fulfilled" },
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Cpu className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                    <div><span className="font-medium">{r.signal}</span> <span className="text-muted-foreground">→ {r.action}</span></div>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Warehouse → Contract Events">
              <div className="space-y-3">
                {[
                  { signal: "Shipment received", action: "Validate delivery clause" },
                  { signal: "Inventory stocked", action: "Confirm fulfillment SLA" },
                  { signal: "Quality check passed", action: "Advance milestone" },
                  { signal: "Return processed", action: "Trigger refund clause" },
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <WarehouseIcon className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <div><span className="font-medium">{r.signal}</span> <span className="text-muted-foreground">→ {r.action}</span></div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ============ AI ASSISTANT ============ */}
        <TabsContent value="ai" className="space-y-6 mt-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <SectionCard title="AI Contract Assistant" action={<Badge variant="outline" className="text-[10px] bg-primary/10 text-primary"><Sparkles className="h-3 w-3 mr-1" /> MCP-Powered</Badge>}>
              <div className="space-y-3">
                {[
                  { label: "Generate Draft", desc: "Create contract drafts from natural language prompts", icon: FileText },
                  { label: "Suggest Clauses", desc: "AI-recommended clauses based on contract type", icon: Layers },
                  { label: "Identify Missing Fields", desc: "Detect incomplete variables and missing data", icon: AlertTriangle },
                  { label: "Summarize Obligations", desc: "Plain-language summary of all obligations", icon: Eye },
                  { label: "Detect Risk", desc: "Flag risky conditions and suggest mitigations", icon: Shield },
                  { label: "Explain Logic", desc: "Convert programmable logic into plain language", icon: Brain },
                ].map(f => (
                  <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="AI Insights">
              <div className="rounded-xl bg-muted/30 border border-border/60 p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Contract Analysis Summary</span>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>• <strong>3 contracts</strong> have incomplete penalty clauses that could expose risk.</p>
                  <p>• <strong>CTR-003</strong> SLA fulfillment is trending below threshold — recommend renegotiation.</p>
                  <p>• <strong>5 contracts</strong> are eligible for automated renewal processing.</p>
                  <p>• Revenue share model for CTR-002 could be optimized by 12% based on historical data.</p>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 p-4">
                <Input placeholder="Ask AI about your contracts..." className="mb-2 text-xs" />
                <Button size="sm" className="w-full text-xs"><Sparkles className="h-3.5 w-3.5 mr-1" /> Analyze</Button>
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ============ SYNAPTIC VIEW ============ */}
        <TabsContent value="synaptic" className="space-y-6 mt-6">
          <SectionCard title="Synaptic System — Contract Flows">
            <div className="rounded-xl bg-slate-950 p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(139,92,246,0.3) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {[
                    { name: "CRM", color: "from-violet-500 to-purple-600" },
                    { name: "Contract Template", color: "from-blue-500 to-cyan-500" },
                    { name: "Approval Flow", color: "from-amber-500 to-orange-500" },
                    { name: "Smart Deploy", color: "from-emerald-500 to-green-500" },
                  ].map((n, i) => (
                    <div key={n.name} className="flex items-center gap-3">
                      <div className={`rounded-xl bg-gradient-to-br ${n.color} px-4 py-3 text-white text-xs font-semibold shadow-lg`}>{n.name}</div>
                      {i < 3 && <div className="flex items-center gap-1">{[0, 1, 2].map(d => <div key={d} className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: `${d * 200}ms` }} />)}</div>}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-3 flex-wrap mt-6">
                  {[
                    { name: "Order", color: "from-pink-500 to-rose-500" },
                    { name: "Contract Trigger", color: "from-blue-500 to-cyan-500" },
                    { name: "Payment Release", color: "from-emerald-500 to-green-500" },
                    { name: "Analytics", color: "from-violet-500 to-purple-600" },
                  ].map((n, i) => (
                    <div key={n.name} className="flex items-center gap-3">
                      <div className={`rounded-xl bg-gradient-to-br ${n.color} px-4 py-3 text-white text-xs font-semibold shadow-lg`}>{n.name}</div>
                      {i < 3 && <div className="flex items-center gap-1">{[0, 1, 2].map(d => <div key={d} className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: `${d * 200}ms` }} />)}</div>}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-3 flex-wrap mt-6">
                  {[
                    { name: "IoT Sensor", color: "from-teal-500 to-cyan-500" },
                    { name: "Rule Engine", color: "from-amber-500 to-orange-500" },
                    { name: "Contract Event", color: "from-blue-500 to-indigo-500" },
                  ].map((n, i) => (
                    <div key={n.name} className="flex items-center gap-3">
                      <div className={`rounded-xl bg-gradient-to-br ${n.color} px-4 py-3 text-white text-xs font-semibold shadow-lg`}>{n.name}</div>
                      {i < 2 && <div className="flex items-center gap-1">{[0, 1, 2].map(d => <div key={d} className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: `${d * 200}ms` }} />)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ============ ANALYTICS ============ */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Metric label="Contract Value" value="$4.2M" sub="Active contracts" icon={DollarSign} />
            <Metric label="Conversion Rate" value="68%" sub="Draft → Active" icon={TrendingUp} />
            <Metric label="Avg Approval Cycle" value="4.2d" sub="↓ 18% vs last month" icon={Clock} />
            <Metric label="Milestone Completion" value="82%" sub="On schedule" icon={Target} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <SectionCard title="Contract Value by Type">
              <div className="space-y-3">
                {[
                  { type: "Service Agreements", value: "$1.8M", pct: 43 },
                  { type: "Revenue Sharing", value: "$980K", pct: 23 },
                  { type: "Fulfillment SLA", value: "$620K", pct: 15 },
                  { type: "Escrow Contracts", value: "$520K", pct: 12 },
                  { type: "Other", value: "$280K", pct: 7 },
                ].map(t => (
                  <div key={t.type} className="space-y-1">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">{t.type}</span><span className="font-medium">{t.value}</span></div>
                    <Progress value={t.pct} className="h-2" />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Governance & Audit">
              <div className="space-y-3">
                {[
                  { label: "Payment Releases This Month", value: "$420K" },
                  { label: "Risk Alerts Active", value: "3" },
                  { label: "Deployments (30d)", value: "12" },
                  { label: "Audit Trail Entries", value: "1,847" },
                  { label: "Compliance Score", value: "96%" },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-xs py-2 border-b border-border/40">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-semibold">{r.value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractStudio;
