
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DollarSign, TrendingUp, FileText, ShoppingCart, Users, Bot, Zap,
  BarChart3, CheckCircle2, Clock, AlertTriangle, ArrowRight, Star,
  Package, Send, Eye, Download, Plus, Filter, Search, ChevronRight,
  Target, Percent, Receipt, Layers, Cable, Network, Shield, Play, Monitor
} from "lucide-react";

/* ─── Mock Data ─── */
const pipelineStages = [
  { name: "Qualification", count: 12, value: "$180K", color: "bg-blue-500" },
  { name: "Discovery", count: 8, value: "$320K", color: "bg-cyan-500" },
  { name: "Proposal", count: 15, value: "$540K", color: "bg-purple-500" },
  { name: "Negotiation", count: 6, value: "$420K", color: "bg-amber-500" },
  { name: "Closed Won", count: 22, value: "$1.2M", color: "bg-emerald-500" },
];

const opportunities = [
  { id: "OPP-1024", account: "Nexus Corp", contact: "Sarah Chen", stage: "Proposal", value: "$85,000", probability: 75, close: "Mar 28", products: ["Enterprise Suite", "AI Add-on"], nextAction: "Send revised proposal" },
  { id: "OPP-1031", account: "Velocity Labs", contact: "Marcus Rivera", stage: "Negotiation", value: "$120,000", probability: 60, close: "Apr 5", products: ["Platform License", "Support Plan"], nextAction: "Schedule pricing call" },
  { id: "OPP-1045", account: "Pinnacle Health", contact: "Dr. Aisha Patel", stage: "Discovery", value: "$210,000", probability: 40, close: "Apr 20", products: ["IoT Suite", "Warehouse Module"], nextAction: "Complete needs assessment" },
  { id: "OPP-1052", account: "Atlas Retail", contact: "James O'Connor", stage: "Qualification", value: "$45,000", probability: 25, close: "May 1", products: ["POS Builder", "Shop Builder"], nextAction: "Confirm budget authority" },
];

const quotations = [
  { id: "QT-2401", customer: "Nexus Corp", items: 5, total: "$85,000", status: "Sent", expires: "Apr 2", discount: "10%", template: "Enterprise" },
  { id: "QT-2398", customer: "Velocity Labs", items: 3, total: "$120,000", status: "Draft", expires: "—", discount: "5%", template: "Platform" },
  { id: "QT-2395", customer: "Orion Systems", items: 8, total: "$67,500", status: "Approved", expires: "Mar 25", discount: "15%", template: "Standard" },
  { id: "QT-2390", customer: "Summit Finance", items: 2, total: "$42,000", status: "Accepted", expires: "Mar 18", discount: "0%", template: "SaaS" },
  { id: "QT-2385", customer: "Beacon Logistics", items: 6, total: "$93,200", status: "Expired", expires: "Mar 10", discount: "8%", template: "Enterprise" },
];

const salesOrders = [
  { id: "SO-5012", customer: "Summit Finance", items: 2, total: "$42,000", status: "Confirmed", fulfillment: "Processing", payment: "Paid", contract: "CT-301" },
  { id: "SO-5008", customer: "Orion Systems", items: 8, total: "$67,500", status: "Fulfilled", fulfillment: "Delivered", payment: "Paid", contract: "CT-298" },
  { id: "SO-5003", customer: "Meridian Tech", items: 4, total: "$156,000", status: "In Progress", fulfillment: "Partial", payment: "50% Received", contract: "CT-295" },
];

const cpqProducts = [
  { name: "Enterprise Platform", base: "$2,400/mo", type: "Subscription", addOns: ["AI Module", "IoT Suite", "Advanced Analytics"], bundles: ["Growth Pack", "Scale Pack"] },
  { name: "Commerce Suite", base: "$1,800/mo", type: "Subscription", addOns: ["POS Terminal", "Shop Builder", "Marketplace"], bundles: ["Retail Starter", "Omnichannel Pro"] },
  { name: "Operations Pack", base: "$3,200/mo", type: "Subscription", addOns: ["Warehouse Module", "IoT Builder", "Contract Studio"], bundles: ["Logistics Bundle", "Full Ops"] },
  { name: "Professional Services", base: "$150/hr", type: "Service", addOns: ["Onboarding", "Training", "Custom Dev"], bundles: ["Launch Pack", "Premium Support"] },
];

