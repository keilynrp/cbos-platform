import { useState } from "react";
import {
  User, CreditCard, Wallet, Building2, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Plus, Download, Filter, MoreHorizontal,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Eye, EyeOff,
  ChevronRight, Bell, Shield, Clock, Landmark, PiggyBank,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ── Mock Data ──────────────────────────────────────────────────────────
const accountProfile = {
  name: "Acme Corporation",
  email: "billing@acme.corp",
  plan: "Business Pro",
  status: "active" as const,
  members: 24,
  since: "Jan 2024",
  monthlySpend: 4280,
  prevMonthSpend: 3950,
};

const teamMembers = [
  { name: "Sarah Chen", role: "Owner", email: "sarah@acme.corp", status: "active" },
  { name: "Marcus Reid", role: "Admin", email: "marcus@acme.corp", status: "active" },
  { name: "Lena Okafor", role: "Finance", email: "lena@acme.corp", status: "active" },
  { name: "James Patel", role: "Member", email: "james@acme.corp", status: "invited" },
];

const invoices = [
  { id: "INV-2024-032", date: "Mar 1, 2024", amount: 4280, status: "paid", items: 12 },
  { id: "INV-2024-028", date: "Feb 1, 2024", amount: 3950, status: "paid", items: 11 },
  { id: "INV-2024-019", date: "Jan 1, 2024", amount: 3720, status: "paid", items: 10 },
  { id: "INV-2023-048", date: "Dec 1, 2023", amount: 3600, status: "paid", items: 9 },
  { id: "INV-2023-041", date: "Nov 1, 2023", amount: 3450, status: "paid", items: 9 },
];

const paymentMethods = [
  { type: "Visa", last4: "4242", exp: "08/26", default: true },
  { type: "Mastercard", last4: "8831", exp: "12/25", default: false },
];

const billingLineItems = [
  { name: "Platform License (24 seats)", amount: 2400, category: "Subscription" },
  { name: "AI Agent Usage", amount: 680, category: "Usage" },
  { name: "Storage (420 GB)", amount: 210, category: "Usage" },
  { name: "API Calls (1.2M)", amount: 480, category: "Usage" },
  { name: "Premium Support", amount: 350, category: "Add-on" },
  { name: "Custom Domain", amount: 160, category: "Add-on" },
];

const budgets = [
  { name: "Engineering", allocated: 2000, spent: 1640, owner: "Marcus R.", trend: "up" as const },
  { name: "Marketing", allocated: 1200, spent: 980, owner: "Lena O.", trend: "down" as const },
  { name: "Operations", allocated: 800, spent: 720, owner: "Sarah C.", trend: "up" as const },
  { name: "AI & Analytics", allocated: 600, spent: 540, owner: "James P.", trend: "up" as const },
  { name: "Infrastructure", allocated: 500, spent: 280, owner: "Marcus R.", trend: "down" as const },
];

const spendAlerts = [
  { dept: "Engineering", message: "82% of monthly budget used", severity: "warning" as const },
  { dept: "Operations", message: "90% of monthly budget used", severity: "critical" as const },
  { dept: "AI & Analytics", message: "90% of monthly budget used", severity: "critical" as const },
];

const bankAccounts = [
  { name: "Chase Business Checking", number: "****6789", balance: 142580, type: "Checking", connected: true },
  { name: "Chase Business Savings", number: "****3421", balance: 89200, type: "Savings", connected: true },
  { name: "Mercury Operating", number: "****7744", balance: 56340, type: "Checking", connected: true },
];

const recentTransactions = [
  { date: "Mar 5", desc: "Lovable Platform — March", amount: -4280, account: "Chase Checking", status: "completed" },
  { date: "Mar 4", desc: "Client Payment — Nexus Inc", amount: 12500, account: "Mercury Operating", status: "completed" },
  { date: "Mar 3", desc: "AWS Infrastructure", amount: -1840, account: "Chase Checking", status: "completed" },
  { date: "Mar 2", desc: "Stripe Payout", amount: 8900, account: "Mercury Operating", status: "pending" },
  { date: "Mar 1", desc: "Google Workspace", amount: -288, account: "Chase Checking", status: "completed" },
  { date: "Feb 28", desc: "Client Payment — Orbit Labs", amount: 7200, account: "Mercury Operating", status: "completed" },
  { date: "Feb 27", desc: "Figma Enterprise", amount: -540, account: "Chase Checking", status: "completed" },
];

// ── Helpers ─────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

const statusColor = (s: string) => {
  switch (s) {
    case "paid": case "active": case "completed": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "pending": case "invited": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "overdue": case "failed": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
};

const severityIcon = (s: string) => {
  if (s === "critical") return <XCircle className="h-4 w-4 text-destructive" />;
  return <AlertTriangle className="h-4 w-4 text-amber-500" />;
};

// ── Component ───────────────────────────────────────────────────────────
export default function AccountManagement() {
  const [showBalances, setShowBalances] = useState(true);
  const spendChange = ((accountProfile.monthlySpend - accountProfile.prevMonthSpend) / accountProfile.prevMonthSpend * 100).toFixed(1);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Billing, budgets, and financial overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Budget</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly Spend</p>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{fmt(accountProfile.monthlySpend)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{spendChange}%</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Budget</p>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{fmt(budgets.reduce((s, b) => s + b.allocated, 0))}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <span className="text-muted-foreground">{budgets.length} active budgets</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bank Balance</p>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{showBalances ? fmt(bankAccounts.reduce((s, a) => s + a.balance, 0)) : "••••••"}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <span className="text-muted-foreground">{bankAccounts.length} connected accounts</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team</p>
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{accountProfile.members}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <span className="text-muted-foreground">{accountProfile.plan} plan since {accountProfile.since}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="billing">Billing & Invoices</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="bank">Bank Integration</TabsTrigger>
        </TabsList>

        {/* ─── Overview ─────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Account info */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Account Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">AC</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">{accountProfile.name}</p>
                    <p className="text-sm text-muted-foreground">{accountProfile.email}</p>
                  </div>
                  <Badge className={`ml-auto ${statusColor("active")}`}>Active</Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-muted-foreground text-xs">Plan</p><p className="font-medium">{accountProfile.plan}</p></div>
                  <div><p className="text-muted-foreground text-xs">Members</p><p className="font-medium">{accountProfile.members}</p></div>
                  <div><p className="text-muted-foreground text-xs">Since</p><p className="font-medium">{accountProfile.since}</p></div>
                  <div><p className="text-muted-foreground text-xs">Next Billing</p><p className="font-medium">Apr 1, 2024</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Spend Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {spendAlerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    {severityIcon(a.severity)}
                    <div>
                      <p className="text-sm font-medium">{a.dept}</p>
                      <p className="text-xs text-muted-foreground">{a.message}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Team */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Team Members</CardTitle>
                <Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Invite</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((m) => (
                    <TableRow key={m.email}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{m.name.split(" ").map(w => w[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.role}</Badge></TableCell>
                      <TableCell><Badge className={`text-xs ${statusColor(m.status)}`}>{m.status}</Badge></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Billing ──────────────────────────────────────────── */}
        <TabsContent value="billing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Current period breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Current Period Breakdown</CardTitle>
                <CardDescription>March 2024 billing cycle</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {billingLineItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] w-20 justify-center">{item.category}</Badge>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">{fmt(item.amount)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between pt-1">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">{fmt(billingLineItems.reduce((s, i) => s + i.amount, 0))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment methods */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Payment Methods</CardTitle>
                  <Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Add</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentMethods.map((pm, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{pm.type} ····{pm.last4}</p>
                      <p className="text-xs text-muted-foreground">Expires {pm.exp}</p>
                    </div>
                    {pm.default && <Badge className="text-[10px] bg-primary/10 text-primary">Default</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Invoice history */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Invoice History</CardTitle>
                <Button variant="outline" size="sm"><Filter className="h-3 w-3 mr-1" />Filter</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-sm">{inv.id}</TableCell>
                      <TableCell className="text-sm">{inv.date}</TableCell>
                      <TableCell className="text-sm">{inv.items} line items</TableCell>
                      <TableCell className="text-sm font-medium">{fmt(inv.amount)}</TableCell>
                      <TableCell><Badge className={`text-xs ${statusColor(inv.status)}`}>{inv.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-xs"><Download className="h-3 w-3 mr-1" />PDF</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Budgets ──────────────────────────────────────────── */}
        <TabsContent value="budgets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {budgets.map((b) => {
              const pct = Math.round((b.spent / b.allocated) * 100);
              const isHigh = pct >= 80;
              return (
                <Card key={b.name} className={isHigh ? "border-destructive/30" : ""}>
                  <CardContent className="pt-5 pb-4 px-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{b.name}</p>
                        <p className="text-xs text-muted-foreground">Managed by {b.owner}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {b.trend === "up" ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-blue-500" />}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-2xl font-bold">{fmt(b.spent)}</span>
                        <span className="text-sm text-muted-foreground">of {fmt(b.allocated)}</span>
                      </div>
                      <Progress value={pct} className={`h-2 ${isHigh ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`} />
                      <p className={`text-xs mt-1 font-medium ${isHigh ? "text-destructive" : "text-muted-foreground"}`}>{pct}% utilized</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs">Adjust</Button>
                      <Button variant="outline" size="sm" className="flex-1 text-xs">Details</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Add budget card */}
            <Card className="border-dashed flex items-center justify-center min-h-[200px] cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="text-center">
                <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Create New Budget</p>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Bank ─────────────────────────────────────────────── */}
        <TabsContent value="bank" className="space-y-4">
          <div className="flex items-center justify-between">
            <div />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowBalances(!showBalances)}>
                {showBalances ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showBalances ? "Hide" : "Show"} Balances
              </Button>
              <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Sync</Button>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Connect Bank</Button>
            </div>
          </div>

          {/* Bank accounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bankAccounts.map((acc) => (
              <Card key={acc.number}>
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{acc.number} · {acc.type}</p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold">{showBalances ? fmt(acc.balance) : "••••••"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Last synced 2 min ago</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Transactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <Button variant="outline" size="sm"><Filter className="h-3 w-3 mr-1" />Filter</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{tx.date}</TableCell>
                      <TableCell className="text-sm font-medium">{tx.desc}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.account}</TableCell>
                      <TableCell className={`text-sm font-medium ${tx.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                        {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)}
                      </TableCell>
                      <TableCell><Badge className={`text-xs ${statusColor(tx.status)}`}>{tx.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
