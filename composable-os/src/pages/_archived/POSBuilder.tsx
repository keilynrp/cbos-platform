import { useState } from "react";
import {
  Monitor, ShoppingCart, Package, Users, GitBranch, CreditCard, Smartphone,
  Globe, Bot, Zap, BarChart3, TrendingUp, DollarSign, Receipt, ArrowUpRight,
  ArrowDownRight, Wifi, WifiOff, Battery, Search, Plus, GripVertical,
  CheckCircle2, AlertTriangle, Clock, Star, Tag, Percent, RefreshCw,
  UserCheck, Heart, Target, Layers, MapPin, Printer, ScanBarcode,
  Eye, ChevronRight, Play, ArrowRight, Shield, Award, Sparkles,
  LayoutGrid, List, Filter, MoreHorizontal, Settings, Hash, XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

/* ─── mock data ─── */
const salesToday = [
  { hour: "8am", sales: 420 }, { hour: "9am", sales: 980 },
  { hour: "10am", sales: 1540 }, { hour: "11am", sales: 2100 },
  { hour: "12pm", sales: 3200 }, { hour: "1pm", sales: 2800 },
  { hour: "2pm", sales: 2400 }, { hour: "3pm", sales: 1900 },
  { hour: "4pm", sales: 2600 }, { hour: "5pm", sales: 3100 },
];

const terminalData = [
  { name: "Terminal 1", transactions: 142, revenue: 8420 },
  { name: "Terminal 2", transactions: 118, revenue: 7230 },
  { name: "Terminal 3", transactions: 96, revenue: 5890 },
  { name: "Terminal 4", transactions: 134, revenue: 9100 },
];

const topProducts = [
  { name: "Premium Blend Coffee", units: 234, revenue: 1638, trend: 12 },
  { name: "Organic Matcha Latte", units: 189, revenue: 1512, trend: 8 },
  { name: "Avocado Toast Deluxe", units: 156, revenue: 2028, trend: -3 },
  { name: "Signature Smoothie Bowl", units: 142, revenue: 1704, trend: 15 },
  { name: "Artisan Sourdough Loaf", units: 128, revenue: 896, trend: 5 },
];

const paymentMix = [
  { name: "Card", value: 58, color: "hsl(var(--primary))" },
  { name: "Digital Wallet", value: 24, color: "hsl(var(--accent))" },
  { name: "Cash", value: 14, color: "hsl(var(--cbs-green))" },
  { name: "Split", value: 4, color: "hsl(var(--cbs-amber))" },
];

const revPathStages = [
  { stage: "Traffic", count: 12400, rate: "100%" },
  { stage: "Store Visit", count: 3720, rate: "30%" },
  { stage: "POS Transaction", count: 1488, rate: "40%" },
  { stage: "Repeat Purchase", count: 595, rate: "40%" },
  { stage: "Loyalty / Upsell", count: 238, rate: "40%" },
];

const weeklyRevenue = [
  { day: "Mon", revenue: 12400, orders: 186 },
  { day: "Tue", revenue: 14200, orders: 212 },
  { day: "Wed", revenue: 11800, orders: 178 },
  { day: "Thu", revenue: 15600, orders: 234 },
  { day: "Fri", revenue: 18900, orders: 284 },
  { day: "Sat", revenue: 22400, orders: 336 },
  { day: "Sun", revenue: 19800, orders: 297 },
];

const catalogProducts = [
  { id: 1, name: "Premium Blend Coffee", sku: "COF-001", price: 6.99, stock: 342, category: "Beverages", status: "synced" },
  { id: 2, name: "Organic Matcha Latte", sku: "MAT-002", price: 7.99, stock: 218, category: "Beverages", status: "synced" },
  { id: 3, name: "Avocado Toast Deluxe", sku: "AVT-003", price: 12.99, stock: 45, category: "Food", status: "low_stock" },
  { id: 4, name: "Signature Smoothie Bowl", sku: "SMB-004", price: 11.99, stock: 78, category: "Food", status: "synced" },
  { id: 5, name: "Artisan Sourdough Loaf", sku: "ASD-005", price: 6.99, stock: 0, category: "Bakery", status: "out_of_stock" },
  { id: 6, name: "Cold Brew Concentrate", sku: "CBR-006", price: 14.99, stock: 156, category: "Beverages", status: "synced" },
];

const terminals = [
  { id: "T-001", name: "Main Counter", location: "Downtown Store", status: "online", battery: 100, lastActive: "Now", cashier: "Sarah M.", shift: "Morning" },
  { id: "T-002", name: "Express Lane", location: "Downtown Store", status: "online", battery: 87, lastActive: "2 min ago", cashier: "James K.", shift: "Morning" },
  { id: "T-003", name: "Pop-up Kiosk", location: "Market Square", status: "offline", battery: 12, lastActive: "4 hrs ago", cashier: "—", shift: "—" },
  { id: "T-004", name: "Event Station", location: "Convention Center", status: "online", battery: 94, lastActive: "Now", cashier: "Maria L.", shift: "Afternoon" },
  { id: "T-005", name: "Drive-Through", location: "Highway Branch", status: "idle", battery: 100, lastActive: "45 min ago", cashier: "—", shift: "—" },
];

const automationWorkflows = [
  { name: "Post-Transaction CRM Update", trigger: "Transaction completed", actions: ["Update CRM profile", "Add purchase to history", "Recalculate lead score"], status: "active", runs: 1248 },
  { name: "Low Stock Alert", trigger: "Product stock < 10", actions: ["Notify inventory team", "Flag product in catalog", "Suggest reorder"], status: "active", runs: 34 },
  { name: "Loyalty Reward Trigger", trigger: "Repeat purchase threshold", actions: ["Issue loyalty points", "Send reward notification", "Update persona"], status: "active", runs: 567 },
  { name: "Refund Review", trigger: "Refund issued", actions: ["Flag finance review", "Update CRM notes", "Log reason code"], status: "paused", runs: 89 },
  { name: "Event Ticket Sale", trigger: "Event ticket sold at POS", actions: ["Update attendee status", "Send confirmation", "Sync with Event Builder"], status: "active", runs: 423 },
];

/* ─── component ─── */
export default function POSBuilder() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [cartItems] = useState([
    { name: "Premium Blend Coffee", qty: 2, price: 6.99 },
    { name: "Avocado Toast Deluxe", qty: 1, price: 12.99 },
    { name: "Organic Matcha Latte", qty: 1, price: 7.99 },
  ]);

  const cartTotal = cartItems.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Monitor className="h-4 w-4 text-primary-foreground" />
              </div>
              Intelligent POS Builder
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Design, manage and optimize point-of-sale experiences across your commerce ecosystem</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1"><Wifi className="h-3 w-3 text-green-500" />4 Terminals Online</Badge>
            <Badge variant="outline" className="gap-1"><DollarSign className="h-3 w-3" />$24,640 Today</Badge>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Terminal</Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 mb-6">
            {[
              { v: "dashboard", icon: BarChart3, l: "Intelligence Center" },
              { v: "builder", icon: LayoutGrid, l: "POS Builder" },
              { v: "catalog", icon: Package, l: "Catalog Sync" },
              { v: "crm", icon: Users, l: "CRM" },
              { v: "revpath", icon: GitBranch, l: "RevPath" },
              { v: "checkout", icon: CreditCard, l: "Checkout" },
              { v: "terminals", icon: Smartphone, l: "Terminals" },
              { v: "portals", icon: Globe, l: "Portals" },
              { v: "ai", icon: Bot, l: "AI Assistant" },
              { v: "automations", icon: Zap, l: "Automations" },
              { v: "analytics", icon: BarChart3, l: "Analytics" },
            ].map((t) => (
              <TabsTrigger key={t.v} value={t.v} className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <t.icon className="h-3.5 w-3.5" />{t.l}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ═══ DASHBOARD ═══ */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Today's Sales", value: "$24,640", change: "+12.4%", up: true, icon: DollarSign },
                { label: "Transactions", value: "490", change: "+8.2%", up: true, icon: Receipt },
                { label: "Avg Order Value", value: "$50.28", change: "+3.1%", up: true, icon: TrendingUp },
                { label: "Customer ID Rate", value: "73%", change: "-2.1%", up: false, icon: UserCheck },
              ].map((kpi) => (
                <Card key={kpi.label} className="border-border/50">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <kpi.icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{kpi.value}</div>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${kpi.up ? "text-green-600" : "text-red-500"}`}>
                      {kpi.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {kpi.change} vs yesterday
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Sales Today</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={salesToday}>
                      <defs>
                        <linearGradient id="posSalesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" fill="url(#posSalesGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Payment Mix</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={paymentMix} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                        {paymentMix.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {paymentMix.map((p) => (
                      <div key={p.name} className="flex items-center gap-2 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                        <span className="text-muted-foreground">{p.name}</span>
                        <span className="ml-auto font-semibold">{p.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Transactions by Terminal</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={terminalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="transactions" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Products</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {topProducts.map((p, i) => (
                        <div key={p.name} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.units} units</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">${p.revenue.toLocaleString()}</div>
                            <div className={`text-xs flex items-center gap-0.5 ${p.trend > 0 ? "text-green-600" : "text-red-500"}`}>
                              {p.trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {Math.abs(p.trend)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1">AI Recommendations</h4>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p>• Terminal T-003 has been offline for 4 hours — consider restarting or reassigning staff.</p>
                      <p>• Avocado Toast Deluxe stock is low (45 units). Reorder recommended before weekend rush.</p>
                      <p>• Upsell "Cold Brew + Pastry" combo is converting at 34% — consider promoting on all terminals.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {terminals.slice(0, 4).map((t) => (
                <Card key={t.id} className="border-border/50">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-muted-foreground">{t.id}</span>
                      <Badge variant={t.status === "online" ? "default" : t.status === "idle" ? "secondary" : "destructive"} className="text-[10px] h-5">
                        {t.status}
                      </Badge>
                    </div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.location}</div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Battery className="h-3 w-3" />{t.battery}%
                      <span className="mx-1">•</span>
                      {t.status === "online" ? <Wifi className="h-3 w-3 text-green-500" /> : <WifiOff className="h-3 w-3 text-red-500" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ═══ POS BUILDER ═══ */}
          <TabsContent value="builder" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Screen Components</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {["Product Grid", "Category Nav", "Quick Actions", "Cart Panel", "Checkout Flow", "Payment Panel", "Receipt View", "Return/Refund"].map((c) => (
                      <div key={c} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-muted/30 cursor-grab hover:border-primary/30 hover:bg-primary/5 transition-colors">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium">{c}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Layout Presets</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {["Retail Standard", "Quick Service", "Event Kiosk", "Pop-up Minimal"].map((p) => (
                      <Button key={p} variant="outline" size="sm" className="w-full justify-start text-xs gap-2">
                        <Layers className="h-3.5 w-3.5" />{p}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="border-border/50 h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">POS Screen Preview</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs">Tablet</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">Desktop</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">Mobile</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-border rounded-xl bg-muted/20 p-4 min-h-[500px]">
                      {/* Category bar */}
                      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                        {["All", "Beverages", "Food", "Bakery", "Specials"].map((c, i) => (
                          <Badge key={c} variant={i === 0 ? "default" : "secondary"} className="cursor-pointer whitespace-nowrap">{c}</Badge>
                        ))}
                      </div>
                      {/* Product grid */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {catalogProducts.slice(0, 6).map((p) => (
                          <div key={p.id} className="rounded-lg border border-border/50 bg-card p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all">
                            <div className="h-16 rounded-md bg-gradient-to-br from-primary/10 to-accent/10 mb-2 flex items-center justify-center">
                              <Package className="h-6 w-6 text-primary/40" />
                            </div>
                            <div className="text-xs font-medium truncate">{p.name}</div>
                            <div className="text-xs font-bold text-primary mt-0.5">${p.price}</div>
                          </div>
                        ))}
                      </div>
                      {/* Quick actions */}
                      <div className="flex gap-2 mb-4">
                        {["Discount", "Promo Code", "Gift Card", "Custom Item"].map((a) => (
                          <Button key={a} variant="outline" size="sm" className="text-xs h-8">{a}</Button>
                        ))}
                      </div>
                      {/* Cart summary */}
                      <div className="rounded-lg border border-border/50 bg-card p-3">
                        <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                          <ShoppingCart className="h-3.5 w-3.5" /> Cart ({cartItems.length} items)
                        </div>
                        {cartItems.map((item) => (
                          <div key={item.name} className="flex items-center justify-between text-xs py-1.5 border-t border-border/30">
                            <span>{item.qty}× {item.name}</span>
                            <span className="font-medium">${(item.qty * item.price).toFixed(2)}</span>
                          </div>
                        ))}
                        <Separator className="my-2" />
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span>Total</span>
                          <span className="text-primary">${cartTotal.toFixed(2)}</span>
                        </div>
                        <Button className="w-full mt-3 text-xs h-9">Proceed to Checkout</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ═══ CATALOG SYNC ═══ */}
          <TabsContent value="catalog" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Product & Catalog Sync</h3>
                <p className="text-sm text-muted-foreground">Centralized catalog connected to your ERP product database</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1"><RefreshCw className="h-3.5 w-3.5" />Sync Now</Button>
                <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" />Add Product</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Total Products", value: "1,248", icon: Package },
                { label: "Synced", value: "1,203", icon: CheckCircle2 },
                { label: "Low Stock", value: "23", icon: AlertTriangle },
                { label: "Active Promos", value: "8", icon: Tag },
              ].map((s) => (
                <Card key={s.label} className="border-border/50">
                  <CardContent className="pt-4 pb-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <s.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-lg font-bold">{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Catalog Items</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Search products..." className="h-8 pl-8 text-xs w-56" />
                    </div>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Filter className="h-3 w-3" />Filter</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-6 gap-4 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground">
                    <span>Product</span><span>SKU</span><span>Category</span><span>Price</span><span>Stock</span><span>Status</span>
                  </div>
                  {catalogProducts.map((p) => (
                    <div key={p.id} className="grid grid-cols-6 gap-4 px-4 py-3 border-t border-border/30 text-xs items-center hover:bg-muted/20 transition-colors">
                      <span className="font-medium">{p.name}</span>
                      <span className="font-mono text-muted-foreground">{p.sku}</span>
                      <span><Badge variant="secondary" className="text-[10px]">{p.category}</Badge></span>
                      <span className="font-semibold">${p.price}</span>
                      <span className={p.stock === 0 ? "text-red-500 font-semibold" : p.stock < 50 ? "text-amber-500 font-semibold" : ""}>{p.stock}</span>
                      <Badge variant={p.status === "synced" ? "default" : p.status === "low_stock" ? "secondary" : "destructive"} className="text-[10px] w-fit">
                        {p.status === "synced" ? "Synced" : p.status === "low_stock" ? "Low Stock" : "Out of Stock"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["Pricing Rules", "Tax Configuration", "Promotions"].map((section) => (
                <Card key={section} className="border-border/50">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{section}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-md border border-border/30 bg-muted/20 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-muted-foreground">{section} rule #{i} active</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ═══ CRM INTEGRATION ═══ */}
          <TabsContent value="crm" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Customer Lookup</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search by email, phone, loyalty ID..." className="pl-8 text-xs" />
                  </div>
                  <div className="space-y-2">
                    {["jessica.hall@example.com", "michael.chen@startup.io", "loyalty:VIP-4829"].map((q) => (
                      <div key={q} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-muted/20 cursor-pointer hover:border-primary/30 transition-colors">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span className="text-xs">{q}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">CRM Profile — Jessica Hall</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      {[
                        { label: "Email", value: "jessica.hall@example.com" },
                        { label: "Phone", value: "+1 (555) 234-8901" },
                        { label: "Loyalty ID", value: "VIP-4829" },
                        { label: "Persona", value: "Premium Enthusiast" },
                      ].map((f) => (
                        <div key={f.label}>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</div>
                          <div className="text-sm font-medium">{f.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="text-xs text-muted-foreground mb-1">Lead Score</div>
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold text-primary">87</div>
                          <Progress value={87} className="flex-1 h-2" />
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="text-xs text-muted-foreground mb-1">Lifetime Value</div>
                        <div className="text-xl font-bold">$4,280</div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="gap-1"><Star className="h-3 w-3" />VIP</Badge>
                        <Badge variant="secondary" className="gap-1"><Heart className="h-3 w-3" />Loyal</Badge>
                        <Badge variant="outline">42 visits</Badge>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />
                  <div className="text-xs font-semibold mb-2">Recent Purchases</div>
                  <div className="space-y-2">
                    {[
                      { date: "Today", items: "Premium Blend Coffee ×2, Matcha Latte", total: "$21.97" },
                      { date: "Mar 6", items: "Smoothie Bowl, Sourdough Loaf", total: "$18.98" },
                      { date: "Mar 3", items: "Cold Brew Concentrate ×2", total: "$29.98" },
                    ].map((p) => (
                      <div key={p.date} className="flex items-center justify-between p-2 rounded-md bg-muted/20 text-xs">
                        <div>
                          <span className="text-muted-foreground">{p.date}</span>
                          <span className="mx-2">—</span>
                          <span>{p.items}</span>
                        </div>
                        <span className="font-semibold">{p.total}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">POS → CRM Automations</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { trigger: "New Purchase", action: "Update CRM profile & purchase history", active: true },
                    { trigger: "Customer Identified", action: "Attach order to CRM contact, sync persona", active: true },
                    { trigger: "High-Value Customer Detected", action: "Trigger VIP workflow & notify account manager", active: true },
                  ].map((a) => (
                    <div key={a.trigger} className="p-3 rounded-lg border border-border/50 bg-muted/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold">{a.trigger}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{a.action}</p>
                      <Badge variant="default" className="mt-2 text-[10px]">Active</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ REVPATH ═══ */}
          <TabsContent value="revpath" className="space-y-6">
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue Path — POS Commerce Funnel</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {revPathStages.map((s, i) => (
                    <div key={s.stage} className="flex items-center gap-2">
                      <div className={`px-4 py-3 rounded-xl border text-center min-w-[140px] ${i === 2 ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/50"}`}>
                        <div className="text-lg font-bold">{s.count.toLocaleString()}</div>
                        <div className="text-xs font-medium">{s.stage}</div>
                        <div className="text-[10px] text-muted-foreground">{s.rate} conv.</div>
                      </div>
                      {i < revPathStages.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Repeat Purchase Rate", value: "40%", icon: RefreshCw },
                { label: "Campaign Influence", value: "28%", icon: Target },
                { label: "Revenue by Segment", value: "$18.4k", icon: Users },
                { label: "Visit-to-Transaction", value: "40%", icon: TrendingUp },
              ].map((m) => (
                <Card key={m.label} className="border-border/50">
                  <CardContent className="pt-4 pb-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                      <m.icon className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <div className="text-lg font-bold">{m.value}</div>
                      <div className="text-xs text-muted-foreground">{m.label}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Weekly Revenue & Orders</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weeklyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="revenue" name="Revenue ($)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="orders" name="Orders" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ CHECKOUT ═══ */}
          <TabsContent value="checkout" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Checkout — Cashier View</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-primary/50" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">Qty: {item.qty} × ${item.price}</div>
                          </div>
                        </div>
                        <div className="text-sm font-bold">${(item.qty * item.price).toFixed(2)}</div>
                      </div>
                    ))}

                    <Separator />
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tax (8.5%)</span><span>${(cartTotal * 0.085).toFixed(2)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-green-600">Promo: WELCOME10</span><span className="text-green-600">-${(cartTotal * 0.1).toFixed(2)}</span></div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-primary">${(cartTotal * 1.085 * 0.9).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Payment Methods</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { method: "Card", icon: CreditCard, desc: "Tap, chip or swipe" },
                      { method: "Cash", icon: DollarSign, desc: "Cash payment" },
                      { method: "Digital Wallet", icon: Smartphone, desc: "Apple Pay, Google Pay" },
                      { method: "Split Payment", icon: Layers, desc: "Multiple methods" },
                    ].map((pm) => (
                      <div key={pm.method} className="p-4 rounded-xl border border-border/50 bg-muted/20 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all text-center">
                        <pm.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                        <div className="text-sm font-semibold">{pm.method}</div>
                        <div className="text-[10px] text-muted-foreground">{pm.desc}</div>
                      </div>
                    ))}
                  </div>

                  <Separator />
                  <div className="space-y-2">
                    <div className="relative">
                      <Tag className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Enter promo code..." className="pl-8 text-xs" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1"><Percent className="h-3.5 w-3.5" />Apply Discount</Button>
                      <Button variant="outline" size="sm" className="flex-1 text-xs gap-1"><RefreshCw className="h-3.5 w-3.5" />Refund</Button>
                    </div>
                  </div>

                  <Button className="w-full h-12 text-sm font-semibold gap-2">
                    <CreditCard className="h-4 w-4" />Complete Transaction — ${(cartTotal * 1.085 * 0.9).toFixed(2)}
                  </Button>

                  <Card className="border-border/30 bg-muted/20">
                    <CardContent className="pt-3 pb-3 text-center">
                      <Receipt className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                      <div className="text-xs text-muted-foreground">Receipt will be sent via email or printed</div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ TERMINALS ═══ */}
          <TabsContent value="terminals" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Terminal & Device Management</h3>
                <p className="text-sm text-muted-foreground">Monitor and manage POS terminals, cashiers and peripherals</p>
              </div>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Register Terminal</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {terminals.map((t) => (
                <Card key={t.id} className={`border-border/50 ${t.status === "offline" ? "opacity-70" : ""}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-muted-foreground">{t.id}</span>
                      <Badge variant={t.status === "online" ? "default" : t.status === "idle" ? "secondary" : "destructive"} className="text-[10px] h-5">{t.status}</Badge>
                    </div>
                    <div className="text-sm font-semibold mb-0.5">{t.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{t.location}</div>
                    <Separator className="my-2" />
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between"><span>Cashier</span><span className="font-medium text-foreground">{t.cashier}</span></div>
                      <div className="flex justify-between"><span>Shift</span><span>{t.shift}</span></div>
                      <div className="flex justify-between"><span>Battery</span><span className="flex items-center gap-1"><Battery className="h-3 w-3" />{t.battery}%</span></div>
                      <div className="flex justify-between"><span>Last Active</span><span>{t.lastActive}</span></div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3 text-xs h-7">Manage</Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "Peripherals", items: ["Receipt Printer — Connected", "Barcode Scanner — Active", "Cash Drawer — Ready", "Card Reader — Online"] },
                { title: "Shift Management", items: ["Open shift: 8:00 AM", "Current cashiers: 3", "Break schedule: On track", "Close shift: 6:00 PM"] },
                { title: "Store Locations", items: ["Downtown Store — 3 terminals", "Market Square — 1 terminal", "Highway Branch — 1 terminal", "Convention Center — 1 terminal"] },
              ].map((section) => (
                <Card key={section.title} className="border-border/50">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{section.title}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {section.items.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/20">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ═══ PORTALS ═══ */}
          <TabsContent value="portals" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "Ecommerce Storefront", desc: "Full product catalog with online checkout", status: "synced", syncs: ["Inventory", "Pricing", "Orders"] },
                { name: "Customer Portal", desc: "Self-service portal for order history & loyalty", status: "synced", syncs: ["Profiles", "Orders", "Loyalty"] },
                { name: "B2B Ordering Portal", desc: "Wholesale ordering with custom pricing tiers", status: "synced", syncs: ["Catalog", "Pricing", "Accounts"] },
                { name: "Loyalty Portal", desc: "Points balance, rewards and VIP perks", status: "synced", syncs: ["Points", "Rewards", "Tiers"] },
                { name: "Event Portal", desc: "Ticket sales and event check-in integration", status: "partial", syncs: ["Tickets", "Attendees"] },
                { name: "Mobile App", desc: "Native mobile ordering and pickup", status: "planned", syncs: ["Catalog", "Orders", "Profile"] },
              ].map((p) => (
                <Card key={p.name} className="border-border/50">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Globe className="h-5 w-5 text-primary" />
                      <Badge variant={p.status === "synced" ? "default" : p.status === "partial" ? "secondary" : "outline"} className="text-[10px]">
                        {p.status === "synced" ? "Fully Synced" : p.status === "partial" ? "Partial" : "Planned"}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-semibold">{p.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-3">{p.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {p.syncs.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Omnichannel Sync Status</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  {["Inventory", "Pricing", "Customer Profiles", "Order History", "Promotions"].map((sync) => (
                    <div key={sync} className="text-center p-3 rounded-lg bg-muted/20 border border-border/30">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                      <div className="text-xs font-medium">{sync}</div>
                      <div className="text-[10px] text-muted-foreground">Real-time</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ AI ASSISTANT ═══ */}
          <TabsContent value="ai" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">AI Sales Assistant</CardTitle>
                        <CardDescription className="text-xs">Powered by MCP Integration Hub</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { type: "upsell", text: "Customer's basket contains coffee — suggest adding a pastry. The 'Coffee + Pastry' combo has a 34% attach rate and $3.20 higher AOV." },
                      { type: "insight", text: "This customer (Jessica Hall) typically orders a Smoothie Bowl on Saturdays. Consider suggesting it as an add-on." },
                      { type: "alert", text: "Avocado Toast Deluxe has only 45 units left. At current sell-through rate, stock will deplete by Tuesday. Trigger reorder?" },
                      { type: "performance", text: "Terminal 1 is processing 20% more transactions than average today. Consider opening an additional express lane." },
                    ].map((r, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border/50 bg-muted/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={r.type === "upsell" ? "default" : r.type === "alert" ? "destructive" : "secondary"} className="text-[10px]">
                            {r.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.text}</p>
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm" className="h-6 text-[10px]">Apply</Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]">Dismiss</Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">AI Capabilities</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      "Upsell & cross-sell suggestions",
                      "Basket-based recommendations",
                      "Shift performance summary",
                      "Anomaly detection",
                      "Stock issue prediction",
                      "Promotion suggestions",
                      "Customer insights",
                    ].map((c) => (
                      <div key={c} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/20">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
                  <CardContent className="pt-4 pb-3 text-center">
                    <Bot className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="text-sm font-semibold">MCP Hub Connected</div>
                    <div className="text-xs text-muted-foreground mt-1">AI models routed through your ERP-wide MCP Integration Hub</div>
                    <Badge variant="outline" className="mt-2 text-[10px]">Provider: Anthropic Claude</Badge>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ═══ AUTOMATIONS ═══ */}
          <TabsContent value="automations" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Automation Workflows</h3>
                <p className="text-sm text-muted-foreground">Visual workflows connected to CRM, RevPath, Events and more</p>
              </div>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />New Workflow</Button>
            </div>

            <div className="space-y-3">
              {automationWorkflows.map((w) => (
                <Card key={w.name} className="border-border/50">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{w.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={w.status === "active" ? "default" : "secondary"} className="text-[10px]">{w.status}</Badge>
                        <span className="text-xs text-muted-foreground">{w.runs.toLocaleString()} runs</span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] gap-1"><Play className="h-2.5 w-2.5" />{w.trigger}</Badge>
                      {w.actions.map((a, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ChevronRight className="h-3 w-3" />{a}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ═══ ANALYTICS ═══ */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Sales", value: "$115,200", change: "+14.2%" },
                { label: "Attendance Rate", value: "94.8%", change: "+1.3%" },
                { label: "Avg Ticket", value: "$48.50", change: "+5.7%" },
                { label: "Returns Rate", value: "2.1%", change: "-0.4%" },
              ].map((m) => (
                <Card key={m.label} className="border-border/50">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground">{m.label}</div>
                    <div className="text-2xl font-bold mt-1">{m.value}</div>
                    <div className="text-xs text-green-600 mt-0.5">{m.change} this week</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue by Location</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={[
                      { location: "Downtown", revenue: 48200 },
                      { location: "Market Sq.", revenue: 22400 },
                      { location: "Highway", revenue: 18600 },
                      { location: "Conv. Center", revenue: 26000 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="location" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Cashier Performance</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: "Sarah M.", transactions: 142, revenue: "$8,420", avgTicket: "$59.30", rating: 4.8 },
                      { name: "James K.", transactions: 118, revenue: "$7,230", avgTicket: "$61.27", rating: 4.6 },
                      { name: "Maria L.", transactions: 134, revenue: "$9,100", avgTicket: "$67.91", rating: 4.9 },
                    ].map((c) => (
                      <div key={c.name} className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-muted/20">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {c.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.transactions} transactions • {c.revenue}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium">Avg: {c.avgTicket}</div>
                          <div className="flex items-center gap-0.5 text-xs text-amber-500">
                            <Star className="h-3 w-3 fill-current" />{c.rating}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">End-of-Day Reconciliation</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Expected", value: "$24,640.00" },
                    { label: "Actual (Card)", value: "$21,023.20" },
                    { label: "Actual (Cash)", value: "$3,449.60" },
                    { label: "Variance", value: "-$167.20" },
                  ].map((r) => (
                    <div key={r.label} className="p-3 rounded-lg bg-muted/20 border border-border/30 text-center">
                      <div className="text-xs text-muted-foreground">{r.label}</div>
                      <div className={`text-lg font-bold mt-1 ${r.label === "Variance" ? "text-red-500" : ""}`}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