const approvalSteps = [
  { stage: "Draft", status: "completed", user: "Sales Rep", time: "Mar 12, 9:00 AM" },
  { stage: "Review", status: "completed", user: "Sales Manager", time: "Mar 12, 2:30 PM" },
  { stage: "Legal Review", status: "active", user: "Legal Team", time: "Pending" },
  { stage: "Finance Approval", status: "pending", user: "CFO", time: "—" },
  { stage: "Sent to Customer", status: "pending", user: "System", time: "—" },
];

const automationWorkflows = [
  { trigger: "Quote Sent", action: "Notify account owner via CRM", status: "Active", runs: 142 },
  { trigger: "Quote Accepted", action: "Create sales order + reserve inventory", status: "Active", runs: 89 },
  { trigger: "Quote Expired", action: "Trigger follow-up workflow in RevPath", status: "Active", runs: 34 },
  { trigger: "Large Deal (>$100K)", action: "Notify finance + flag for review", status: "Active", runs: 18 },
  { trigger: "Order Confirmed", action: "Notify warehouse + update fulfillment", status: "Active", runs: 76 },
  { trigger: "Contract Linked", action: "Update revenue analytics + forecast", status: "Active", runs: 52 },
];

const aiInsights = [
  { type: "Risk", title: "Velocity Labs deal stalling", detail: "No activity in 8 days. Probability decreased 15%. Recommend scheduling pricing call.", icon: AlertTriangle, color: "text-amber-500" },
  { type: "Upsell", title: "Nexus Corp expansion opportunity", detail: "Usage patterns suggest AI Add-on would increase retention 40%. Recommend bundling.", icon: TrendingUp, color: "text-emerald-500" },
  { type: "Pricing", title: "Discount optimization", detail: "Segment analysis shows 8% discount yields optimal conversion without margin erosion.", icon: Percent, color: "text-blue-500" },
  { type: "Forecast", title: "Q1 pipeline gap detected", detail: "Current pipeline $2.7M vs $3.2M target. Need 3 additional qualified opportunities.", icon: Target, color: "text-purple-500" },
];

const synapticNodes = [
  { label: "CRM", x: 5, y: 30 }, { label: "Opportunity", x: 20, y: 15 },
  { label: "Quote", x: 38, y: 30 }, { label: "Approval", x: 52, y: 15 },
  { label: "Sales Order", x: 65, y: 30 }, { label: "Contract", x: 78, y: 15 },
  { label: "Revenue", x: 92, y: 30 }, { label: "Inventory", x: 52, y: 50 },
  { label: "Portal", x: 38, y: 50 }, { label: "Fulfillment", x: 78, y: 50 },
];

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    Draft: "bg-muted text-muted-foreground", Sent: "bg-blue-500/10 text-blue-600", Approved: "bg-emerald-500/10 text-emerald-600",
    Accepted: "bg-emerald-500/10 text-emerald-600", Expired: "bg-destructive/10 text-destructive", Rejected: "bg-destructive/10 text-destructive",
    Confirmed: "bg-emerald-500/10 text-emerald-600", "In Progress": "bg-amber-500/10 text-amber-600", Fulfilled: "bg-emerald-500/10 text-emerald-600",
    Active: "bg-emerald-500/10 text-emerald-600", Processing: "bg-blue-500/10 text-blue-600", Partial: "bg-amber-500/10 text-amber-600",
    Delivered: "bg-emerald-500/10 text-emerald-600",
  };
  return map[s] || "bg-muted text-muted-foreground";
};

