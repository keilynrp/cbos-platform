import { useState } from "react";
import {
  Cpu, Wifi, Radio, AlertTriangle, Activity, Thermometer, Droplets,
  MapPin, ScanBarcode, Monitor, Zap, BrainCircuit, BarChart3,
  LayoutGrid, Server, Waves, Bell, FolderTree, Link2, Bot,
  GitBranch, TrendingUp, Shield, Clock, Signal, Eye,
  CheckCircle2, XCircle, MinusCircle, Battery, Router
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

/* ── data ── */
const devices = [
  { name: "Temp Sensor A1", type: "Temperature", location: "WH-001 Zone A", status: "Online", firmware: "v2.4.1", module: "Warehouse", lastActivity: "2 min ago", icon: Thermometer },
  { name: "Humidity Monitor B3", type: "Humidity", location: "WH-001 Zone B", status: "Online", firmware: "v2.4.1", module: "Warehouse", lastActivity: "1 min ago", icon: Droplets },
  { name: "POS Terminal #12", type: "Smart Terminal", location: "Store #5", status: "Online", firmware: "v5.1.0", module: "POS Builder", lastActivity: "Just now", icon: Monitor },
  { name: "Door Sensor D2", type: "Environmental", location: "WH-002 Dock 3", status: "Warning", firmware: "v1.9.3", module: "Warehouse", lastActivity: "15 min ago", icon: Shield },
  { name: "Asset Tracker FL-09", type: "Tracker", location: "WH-001 Zone D", status: "Online", firmware: "v3.0.2", module: "Asset Manager", lastActivity: "5 min ago", icon: MapPin },
  { name: "Barcode Scanner S7", type: "Scanner", location: "WH-003 Pack Station", status: "Offline", firmware: "v4.2.0", module: "Inventory", lastActivity: "2h ago", icon: ScanBarcode },
  { name: "Gateway GW-01", type: "Gateway", location: "WH-001 Server Room", status: "Online", firmware: "v6.0.1", module: "IoT Hub", lastActivity: "Just now", icon: Router },
  { name: "Occupancy Cam E1", type: "Occupancy", location: "Event Hall A", status: "Online", firmware: "v2.1.0", module: "Events", lastActivity: "30 sec ago", icon: Eye },
];

const telemetryStreams = [
  { sensor: "Temp Sensor A1", metric: "Temperature", value: "36.2°F", trend: "Stable", interval: "30s", icon: Thermometer },
  { sensor: "Humidity Monitor B3", metric: "Humidity", value: "42%", trend: "Rising", interval: "30s", icon: Droplets },
  { sensor: "Occupancy Cam E1", metric: "Occupancy", value: "127 / 200", trend: "Stable", interval: "10s", icon: Eye },
  { sensor: "Asset Tracker FL-09", metric: "Position", value: "Zone D, Aisle 4", trend: "Moving", interval: "5s", icon: MapPin },
  { sensor: "Door Sensor D2", metric: "Door State", value: "Open", trend: "—", interval: "Event", icon: Shield },
  { sensor: "POS Terminal #12", metric: "Power", value: "98%", trend: "Stable", interval: "60s", icon: Battery },
];

const alertRules = [
  { name: "Cold Storage Temp Alert", condition: "Temperature > 40°F", action: "Notify Warehouse Manager", module: "Warehouse", status: "Active" },
  { name: "POS Device Offline", condition: "Terminal offline > 5 min", action: "Alert Operations Team", module: "POS Builder", status: "Active" },
  { name: "Asset Zone Departure", condition: "Asset leaves assigned zone", action: "Trigger Security Alert", module: "Asset Manager", status: "Active" },
  { name: "Event Occupancy Limit", condition: "Occupancy > 90% capacity", action: "Notify Event Admin", module: "Events", status: "Active" },
  { name: "Humidity Warning", condition: "Humidity > 60%", action: "Create Maintenance Ticket", module: "Warehouse", status: "Paused" },
];

const deviceGroups = [
  { name: "Main Distribution Center", type: "Warehouse", devices: 24, alerts: 2, status: "Operational" },
  { name: "Store #5 Downtown", type: "Retail Store", devices: 8, alerts: 0, status: "Operational" },
  { name: "Event Hall A", type: "Event Venue", devices: 12, alerts: 1, status: "Monitoring" },
  { name: "Fleet Vehicles", type: "Vehicle", devices: 6, alerts: 0, status: "Tracking" },
  { name: "East Coast Hub", type: "Warehouse", devices: 18, alerts: 3, status: "Warning" },
];

const erpBindings = [
  { iotSource: "Warehouse Sensors", erpModule: "Warehouse Builder", dataFlow: "Temperature, humidity, door status", status: "Active", icon: Thermometer },
  { iotSource: "POS Terminals", erpModule: "POS Builder", dataFlow: "Device health, uptime, transactions", status: "Active", icon: Monitor },
  { iotSource: "Event Devices", erpModule: "Event Builder", dataFlow: "Check-in, occupancy, environment", status: "Active", icon: Eye },
  { iotSource: "Asset Trackers", erpModule: "Asset Manager", dataFlow: "Location, movement, zone events", status: "Active", icon: MapPin },
  { iotSource: "Environmental Sensors", erpModule: "Inventory & Orders", dataFlow: "Quality protection alerts", status: "Active", icon: Shield },
  { iotSource: "Edge Gateways", erpModule: "MCP Hub", dataFlow: "Protocol bridging, data relay", status: "Active", icon: Router },
];

const workflows = [
  { trigger: "Temperature > 40°F in cold storage", steps: ["Detect threshold breach", "Create warehouse incident", "Notify manager via Slack", "Log to audit trail"], module: "Warehouse" },
  { trigger: "Scanner offline > 10 min", steps: ["Detect offline status", "Check gateway health", "Notify IT support", "Escalate if unresolved"], module: "Inventory" },
  { trigger: "Occupancy > 90% at event", steps: ["Detect occupancy threshold", "Alert event admin", "Update portal status", "Trigger crowd management"], module: "Events" },
  { trigger: "Asset leaves designated zone", steps: ["Detect zone departure", "Verify authorized move", "Update asset log", "Alert security if unauthorized"], module: "Asset Manager" },
];

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "Online" || status === "Active" || status === "Operational") return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
  if (status === "Warning" || status === "Paused" || status === "Monitoring") return <MinusCircle className="h-3.5 w-3.5 text-accent-foreground" />;
  return <XCircle className="h-3.5 w-3.5 text-destructive" />;
};

