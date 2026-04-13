import { useState } from "react";
import {
  Warehouse, PackageSearch, ArrowDownToLine, PackageCheck, ArrowLeftRight,
  ClipboardCheck, Truck, Cpu, Bot, BarChart3, AlertTriangle, Thermometer,
  Droplets, DoorOpen, MapPin, ScanBarcode, Layers, Box, LayoutGrid,
  TrendingUp, Clock, Route, BrainCircuit, Wifi, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* ── helpers ── */
const Metric = ({ icon: Icon, label, value, sub, trend }: { icon: any; label: string; value: string; sub?: string; trend?: string }) => (
  <Card className="shadow-sm border-border/60">
    <CardContent className="p-5 flex items-start gap-4">
      <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
      <div className="flex-1 space-y-0.5">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {trend && <Badge variant="secondary" className="text-[10px] mt-1">{trend}</Badge>}
    </CardContent>
  </Card>
);

const SectionCard = ({ title, description, children, className = "" }: { title: string; description?: string; children: React.ReactNode; className?: string }) => (
  <Card className={`shadow-sm border-border/60 ${className}`}>
    <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const StatusDot = ({ color }: { color: string }) => <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;

/* ── data ── */
const warehouses = [
  { name: "Main Distribution Center", code: "WH-001", city: "Dallas, TX", zones: 8, capacity: 87, status: "Operational" },
  { name: "East Coast Hub", code: "WH-002", city: "Newark, NJ", zones: 5, capacity: 72, status: "Operational" },
  { name: "West Coast Fulfillment", code: "WH-003", city: "Oakland, CA", zones: 6, capacity: 91, status: "Near Capacity" },
  { name: "Midwest Relay", code: "WH-004", city: "Chicago, IL", zones: 4, capacity: 45, status: "Operational" },
];

const inboundShipments = [
  { id: "SHP-4410", supplier: "Acme Supply Co.", items: 240, eta: "Today 2:30 PM", status: "In Transit" },
  { id: "SHP-4411", supplier: "Global Parts Inc.", items: 128, eta: "Today 5:00 PM", status: "Arrived" },
  { id: "SHP-4412", supplier: "TechVend Ltd.", items: 560, eta: "Tomorrow 9:00 AM", status: "In Transit" },
  { id: "SHP-4413", supplier: "QuickStock", items: 90, eta: "Tomorrow 1:00 PM", status: "Scheduled" },
];

const pickingOrders = [
  { id: "PK-901", order: "ORD-3341", items: 5, priority: "High", picker: "Maria S.", status: "In Progress" },
  { id: "PK-902", order: "ORD-3342", items: 12, priority: "Medium", picker: "James R.", status: "Queued" },
  { id: "PK-903", order: "ORD-3343", items: 3, priority: "High", picker: "Unassigned", status: "Queued" },
  { id: "PK-904", order: "ORD-3344", items: 8, priority: "Low", picker: "Sarah K.", status: "Complete" },
];

const transfers = [
  { id: "TRF-210", from: "WH-001", to: "WH-003", items: 320, status: "In Transit", eta: "Mar 10" },
  { id: "TRF-211", from: "WH-002", to: "WH-004", items: 145, status: "Pending", eta: "Mar 11" },
  { id: "TRF-212", from: "WH-003", to: "WH-001", items: 80, status: "Complete", eta: "—" },
];

const iotSensors = [
  { id: "IOT-01", type: "Temperature", location: "WH-001 Zone A", value: "36°F", status: "Normal", icon: Thermometer },
  { id: "IOT-02", type: "Humidity", location: "WH-001 Zone B", value: "42%", status: "Normal", icon: Droplets },
  { id: "IOT-03", type: "Temperature", location: "WH-003 Cold Storage", value: "41°F", status: "Warning", icon: Thermometer },
  { id: "IOT-04", type: "Door Status", location: "WH-002 Dock 3", value: "Open", status: "Alert", icon: DoorOpen },
  { id: "IOT-05", type: "Occupancy", location: "WH-001 Zone C", value: "78%", status: "Normal", icon: MapPin },
  { id: "IOT-06", type: "Asset Tracker", location: "Forklift FL-09", value: "Zone D", status: "Normal", icon: ScanBarcode },
];

const fulfillmentOrders = [
  { id: "ORD-3341", channel: "POS", items: 5, status: "Picking", warehouse: "WH-001" },
  { id: "ORD-3342", channel: "Online Store", items: 12, status: "Packing", warehouse: "WH-003" },
  { id: "ORD-3343", channel: "B2B Portal", items: 3, status: "Shipped", warehouse: "WH-002" },
  { id: "ORD-3344", channel: "Event Sales", items: 8, status: "Ready", warehouse: "WH-001" },
  { id: "ORD-3345", channel: "Appointments", items: 2, status: "Picking", warehouse: "WH-004" },
];

const cycleCountData = [
  { zone: "Zone A – WH-001", scheduled: "Mar 10", items: 1240, counted: 980, variance: "2.1%", status: "In Progress" },
  { zone: "Zone B – WH-001", scheduled: "Mar 12", items: 860, counted: 0, variance: "—", status: "Scheduled" },
  { zone: "Zone C – WH-003", scheduled: "Mar 8", items: 1540, counted: 1540, variance: "0.8%", status: "Complete" },
];

/* ── page ── */
export default function WarehouseBuilder() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-primary" /> Intelligent Warehouse Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Warehouse operations, fulfillment intelligence and IoT monitoring</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1"><Wifi className="h-3 w-3" />4 Warehouses</Badge>
          <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3 text-green-500" />All Systems Online</Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {[
            { v: "dashboard", l: "Dashboard", i: LayoutGrid },
            { v: "layout", l: "Layout", i: Layers },
            { v: "receiving", l: "Receiving", i: ArrowDownToLine },
            { v: "picking", l: "Picking & Packing", i: PackageCheck },
            { v: "transfers", l: "Transfers", i: ArrowLeftRight },
            { v: "counts", l: "Stock Counts", i: ClipboardCheck },
            { v: "fulfillment", l: "Fulfillment", i: Truck },
            { v: "iot", l: "IoT", i: Cpu },
            { v: "ai", l: "AI Assistant", i: Bot },
            { v: "analytics", l: "Analytics", i: BarChart3 },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <t.i className="h-3.5 w-3.5" />{t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══ DASHBOARD ═══ */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric icon={Box} label="Total Stock Units" value="48,320" sub="Across 4 warehouses" trend="+3.2%" />
            <Metric icon={ArrowDownToLine} label="Incoming Shipments" value="12" sub="4 arriving today" />
            <Metric icon={PackageCheck} label="Picking Queue" value="37" sub="8 high priority" trend="−12%" />
            <Metric icon={AlertTriangle} label="Low Stock Alerts" value="9" sub="3 critical items" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Fulfillment Performance" className="lg:col-span-2">
              <div className="space-y-4">
                {[{ l: "Orders Picked Today", v: 84, m: 120 }, { l: "Orders Packed", v: 71, m: 120 }, { l: "Orders Shipped", v: 58, m: 120 }].map(r => (
                  <div key={r.l} className="space-y-1">
                    <div className="flex justify-between text-sm"><span>{r.l}</span><span className="text-muted-foreground">{r.v}/{r.m}</span></div>
                    <Progress value={(r.v / r.m) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="IoT Alerts">
              <div className="space-y-3">
                {iotSensors.filter(s => s.status !== "Normal").map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <s.icon className="h-4 w-4 text-destructive" />
                    <div className="flex-1 text-xs">
                      <p className="font-medium">{s.type}: {s.value}</p>
                      <p className="text-muted-foreground">{s.location}</p>
                    </div>
                    <Badge variant="destructive" className="text-[10px]">{s.status}</Badge>
                  </div>
                ))}
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <Activity className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">4 sensors reporting normal</p>
                </div>
              </div>
            </SectionCard>
          </div>
          <SectionCard title="AI Recommendations">
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: Route, t: "Optimize Picking Route", d: "Reorder picks for Zone A to save ~18 min/shift" },
                { icon: TrendingUp, t: "Restock SKU-1142", d: "Predicted stockout in 4 days based on velocity" },
                { icon: BrainCircuit, t: "Anomaly Detected", d: "Unusual spike in returns for WH-003 items" },
              ].map(r => (
                <div key={r.t} className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                  <div className="flex items-center gap-2"><r.icon className="h-4 w-4 text-primary" /><p className="text-sm font-medium">{r.t}</p></div>
                  <p className="text-xs text-muted-foreground">{r.d}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ═══ LAYOUT ═══ */}
        <TabsContent value="layout" className="space-y-6 mt-6">
          <SectionCard title="Warehouse Locations" description="Manage physical warehouse structure and storage mapping">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Warehouse</TableHead><TableHead>Code</TableHead><TableHead>City</TableHead><TableHead>Zones</TableHead><TableHead>Capacity</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {warehouses.map(w => (
                  <TableRow key={w.code}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{w.code}</code></TableCell>
                    <TableCell>{w.city}</TableCell>
                    <TableCell>{w.zones}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><Progress value={w.capacity} className="h-1.5 w-16" /><span className="text-xs">{w.capacity}%</span></div></TableCell>
                    <TableCell><Badge variant={w.status === "Operational" ? "secondary" : "destructive"} className="text-[10px]">{w.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
          <SectionCard title="Zone & Bin Map – WH-001" description="Visual warehouse layout with zone assignments">
            <div className="grid grid-cols-4 gap-3">
              {["Zone A · Receiving", "Zone B · Bulk Storage", "Zone C · Pick & Pack", "Zone D · Cold Storage", "Zone E · Returns", "Zone F · Hazmat", "Zone G · Staging", "Zone H · Shipping Dock"].map(z => (
                <div key={z} className="p-4 rounded-xl bg-muted/50 border border-border/60 text-center space-y-1 hover:border-primary/40 transition-colors cursor-pointer">
                  <Layers className="h-5 w-5 mx-auto text-primary/60" />
                  <p className="text-xs font-medium">{z.split(" · ")[0]}</p>
                  <p className="text-[10px] text-muted-foreground">{z.split(" · ")[1]}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ═══ RECEIVING ═══ */}
        <TabsContent value="receiving" className="space-y-6 mt-6">
          <SectionCard title="Inbound Shipments" description="Track and receive incoming inventory">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Shipment</TableHead><TableHead>Supplier</TableHead><TableHead>Items</TableHead><TableHead>ETA</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {inboundShipments.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.id}</TableCell>
                    <TableCell>{s.supplier}</TableCell>
                    <TableCell>{s.items}</TableCell>
                    <TableCell className="text-sm">{s.eta}</TableCell>
                    <TableCell><Badge variant={s.status === "Arrived" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="outline" className="text-xs h-7">Receive</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
          <div className="grid sm:grid-cols-3 gap-4">
            {["Receiving Validation", "Quality Check", "Putaway Assignment"].map((step, i) => (
              <Card key={step} className="shadow-sm border-border/60">
                <CardContent className="p-5 text-center space-y-2">
                  <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{i + 1}</div>
                  <p className="font-medium text-sm">{step}</p>
                  <p className="text-xs text-muted-foreground">{["Scan & validate items against PO", "Inspect quality, flag damaged items", "Assign bins & confirm stock intake"][i]}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ═══ PICKING & PACKING ═══ */}
        <TabsContent value="picking" className="space-y-6 mt-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <Metric icon={PackageCheck} label="Active Picks" value="14" sub="3 high priority" />
            <Metric icon={Box} label="Packing Stations" value="6/8" sub="Active stations" />
            <Metric icon={Clock} label="Avg Pick Time" value="4.2 min" sub="Per order" trend="−8%" />
          </div>
          <SectionCard title="Picking Queue" description="Active and queued picking orders">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Pick ID</TableHead><TableHead>Order</TableHead><TableHead>Items</TableHead><TableHead>Priority</TableHead><TableHead>Picker</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pickingOrders.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.id}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.order}</code></TableCell>
                    <TableCell>{p.items}</TableCell>
                    <TableCell><Badge variant={p.priority === "High" ? "destructive" : "secondary"} className="text-[10px]">{p.priority}</Badge></TableCell>
                    <TableCell>{p.picker}</TableCell>
                    <TableCell><Badge variant={p.status === "Complete" ? "default" : "outline"} className="text-[10px]">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
          <SectionCard title="Mobile Scanning Workflow">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {["Scan Order", "Navigate to Bin", "Scan Item", "Confirm Pick", "Move to Pack Station"].map((s, i) => (
                <div key={s} className="flex items-center gap-2 shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">{i + 1}</div>
                  <span className="text-sm font-medium whitespace-nowrap">{s}</span>
                  {i < 4 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ═══ TRANSFERS ═══ */}
        <TabsContent value="transfers" className="space-y-6 mt-6">
          <SectionCard title="Internal Transfers" description="Stock movements between warehouses and locations">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Transfer</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Items</TableHead><TableHead>ETA</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {transfers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.id}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.from}</code></TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.to}</code></TableCell>
                    <TableCell>{t.items}</TableCell>
                    <TableCell>{t.eta}</TableCell>
                    <TableCell><Badge variant={t.status === "Complete" ? "default" : "secondary"} className="text-[10px]">{t.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
          <div className="grid sm:grid-cols-2 gap-4">
            <SectionCard title="Replenishment Requests">
              <div className="space-y-3">
                {[{ sku: "SKU-1142", from: "WH-001", to: "Store #5", qty: 60, urgency: "High" }, { sku: "SKU-2208", from: "WH-002", to: "Store #12", qty: 30, urgency: "Medium" }].map(r => (
                  <div key={r.sku} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/60">
                    <div><p className="text-sm font-medium">{r.sku}</p><p className="text-xs text-muted-foreground">{r.from} → {r.to} · {r.qty} units</p></div>
                    <Badge variant={r.urgency === "High" ? "destructive" : "secondary"} className="text-[10px]">{r.urgency}</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Movement Log">
              <div className="space-y-3">
                {["320 units moved WH-001 → WH-003 · 2h ago", "145 units queued WH-002 → WH-004 · 5h ago", "80 units received WH-003 → WH-001 · 1d ago"].map(l => (
                  <div key={l} className="flex items-center gap-2 text-xs text-muted-foreground"><ArrowLeftRight className="h-3 w-3" />{l}</div>
                ))}
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ═══ STOCK COUNTS ═══ */}
        <TabsContent value="counts" className="space-y-6 mt-6">
          <SectionCard title="Cycle Counts & Audits" description="Schedule and track inventory counts">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Zone</TableHead><TableHead>Scheduled</TableHead><TableHead>Total Items</TableHead><TableHead>Counted</TableHead><TableHead>Variance</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {cycleCountData.map(c => (
                  <TableRow key={c.zone}>
                    <TableCell className="font-medium">{c.zone}</TableCell>
                    <TableCell>{c.scheduled}</TableCell>
                    <TableCell>{c.items.toLocaleString()}</TableCell>
                    <TableCell>{c.counted.toLocaleString()}</TableCell>
                    <TableCell>{c.variance}</TableCell>
                    <TableCell><Badge variant={c.status === "Complete" ? "default" : c.status === "In Progress" ? "secondary" : "outline"} className="text-[10px]">{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
          <SectionCard title="Variance Resolution">
            <div className="grid sm:grid-cols-3 gap-4">
              {[{ l: "Items Counted", v: "2,520" }, { l: "Discrepancies Found", v: "34" }, { l: "Resolved", v: "28" }].map(m => (
                <div key={m.l} className="p-4 rounded-xl bg-muted/50 border border-border/60 text-center">
                  <p className="text-2xl font-bold">{m.v}</p><p className="text-xs text-muted-foreground mt-1">{m.l}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ═══ FULFILLMENT ═══ */}
        <TabsContent value="fulfillment" className="space-y-6 mt-6">
          <SectionCard title="Omnichannel Order Fulfillment" description="Warehouse operations connected to all sales channels">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Order</TableHead><TableHead>Channel</TableHead><TableHead>Items</TableHead><TableHead>Warehouse</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {fulfillmentOrders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.id}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{o.channel}</Badge></TableCell>
                    <TableCell>{o.items}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{o.warehouse}</code></TableCell>
                    <TableCell><Badge variant={o.status === "Shipped" ? "default" : "secondary"} className="text-[10px]">{o.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
          <SectionCard title="Fulfillment Pipeline">
            <div className="flex items-center justify-between">
              {["Order Received", "Picking", "Packing", "Ready to Ship", "Shipped", "Delivered"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                  <span className="text-xs font-medium hidden lg:inline">{s}</span>
                  {i < 5 && <span className="text-muted-foreground hidden sm:inline">→</span>}
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ═══ IOT ═══ */}
        <TabsContent value="iot" className="space-y-6 mt-6">
          <SectionCard title="IoT Sensor Network" description="Real-time environment and asset monitoring across warehouses">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {iotSensors.map(s => (
                <div key={s.id} className={`p-4 rounded-xl border space-y-2 ${s.status === "Alert" ? "border-destructive/40 bg-destructive/5" : s.status === "Warning" ? "border-yellow-500/40 bg-yellow-500/5" : "border-border/60 bg-muted/30"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><s.icon className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{s.type}</span></div>
                    <Badge variant={s.status === "Normal" ? "secondary" : "destructive"} className="text-[10px]">{s.status}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.location}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ═══ AI ASSISTANT ═══ */}
        <TabsContent value="ai" className="space-y-6 mt-6">
          <SectionCard title="AI Warehouse Assistant" description="Intelligent recommendations for warehouse optimization">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Route, t: "Picking Route Optimization", d: "Reorder Zone A picks by proximity. Estimated saving: 18 min/shift across 3 pickers.", action: "Apply Route" },
                { icon: TrendingUp, t: "Stock Shortage Prediction", d: "SKU-1142 and SKU-3305 will hit safety stock in 4 and 6 days respectively.", action: "Create PO" },
                { icon: ArrowLeftRight, t: "Replenishment Suggestion", d: "Transfer 200 units of SKU-2208 from WH-001 to WH-003 based on demand velocity.", action: "Create Transfer" },
                { icon: AlertTriangle, t: "Anomaly Detection", d: "Return rate for WH-003 items spiked 340% this week. Possible quality issue in Zone D.", action: "Investigate" },
                { icon: BrainCircuit, t: "Performance Summary", d: "Fulfillment speed improved 12% WoW. Picking accuracy at 99.2%. WH-002 underutilized.", action: "View Report" },
                { icon: BarChart3, t: "Demand Forecast", d: "Expected 28% order increase next week due to seasonal trend. Pre-stage fast movers.", action: "Stage Items" },
              ].map(r => (
                <div key={r.t} className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                  <div className="flex items-center gap-2"><r.icon className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">{r.t}</p></div>
                  <p className="text-xs text-muted-foreground">{r.d}</p>
                  <Button size="sm" variant="outline" className="text-xs h-7 mt-1">{r.action}</Button>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ═══ ANALYTICS ═══ */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric icon={Clock} label="Avg Fulfillment Speed" value="2.4h" trend="−15%" />
            <Metric icon={PackageCheck} label="Picking Accuracy" value="99.2%" trend="+0.3%" />
            <Metric icon={TrendingUp} label="Stock Turnover" value="8.4x" sub="Annual rate" />
            <Metric icon={AlertTriangle} label="Discrepancy Rate" value="1.2%" trend="−0.4%" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <SectionCard title="Warehouse Utilization">
              <div className="space-y-3">
                {warehouses.map(w => (
                  <div key={w.code} className="space-y-1">
                    <div className="flex justify-between text-sm"><span>{w.name}</span><span className="text-muted-foreground">{w.capacity}%</span></div>
                    <Progress value={w.capacity} className="h-2" />
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Environmental Alerts (30d)">
              <div className="space-y-3">
                {[{ l: "Temperature Excursions", v: 3, s: "warning" }, { l: "Humidity Alerts", v: 1, s: "ok" }, { l: "Door Alerts", v: 7, s: "warning" }, { l: "Asset Tracker Offline", v: 0, s: "ok" }].map(a => (
                  <div key={a.l} className="flex items-center justify-between">
                    <span className="text-sm">{a.l}</span>
                    <Badge variant={a.s === "warning" ? "destructive" : "secondary"} className="text-[10px]">{a.v}</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