const Metric = ({ icon: Icon, label, value, sub, trend }: { icon: any; label: string; value: string; sub?: string; trend?: string }) => (
  <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        {trend && <span className="text-xs text-emerald-500 font-medium">{trend}</span>}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

const SectionCard = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <Card className="border border-border/60 shadow-sm">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
        {action}
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default function SalesBuilder() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Sales Intelligence Center</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Opportunity · Quotation · Order · Revenue</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"><Search className="h-3.5 w-3.5 mr-1.5" />Search</Button>
              <Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5 mr-1.5" />Filter</Button>
              <Button size="sm" className="bg-primary text-primary-foreground"><Plus className="h-3.5 w-3.5 mr-1.5" />New Quote</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 mb-6 flex-wrap h-auto gap-1 p-1">
            {[
              ["dashboard", "Dashboard"], ["opportunities", "Opportunities"], ["quotations", "Quotations"],
              ["cpq", "CPQ Configurator"], ["approvals", "Approvals"], ["portal", "Portal Experience"],
              ["orders", "Sales Orders"], ["crm", "CRM & RevPath"], ["commerce", "Commerce"],
              ["contracts", "Contracts"], ["ai", "AI Assistant"], ["automation", "Automation"],
              ["analytics", "Analytics"], ["synaptic", "System View"],
            ].map(([val, label]) => (
              <TabsTrigger key={val} value={val} className="text-xs data-[state=active]:bg-background">{label}</TabsTrigger>
            ))}
          </TabsList>

          {/* ── Dashboard ── */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Metric icon={Target} label="Open Opportunities" value="41" sub="$2.7M pipeline" trend="+12%" />
              <Metric icon={FileText} label="Quotes In Progress" value="15" sub="$680K total" />
              <Metric icon={Clock} label="Awaiting Approval" value="4" sub="2 high-value" />
              <Metric icon={ShoppingCart} label="Sales Orders" value="28" sub="$1.4M this month" trend="+8%" />
              <Metric icon={DollarSign} label="Forecasted Revenue" value="$3.2M" sub="Q1 target" />
              <Metric icon={TrendingUp} label="Conversion Rate" value="34%" sub="Quote → Order" trend="+5%" />
              <Metric icon={Star} label="Avg Deal Size" value="$68K" sub="vs $52K last Q" trend="+31%" />
              <Metric icon={Bot} label="AI Recommendations" value="7" sub="3 high priority" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <SectionCard title="Pipeline Overview" action={<Button variant="ghost" size="sm" className="text-xs">View All</Button>}>
                <div className="space-y-3">
                  {pipelineStages.map((s) => (
                    <div key={s.name} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${s.color}`} />
                      <span className="text-sm text-foreground flex-1">{s.name}</span>
                      <Badge variant="secondary" className="text-xs">{s.count}</Badge>
                      <span className="text-xs font-medium text-muted-foreground w-16 text-right">{s.value}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Recent Quotations">
                <div className="space-y-2.5">
                  {quotations.slice(0, 4).map((q) => (
                    <div key={q.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <span className="text-xs font-medium text-foreground">{q.id}</span>
                        <p className="text-xs text-muted-foreground">{q.customer}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold">{q.total}</span>
                        <Badge className={`ml-2 text-[10px] ${statusColor(q.status)}`}>{q.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="AI Insights">
                <div className="space-y-3">
                  {aiInsights.slice(0, 3).map((ins, i) => (
                    <div key={i} className="flex gap-2.5 p-2 rounded-lg bg-muted/30">
                      <ins.icon className={`h-4 w-4 mt-0.5 shrink-0 ${ins.color}`} />
                      <div>
                        <p className="text-xs font-medium text-foreground">{ins.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{ins.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </TabsContent>

          {/* ── Opportunities ── */}
          <TabsContent value="opportunities" className="space-y-4">
            <SectionCard title="Opportunity Workspace" action={<Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />New Opportunity</Button>}>
              <div className="space-y-3">
                {opportunities.map((opp) => (
                  <div key={opp.id} className="border border-border/50 rounded-xl p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{opp.account}</span>
                          <Badge variant="outline" className="text-[10px]">{opp.id}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{opp.contact} · Close: {opp.close}</p>
                      </div>
                      <span className="text-lg font-bold text-foreground">{opp.value}</span>
                    </div>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Probability</span>
                          <span className="font-medium">{opp.probability}%</span>
                        </div>
                        <Progress value={opp.probability} className="h-1.5" />
                      </div>
                      <Badge className={statusColor(opp.stage === "Proposal" ? "Sent" : opp.stage === "Negotiation" ? "In Progress" : "Draft")}>{opp.stage}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {opp.products.map((p) => <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-primary">
                        <Zap className="h-3 w-3" />
                        <span>{opp.nextAction}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── Quotations ── */}
          <TabsContent value="quotations" className="space-y-4">
            <SectionCard title="Quotation Builder" action={<Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Create Quote</Button>}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Quote ID", "Customer", "Template", "Items", "Discount", "Total", "Expires", "Status"].map((h) => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.map((q) => (
                      <tr key={q.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-foreground">{q.id}</td>
                        <td className="py-2.5 px-3 text-foreground">{q.customer}</td>
                        <td className="py-2.5 px-3"><Badge variant="outline" className="text-[10px]">{q.template}</Badge></td>
                        <td className="py-2.5 px-3 text-muted-foreground">{q.items}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{q.discount}</td>
                        <td className="py-2.5 px-3 font-semibold">{q.total}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{q.expires}</td>
                        <td className="py-2.5 px-3"><Badge className={`text-[10px] ${statusColor(q.status)}`}>{q.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Quote Line Builder">
              <div className="border border-dashed border-border rounded-xl p-6 text-center">
                <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Select a quote to configure line items, pricing rules and discount controls</p>
                <Button variant="outline" size="sm" className="mt-3">Open Configurator</Button>
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── CPQ ── */}
          <TabsContent value="cpq" className="space-y-4">
            <SectionCard title="Product & Offer Configurator">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cpqProducts.map((p) => (
                  <div key={p.name} className="border border-border/50 rounded-xl p-4 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm text-foreground">{p.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{p.type}</Badge>
                    </div>
                    <p className="text-lg font-bold text-primary mb-3">{p.base}</p>
                    <div className="mb-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Add-ons</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.addOns.map((a) => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Bundles</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.bundles.map((b) => <Badge key={b} className="text-[10px] bg-primary/10 text-primary">{b}</Badge>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "Quantity Pricing", desc: "Tiered pricing based on volume thresholds", tiers: ["1–10: $2,400/mo", "11–50: $2,100/mo", "51+: $1,800/mo"] },
                { title: "Segment Pricing", desc: "Custom pricing by customer segment", tiers: ["Enterprise: Custom", "Mid-Market: List -10%", "Startup: List -25%"] },
                { title: "Recurring Plans", desc: "Subscription billing configurations", tiers: ["Monthly: Standard", "Annual: -15%", "Multi-year: -25%"] },
              ].map((c) => (
                <SectionCard key={c.title} title={c.title}>
                  <p className="text-xs text-muted-foreground mb-3">{c.desc}</p>
                  <div className="space-y-2">
                    {c.tiers.map((t) => (
                      <div key={t} className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-foreground">{t}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              ))}
            </div>
          </TabsContent>

          {/* ── Approvals ── */}
          <TabsContent value="approvals" className="space-y-4">
            <SectionCard title="Approval Workflow — QT-2395">
              <div className="flex items-center gap-2 overflow-x-auto py-2">
                {approvalSteps.map((step, i) => (
                  <div key={step.stage} className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                      step.status === "completed" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" :
                      step.status === "active" ? "bg-primary/10 border-primary/30 text-primary" :
                      "bg-muted border-border/50 text-muted-foreground"
                    }`}>
                      {step.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                       step.status === "active" ? <Clock className="h-3.5 w-3.5 animate-pulse" /> :
                       <div className="h-3.5 w-3.5 rounded-full border border-current" />}
                      <div>
                        <p className="font-medium">{step.stage}</p>
                        <p className="text-[10px] opacity-70">{step.user} · {step.time}</p>
                      </div>
                    </div>
                    {i < approvalSteps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Approval Rules">
              <div className="space-y-2.5">
                {[
                  { rule: "Discount > 20%", action: "Require manager approval", status: "Active" },
                  { rule: "Custom contract terms", action: "Route to legal review", status: "Active" },
                  { rule: "Deal value > $100K", action: "Require finance approval", status: "Active" },
                  { rule: "Non-standard SLA", action: "Operations review required", status: "Draft" },
                ].map((r) => (
                  <div key={r.rule} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.rule}</p>
                        <p className="text-xs text-muted-foreground">{r.action}</p>
                      </div>
                    </div>
                    <Badge className={statusColor(r.status)}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── Portal ── */}
          <TabsContent value="portal" className="space-y-4">
            <SectionCard title="Customer Portal — Quote Experience">
              <div className="border border-border/50 rounded-xl overflow-hidden">
                <div className="bg-muted/30 px-5 py-4 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Quote #QT-2395</p>
                      <h3 className="text-sm font-bold text-foreground">Enterprise Platform — Orion Systems</h3>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">Ready for Review</Badge>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><p className="text-xs text-muted-foreground">Total</p><p className="font-bold text-foreground">$67,500</p></div>
                    <div><p className="text-xs text-muted-foreground">Valid Until</p><p className="font-medium text-foreground">Mar 25, 2026</p></div>
                    <div><p className="text-xs text-muted-foreground">Items</p><p className="font-medium text-foreground">8 line items</p></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Accept Quote</Button>
                    <Button variant="outline" size="sm"><Send className="h-3.5 w-3.5 mr-1" />Request Changes</Button>
                    <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" />Download PDF</Button>
                    <Button variant="outline" size="sm"><Eye className="h-3.5 w-3.5 mr-1" />View Terms</Button>
                  </div>
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── Sales Orders ── */}
          <TabsContent value="orders" className="space-y-4">
            <SectionCard title="Sales Order Manager" action={<Badge variant="outline" className="text-xs">Quote → Order Conversion</Badge>}>
              <div className="space-y-3">
                {salesOrders.map((o) => (
                  <div key={o.id} className="border border-border/50 rounded-xl p-4 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{o.id}</span>
                        <Badge variant="outline" className="text-[10px]">{o.customer}</Badge>
                      </div>
                      <span className="text-sm font-bold">{o.total}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div><span className="text-muted-foreground">Status</span><p><Badge className={`mt-0.5 text-[10px] ${statusColor(o.status)}`}>{o.status}</Badge></p></div>
                      <div><span className="text-muted-foreground">Fulfillment</span><p><Badge className={`mt-0.5 text-[10px] ${statusColor(o.fulfillment)}`}>{o.fulfillment}</Badge></p></div>
                      <div><span className="text-muted-foreground">Payment</span><p className="font-medium text-foreground mt-0.5">{o.payment}</p></div>
                      <div><span className="text-muted-foreground">Contract</span><p className="font-medium text-primary mt-0.5">{o.contract}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── CRM & RevPath ── */}
          <TabsContent value="crm" className="space-y-4">
            <SectionCard title="Revenue Lifecycle Integration">
              <div className="flex items-center gap-2 overflow-x-auto py-3">
                {["Lead", "Opportunity", "Quote", "Sales Order", "Contract", "Revenue", "Expansion"].map((s, i, arr) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium border border-primary/20 whitespace-nowrap">{s}</div>
                    {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-primary/50 shrink-0" />}
                  </div>
                ))}
              </div>
            </SectionCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { event: "Quote Sent", effect: "Update deal stage in CRM to 'Proposal'" },
                { event: "Quote Accepted", effect: "Create sales order + update CRM to 'Closed Won'" },
                { event: "Order Confirmed", effect: "Update revenue forecast in RevPath" },
                { event: "Contract Signed", effect: "Move customer lifecycle forward + trigger expansion workflow" },
              ].map((e) => (
                <div key={e.event} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                  <Zap className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{e.event}</p>
                    <p className="text-[11px] text-muted-foreground">{e.effect}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Commerce ── */}
          <TabsContent value="commerce" className="space-y-4">
            <SectionCard title="Commerce Integration">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { module: "Inventory & Orders", icon: Package, connections: ["Stock-aware quotes", "Accepted order reserves inventory", "Real-time availability in CPQ"] },
                  { module: "POS Builder", icon: Monitor, connections: ["Finalize order at POS", "Apply quote pricing at terminal", "Cross-channel order sync"] },
                  { module: "Pricing Engine", icon: Percent, connections: ["Dynamic pricing rules", "Segment-based discounts", "Promotional pricing in quotes"] },
                ].map((m) => (
                  <div key={m.module} className="border border-border/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <m.icon className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">{m.module}</h3>
                    </div>
                    <div className="space-y-2">
                      {m.connections.map((c) => (
                        <div key={c} className="flex items-center gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                          <span className="text-muted-foreground">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── Contracts ── */}
          <TabsContent value="contracts" className="space-y-4">
            <SectionCard title="Programmable Contract Integration">
              <div className="space-y-3">
                {[
                  { trigger: "Quote accepted", action: "Generate contract draft in Contract Studio", icon: FileText },
                  { trigger: "Milestone-based deal", action: "Link to programmable clauses with payment triggers", icon: Layers },
                  { trigger: "Deposit required", action: "Create payment condition and escrow rule", icon: DollarSign },
                  { trigger: "SLA agreement", action: "Bind fulfillment SLA terms to delivery module", icon: Shield },
                ].map((c) => (
                  <div key={c.trigger} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <c.icon className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">{c.trigger}</p>
                      <p className="text-[11px] text-muted-foreground">{c.action}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── AI Assistant ── */}
          <TabsContent value="ai" className="space-y-4">
            <SectionCard title="AI Sales Assistant — MCP Powered" action={<Badge className="bg-primary/10 text-primary text-[10px]">MCP Integration Hub</Badge>}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Generate Quote Draft", desc: "AI creates a complete quotation based on opportunity data and historical patterns", icon: FileText },
                  { title: "Bundle Recommendations", desc: "Suggest optimal product bundles based on customer segment and usage data", icon: Package },
                  { title: "Pricing Optimization", desc: "Analyze win rates and margins to recommend optimal pricing strategies", icon: Percent },
                  { title: "Account History Summary", desc: "Summarize all interactions, purchases and opportunities for any account", icon: Users },
                  { title: "Deal Risk Detection", desc: "Identify deals at risk based on activity patterns and engagement signals", icon: AlertTriangle },
                  { title: "Next Best Action", desc: "Recommend the highest-impact action for each active opportunity", icon: Target },
                  { title: "Quote Change Explanation", desc: "Explain differences between quote versions in plain language", icon: Eye },
                  { title: "Follow-up Generator", desc: "Generate personalized follow-up messages based on deal context", icon: Send },
                ].map((cap) => (
                  <div key={cap.title} className="flex gap-3 p-3 rounded-lg border border-border/50 hover:shadow-md transition-all">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <cap.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{cap.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{cap.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="AI Insights">
              <div className="space-y-3">
                {aiInsights.map((ins, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <ins.icon className={`h-4 w-4 mt-0.5 shrink-0 ${ins.color}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{ins.type}</Badge>
                        <span className="text-xs font-medium text-foreground">{ins.title}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{ins.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── Automation ── */}
          <TabsContent value="automation" className="space-y-4">
            <SectionCard title="Sales Automation Workflows" action={<Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />New Workflow</Button>}>
              <div className="space-y-2.5">
                {automationWorkflows.map((w) => (
                  <div key={w.trigger} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Zap className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-xs font-medium text-foreground">{w.trigger}</p>
                        <p className="text-[11px] text-muted-foreground">{w.action}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{w.runs} runs</span>
                      <Badge className={statusColor(w.status)}>{w.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>

          {/* ── Analytics ── */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Metric icon={TrendingUp} label="Quote → Order" value="34%" sub="Conversion rate" trend="+5%" />
              <Metric icon={Clock} label="Sales Cycle" value="18 days" sub="Average duration" trend="-3 days" />
              <Metric icon={DollarSign} label="Avg Deal Size" value="$68K" sub="This quarter" trend="+31%" />
              <Metric icon={Percent} label="Avg Discount" value="9.2%" sub="Across all quotes" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SectionCard title="Revenue by Salesperson">
                {["Alex Torres — $420K", "Maria Santos — $380K", "David Chen — $315K", "Lisa Park — $290K"].map((r) => (
                  <div key={r} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <span className="text-xs text-foreground">{r.split(" — ")[0]}</span>
                    <span className="text-xs font-semibold">{r.split(" — ")[1]}</span>
                  </div>
                ))}
              </SectionCard>
              <SectionCard title="Win/Loss Analysis">
                {[
                  { label: "Won", pct: 34, color: "bg-emerald-500" },
                  { label: "Lost — Price", pct: 22, color: "bg-red-400" },
                  { label: "Lost — Competitor", pct: 18, color: "bg-amber-500" },
                  { label: "Lost — No Decision", pct: 14, color: "bg-muted-foreground" },
                  { label: "Open", pct: 12, color: "bg-blue-500" },
                ].map((w) => (
                  <div key={w.label} className="flex items-center gap-3 py-1.5">
                    <div className={`w-2 h-2 rounded-full ${w.color}`} />
                    <span className="text-xs text-foreground flex-1">{w.label}</span>
                    <span className="text-xs font-medium">{w.pct}%</span>
                  </div>
                ))}
              </SectionCard>
            </div>
          </TabsContent>

          {/* ── Synaptic ── */}
          <TabsContent value="synaptic" className="space-y-4">
            <SectionCard title="Synaptic System View — Sales Module Connections">
              <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-8 min-h-[320px] overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  {[[0,2],[1,2],[2,3],[3,4],[4,5],[5,6],[2,8],[4,7],[5,9]].map(([from, to], i) => {
                    const f = synapticNodes[from]; const t = synapticNodes[to];
                    return <line key={i} x1={`${f.x}%`} y1={`${f.y + 5}%`} x2={`${t.x}%`} y2={`${t.y + 5}%`} stroke="rgba(139,92,246,0.3)" strokeWidth="2" />;
                  })}
                </svg>
                {synapticNodes.map((n) => (
                  <div key={n.label} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${n.x}%`, top: `${n.y + 5}%` }}>
                    <div className="px-3 py-1.5 rounded-lg bg-slate-700/80 border border-purple-500/30 text-[11px] font-medium text-purple-200 shadow-lg shadow-purple-500/10 whitespace-nowrap">{n.label}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