export default function IoTBuilder() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" /> Intelligent IoT Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Connected devices, sensors, telemetry and intelligent automation</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1"><Signal className="h-3 w-3 text-primary" />86 Devices</Badge>
          <Badge variant="outline" className="gap-1"><Activity className="h-3 w-3 text-primary" />5 Alerts</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {[
            { v: "dashboard", l: "Dashboard", i: LayoutGrid },
            { v: "devices", l: "Devices", i: Server },
            { v: "telemetry", l: "Telemetry", i: Waves },
            { v: "rules", l: "Rules & Alerts", i: Bell },
            { v: "groups", l: "Groups", i: FolderTree },
            { v: "bindings", l: "ERP Bindings", i: Link2 },
            { v: "ai", l: "AI Assistant", i: Bot },
            { v: "workflows", l: "Workflows", i: GitBranch },
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
            <Metric icon={Cpu} label="Connected Devices" value="86" sub="Across 5 locations" trend="+4" />
            <Metric icon={Radio} label="Active Sensors" value="62" sub="Streaming telemetry" />
            <Metric icon={Zap} label="Telemetry Events" value="14.2K" sub="Last 24 hours" trend="+8%" />
            <Metric icon={AlertTriangle} label="Active Alerts" value="5" sub="2 critical, 3 warning" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Device Health Overview" className="lg:col-span-2">
              <div className="space-y-4">
                {[
                  { l: "Online", v: 78, m: 86, c: "bg-primary" },
                  { l: "Warning", v: 5, m: 86, c: "bg-accent" },
                  { l: "Offline", v: 3, m: 86, c: "bg-destructive" },
                ].map(r => (
                  <div key={r.l} className="space-y-1">
                    <div className="flex justify-between text-sm"><span>{r.l}</span><span className="text-muted-foreground">{r.v} / {r.m}</span></div>
                    <Progress value={(r.v / r.m) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Active Alerts">
              <div className="space-y-3">
                {[
                  { t: "Cold Storage Temp 41°F", loc: "WH-001 Zone D", sev: "Critical" },
                  { t: "Dock Door Open 45 min", loc: "WH-002 Dock 3", sev: "Critical" },
                  { t: "Scanner S7 Offline", loc: "WH-003 Pack Station", sev: "Warning" },
                ].map(a => (
                  <div key={a.t} className="flex items-center gap-3 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                    <div className="flex-1 text-xs">
                      <p className="font-medium">{a.t}</p>
                      <p className="text-muted-foreground">{a.loc}</p>
                    </div>
                    <Badge variant="destructive" className="text-[10px]">{a.sev}</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="AI Anomaly Detection">
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: BrainCircuit, t: "Unusual Temp Pattern", d: "Zone D shows 3°F drift over 6 hours — possible cooling unit degradation" },
                { icon: TrendingUp, t: "Scanner Usage Spike", d: "WH-003 scanners at 2.4x normal activity — correlates with flash sale orders" },
                { icon: Shield, t: "Predictive Maintenance", d: "Gateway GW-03 firmware outdated — recommend update before potential connectivity issues" },
              ].map(r => (
                <div key={r.t} className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                  <div className="flex items-center gap-2"><r.icon className="h-4 w-4 text-primary" /><p className="text-sm font-medium">{r.t}</p></div>
                  <p className="text-xs text-muted-foreground">{r.d}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ═══ DEVICES ═══ */}
        <TabsContent value="devices" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage all registered IoT devices, sensors, gateways and terminals</p>
            <Button size="sm" className="gap-1.5"><Cpu className="h-3.5 w-3.5" />Register Device</Button>
          </div>
          <SectionCard title="Device Registry">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Device</TableHead><TableHead>Type</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead>Firmware</TableHead><TableHead>Module</TableHead><TableHead>Last Active</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {devices.map(d => (
                  <TableRow key={d.name}>
                    <TableCell className="font-medium"><div className="flex items-center gap-2"><d.icon className="h-4 w-4 text-primary/60" />{d.name}</div></TableCell>
                    <TableCell className="text-sm">{d.type}</TableCell>
                    <TableCell className="text-sm">{d.location}</TableCell>
                    <TableCell><div className="flex items-center gap-1.5"><StatusIcon status={d.status} /><span className="text-xs">{d.status}</span></div></TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{d.firmware}</code></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{d.module}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.lastActivity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        {/* ═══ TELEMETRY ═══ */}
        <TabsContent value="telemetry" className="space-y-6 mt-6">
          <SectionCard title="Live Telemetry Streams" description="Real-time data from connected sensors and devices">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {telemetryStreams.map(s => (
                <div key={s.sensor} className="p-4 rounded-xl border border-border/60 bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><s.icon className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{s.metric}</span></div>
                    <Badge variant="secondary" className="text-[10px]">{s.interval}</Badge>
                  </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{s.sensor}</p>
                    <span className="text-xs text-muted-foreground">{s.trend}</span>
                  </div>
                  {/* Simulated sparkline */}
                  <div className="flex items-end gap-0.5 h-8">
                    {Array.from({ length: 20 }, (_, i) => {
                      const h = 20 + Math.random() * 80;
                      return <div key={i} className="flex-1 rounded-sm bg-primary/20" style={{ height: `${h}%` }} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ═══ RULES & ALERTS ═══ */}
        <TabsContent value="rules" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">No-code rules engine for device alerts and automation triggers</p>
            <Button size="sm" className="gap-1.5"><Bell className="h-3.5 w-3.5" />Create Rule</Button>
          </div>
          <SectionCard title="Alert Rules">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Rule Name</TableHead><TableHead>Condition</TableHead><TableHead>Action</TableHead><TableHead>Module</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {alertRules.map(r => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.condition}</code></TableCell>
                    <TableCell className="text-sm">{r.action}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.module}</Badge></TableCell>
                    <TableCell><Badge variant={r.status === "Active" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        {/* ═══ GROUPS ═══ */}
        <TabsContent value="groups" className="space-y-6 mt-6">
          <SectionCard title="Device Groups & Locations" description="Organize devices by physical location and operational zone">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {deviceGroups.map(g => (
                <div key={g.name} className="p-4 rounded-xl border border-border/60 bg-muted/30 space-y-3 hover:border-primary/40 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{g.name}</p>
                    <Badge variant="outline" className="text-[10px]">{g.type}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{g.devices} devices</span>
                    <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{g.alerts} alerts</span>
                  </div>
                  <div className="flex items-center gap-1.5"><StatusIcon status={g.status} /><span className="text-xs">{g.status}</span></div>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ═══ ERP BINDINGS ═══ */}
        <TabsContent value="bindings" className="space-y-6 mt-6">
          <SectionCard title="ERP Module Bindings" description="How IoT data connects to ERP workflows and operations">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {erpBindings.map(b => (
                <div key={b.iotSource} className="p-4 rounded-xl border border-primary/10 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2"><b.icon className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">{b.iotSource}</p></div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[10px]">{b.erpModule}</Badge>
                    <StatusIcon status={b.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{b.dataFlow}</p>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Data Flow Diagram">
            <div className="flex items-center justify-center gap-3 flex-wrap py-4">
              {["Sensors & Devices", "→", "IoT Hub", "→", "Rules Engine", "→", "ERP Modules", "→", "Actions & Alerts"].map((s, i) => (
                <span key={i} className={i % 2 === 0 ? "px-4 py-2 rounded-lg bg-primary/10 text-sm font-medium text-primary border border-primary/20" : "text-muted-foreground font-bold"}>{s}</span>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ═══ AI ASSISTANT ═══ */}
        <TabsContent value="ai" className="space-y-6 mt-6">
          <SectionCard title="AI IoT Assistant" description="Intelligent insights from device telemetry and operational data">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: BrainCircuit, t: "Anomaly Detection", d: "Temperature in WH-001 Zone D drifting 3°F above baseline over 6 hours. Possible compressor degradation.", action: "Investigate" },
                { icon: Activity, t: "Incident Summary", d: "3 incidents this week: 2 temp excursions (resolved), 1 scanner offline (pending). Overall health: 96.5%.", action: "View Report" },
                { icon: Zap, t: "Maintenance Prediction", d: "Gateway GW-03 showing intermittent latency spikes. Firmware update recommended within 48h.", action: "Schedule Update" },
                { icon: TrendingUp, t: "Failure Prevention", d: "Humidity sensor B3 calibration drift detected. Recalibration recommended to maintain data accuracy.", action: "Create Task" },
                { icon: Link2, t: "Business Correlation", d: "Scanner activity spike at WH-003 correlates with 2.4x order volume from flash sale campaign.", action: "View Analysis" },
                { icon: BarChart3, t: "Performance Digest", d: "Device uptime 99.1% this month. 5 automated workflows triggered 142 times. Top alert: temperature.", action: "Full Report" },
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

        {/* ═══ WORKFLOWS ═══ */}
        <TabsContent value="workflows" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Automated workflows triggered by IoT events</p>
            <Button size="sm" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" />Create Workflow</Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {workflows.map(w => (
              <SectionCard key={w.trigger} title={w.trigger}>
                <div className="space-y-2">
                  {w.steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                      <span className="text-sm">{s}</span>
                    </div>
                  ))}
                  <Badge variant="outline" className="text-[10px] mt-2">{w.module}</Badge>
                </div>
              </SectionCard>
            ))}
          </div>
        </TabsContent>

        {/* ═══ ANALYTICS ═══ */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric icon={Clock} label="Avg Device Uptime" value="99.1%" trend="+0.2%" />
            <Metric icon={Bell} label="Alerts (30d)" value="47" sub="12 critical" trend="−18%" />
            <Metric icon={Thermometer} label="Env Incidents" value="5" sub="This month" />
            <Metric icon={Zap} label="Workflow Triggers" value="142" sub="Automated actions" trend="+22%" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <SectionCard title="Alert Frequency by Type">
              <div className="space-y-3">
                {[
                  { l: "Temperature", v: 18 },
                  { l: "Connectivity", v: 12 },
                  { l: "Door / Access", v: 9 },
                  { l: "Asset Movement", v: 5 },
                  { l: "Humidity", v: 3 },
                ].map(a => (
                  <div key={a.l} className="space-y-1">
                    <div className="flex justify-between text-sm"><span>{a.l}</span><span className="text-muted-foreground">{a.v}</span></div>
                    <Progress value={(a.v / 18) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Location Event Summary">
              <div className="space-y-3">
                {[
                  { l: "WH-001 Main DC", events: 1240, alerts: 8 },
                  { l: "WH-002 East Coast", events: 860, alerts: 12 },
                  { l: "Store #5", events: 320, alerts: 1 },
                  { l: "Event Hall A", events: 540, alerts: 3 },
                ].map(loc => (
                  <div key={loc.l} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div><p className="text-sm font-medium">{loc.l}</p><p className="text-xs text-muted-foreground">{loc.events.toLocaleString()} events</p></div>
                    <Badge variant={loc.alerts > 5 ? "destructive" : "secondary"} className="text-[10px]">{loc.alerts} alerts</Badge>
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
