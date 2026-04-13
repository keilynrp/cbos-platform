import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import {
  Settings2,
  Server,
  Database,
  Globe,
  Shield,
  Users,
  Bell,
  Mail,
  Palette,
  Cpu,
  Network,
  Radio,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
  Box,
  Layers,
  Loader2,
} from "lucide-react";

// --- Architecture Data ---

interface ArchNode {
  id: string;
  label: string;
  sublabel: string;
  icon: typeof Server;
  color: string;
  bg: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: "healthy" | "warning" | "degraded";
}

interface ArchConnection {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
}

const archNodes: ArchNode[] = [
  { id: "client", label: "Client Apps", sublabel: "React SPA / Mobile", icon: Globe, color: "hsl(262, 80%, 55%)", bg: "hsl(262, 80%, 95%)", x: 380, y: 30, width: 160, height: 60, status: "healthy" },
  { id: "gateway", label: "API Gateway", sublabel: "Auth · Rate Limit · Routing", icon: Shield, color: "hsl(220, 80%, 55%)", bg: "hsl(220, 80%, 95%)", x: 380, y: 130, width: 160, height: 60, status: "healthy" },
  // Microservices row
  { id: "ms-projects", label: "Projects", sublabel: "Microservice", icon: Box, color: "hsl(262, 80%, 55%)", bg: "hsl(262, 80%, 95%)", x: 60, y: 240, width: 120, height: 55, status: "healthy" },
  { id: "ms-crm", label: "CRM", sublabel: "Microservice", icon: Box, color: "hsl(220, 80%, 55%)", bg: "hsl(220, 80%, 95%)", x: 210, y: 240, width: 120, height: 55, status: "healthy" },
  { id: "ms-docs", label: "Documents", sublabel: "Microservice", icon: Box, color: "hsl(152, 60%, 48%)", bg: "hsl(152, 60%, 92%)", x: 360, y: 240, width: 120, height: 55, status: "healthy" },
  { id: "ms-knowledge", label: "Knowledge", sublabel: "Microservice", icon: Box, color: "hsl(38, 92%, 50%)", bg: "hsl(38, 92%, 92%)", x: 510, y: 240, width: 120, height: 55, status: "healthy" },
  { id: "ms-analytics", label: "Analytics", sublabel: "Microservice", icon: Box, color: "hsl(262, 80%, 55%)", bg: "hsl(262, 80%, 95%)", x: 660, y: 240, width: 120, height: 55, status: "healthy" },
  { id: "ms-ai", label: "AI Agents", sublabel: "Microservice", icon: Box, color: "hsl(220, 80%, 55%)", bg: "hsl(220, 80%, 95%)", x: 810, y: 240, width: 120, height: 55, status: "warning" },
  // Event Bus
  { id: "eventbus", label: "Event Bus", sublabel: "Async Messaging · Pub/Sub", icon: Radio, color: "hsl(152, 60%, 48%)", bg: "hsl(152, 60%, 92%)", x: 340, y: 345, width: 240, height: 50, status: "healthy" },
  // Databases
  { id: "db-postgres", label: "PostgreSQL", sublabel: "Primary Data Store", icon: Database, color: "hsl(220, 80%, 55%)", bg: "hsl(220, 80%, 95%)", x: 120, y: 445, width: 150, height: 55, status: "healthy" },
  { id: "db-graph", label: "Graph Database", sublabel: "Neo4j · Relationships", icon: Network, color: "hsl(262, 80%, 55%)", bg: "hsl(262, 80%, 95%)", x: 380, y: 445, width: 160, height: 55, status: "healthy" },
  { id: "db-vector", label: "Vector Database", sublabel: "Embeddings · Semantic Search", icon: Cpu, color: "hsl(38, 92%, 50%)", bg: "hsl(38, 92%, 92%)", x: 640, y: 445, width: 170, height: 55, status: "healthy" },
];

const archConnections: ArchConnection[] = [
  { from: "client", to: "gateway", label: "HTTPS", animated: true },
  { from: "gateway", to: "ms-projects" },
  { from: "gateway", to: "ms-crm" },
  { from: "gateway", to: "ms-docs" },
  { from: "gateway", to: "ms-knowledge" },
  { from: "gateway", to: "ms-analytics" },
  { from: "gateway", to: "ms-ai" },
  { from: "ms-projects", to: "eventbus" },
  { from: "ms-crm", to: "eventbus" },
  { from: "ms-docs", to: "eventbus" },
  { from: "ms-knowledge", to: "eventbus" },
  { from: "ms-analytics", to: "eventbus" },
  { from: "ms-ai", to: "eventbus" },
  { from: "eventbus", to: "db-postgres" },
  { from: "eventbus", to: "db-graph" },
  { from: "eventbus", to: "db-vector" },
];

const nodeMap = Object.fromEntries(archNodes.map(n => [n.id, n]));

// --- SVG Architecture Diagram ---

function ArchitectureDiagram() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const connectedTo = hoveredNode
    ? new Set(archConnections.filter(c => c.from === hoveredNode || c.to === hoveredNode).flatMap(c => [c.from, c.to]))
    : null;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox="0 0 960 530" className="w-full min-w-[700px]" style={{ height: "530px" }}>
        <defs>
          <filter id="arch-shadow" x="-5%" y="-5%" width="110%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.08" />
          </filter>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--muted-foreground))" opacity="0.4" />
          </marker>
          {/* Animated dash for data flow */}
          <style>{`
            @keyframes dash { to { stroke-dashoffset: -20; } }
            .flow-line { animation: dash 1.5s linear infinite; }
          `}</style>
        </defs>

        {/* Connections */}
        {archConnections.map((conn, i) => {
          const from = nodeMap[conn.from];
          const to = nodeMap[conn.to];
          if (!from || !to) return null;

          const x1 = from.x + from.width / 2;
          const y1 = from.y + from.height;
          const x2 = to.x + to.width / 2;
          const y2 = to.y;

          const opacity = hoveredNode ? (connectedTo?.has(conn.from) && connectedTo?.has(conn.to) ? 0.7 : 0.1) : 0.3;

          return (
            <g key={i}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={hoveredNode && connectedTo?.has(conn.from) && connectedTo?.has(conn.to) ? 2 : 1}
                strokeDasharray={conn.animated ? "6 4" : "none"}
                className={conn.animated ? "flow-line" : ""}
                opacity={opacity}
                markerEnd="url(#arrowhead)"
              />
              {conn.label && (
                <text x={(x1 + x2) / 2 + 8} y={(y1 + y2) / 2} fontSize="9" fill="hsl(var(--muted-foreground))" opacity={opacity}>
                  {conn.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {archNodes.map(node => {
          const opacity = hoveredNode ? (connectedTo?.has(node.id) || node.id === hoveredNode ? 1 : 0.25) : 1;
          const isHovered = node.id === hoveredNode;

          return (
            <g
              key={node.id}
              style={{ opacity, transition: "opacity 0.2s" }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
            >
              <rect
                x={node.x} y={node.y}
                width={node.width} height={node.height}
                rx={10} ry={10}
                fill={node.bg}
                stroke={node.color}
                strokeWidth={isHovered ? 2 : 1}
                filter="url(#arch-shadow)"
              />
              {/* Status dot */}
              <circle
                cx={node.x + node.width - 12} cy={node.y + 12} r={4}
                fill={node.status === "healthy" ? "hsl(152, 60%, 48%)" : node.status === "warning" ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)"}
              />
              <text x={node.x + node.width / 2} y={node.y + node.height / 2 - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill={node.color}>
                {node.label}
              </text>
              <text x={node.x + node.width / 2} y={node.y + node.height / 2 + 12} textAnchor="middle" fontSize="8.5" fill={node.color} opacity={0.7}>
                {node.sublabel}
              </text>
            </g>
          );
        })}

        {/* Layer Labels */}
        {[
          { y: 50, label: "PRESENTATION" },
          { y: 150, label: "API LAYER" },
          { y: 260, label: "MICROSERVICES" },
          { y: 365, label: "MESSAGING" },
          { y: 465, label: "DATA LAYER" },
        ].map(l => (
          <text key={l.label} x={12} y={l.y} fontSize="8" fontWeight="600" fill="hsl(var(--muted-foreground))" opacity={0.5} letterSpacing="1.5">
            {l.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// --- Service Health ---

const services = [
  { name: "API Gateway", status: "healthy", uptime: "99.98%", latency: "12ms", icon: Shield },
  { name: "PostgreSQL", status: "healthy", uptime: "99.99%", latency: "3ms", icon: Database },
  { name: "Graph Database", status: "healthy", uptime: "99.95%", latency: "8ms", icon: Network },
  { name: "Vector Database", status: "healthy", uptime: "99.92%", latency: "15ms", icon: Cpu },
  { name: "Event Bus", status: "healthy", uptime: "99.97%", latency: "2ms", icon: Radio },
  { name: "AI Agents Service", status: "warning", uptime: "98.4%", latency: "340ms", icon: Zap },
];

const statusBadge: Record<string, string> = {
  healthy: "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))] border-[hsl(var(--cbs-green))]/20",
  warning: "bg-[hsl(var(--cbs-amber))]/15 text-[hsl(var(--cbs-amber))] border-[hsl(var(--cbs-amber))]/20",
  degraded: "bg-destructive/15 text-destructive border-destructive/20",
};

// --- Email Notification Preferences ---

interface NotificationPreferences {
  email_enabled: boolean;
  email_events: Record<string, boolean>;
}

const EMAIL_EVENT_LABELS: Record<string, { label: string; desc: string }> = {
  QuoteAccepted: {
    label: "Cotizaciones aceptadas",
    desc: "Cuando un cliente acepta una cotizacion",
  },
  SalesOrderCreated: {
    label: "Ordenes de venta creadas",
    desc: "Cuando se genera una nueva orden de venta",
  },
  WorkflowFailed: {
    label: "Workflows fallidos",
    desc: "Cuando un workflow automatizado falla",
  },
  InventoryLowThresholdDetected: {
    label: "Stock bajo",
    desc: "Cuando un producto alcanza el umbral minimo de inventario",
  },
  InvoiceOverdue: {
    label: "Facturas vencidas",
    desc: "Cuando una factura supera su fecha de vencimiento sin pago",
  },
};

function useNotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<NotificationPreferences>("/notifications/preferences")
      .then(setPrefs)
      .catch(() => setPrefs({ email_enabled: true, email_events: {} }))
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback(async (patch: Partial<NotificationPreferences>) => {
    setSaving(true);
    try {
      const updated = await api.put<NotificationPreferences>(
        "/notifications/preferences",
        patch
      );
      setPrefs(updated);
    } catch {
      // Revert handled by re-reading state
    } finally {
      setSaving(false);
    }
  }, []);

  return { prefs, loading, saving, update };
}

// --- Main ---

const Settings = () => {
  const [activeTab, setActiveTab] = useState("architecture");
  const { prefs: notifPrefs, loading: notifLoading, saving: notifSaving, update: updateNotifPrefs } = useNotificationPreferences();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform configuration, architecture, and system health.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="architecture" className="gap-1.5"><Layers className="h-3.5 w-3.5" /> Architecture</TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> System Health</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
          <TabsTrigger value="general" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" /> General</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Team</TabsTrigger>
        </TabsList>

        {/* Architecture Tab */}
        <TabsContent value="architecture" className="mt-4 space-y-6">
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" /> Platform Architecture
              </CardTitle>
              <p className="text-xs text-muted-foreground">Hover over components to trace data flow paths.</p>
            </CardHeader>
            <CardContent>
              <ArchitectureDiagram />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "API Gateway", desc: "Handles authentication, rate limiting, request validation, and intelligent routing to microservices. Supports REST and GraphQL.", icon: Shield, color: "text-accent", bg: "bg-accent/10" },
              { title: "Event Bus", desc: "Asynchronous pub/sub messaging enables loose coupling between modules. When a CRM deal closes, events trigger project creation automatically.", icon: Radio, color: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/10" },
              { title: "Data Layer", desc: "PostgreSQL for structured data, Neo4j for knowledge graph relationships, and a Vector DB for semantic search and AI embeddings.", icon: Database, color: "text-primary", bg: "bg-primary/10" },
            ].map(item => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border border-border/60">
                  <CardContent className="p-5 space-y-3">
                    <div className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="health" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(svc => {
              const Icon = svc.icon;
              return (
                <Card key={svc.name} className="border border-border/60">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">{svc.name}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadge[svc.status]}`}>
                        {svc.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-muted/50 p-2 text-center">
                        <p className="text-sm font-semibold">{svc.uptime}</p>
                        <p className="text-[10px] text-muted-foreground">Uptime</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2 text-center">
                        <p className="text-sm font-semibold">{svc.latency}</p>
                        <p className="text-[10px] text-muted-foreground">Latency</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-4 space-y-6">
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" /> Email Notifications
                </CardTitle>
                {notifSaving && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Control which business events trigger email alerts. Changes are saved automatically.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {notifLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Loading preferences...</span>
                </div>
              ) : (
                <>
                  {/* Global toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <div>
                      <p className="text-sm font-semibold">Email notifications</p>
                      <p className="text-[11px] text-muted-foreground">
                        Master switch — disable to stop all email alerts
                      </p>
                    </div>
                    <Switch
                      checked={notifPrefs?.email_enabled ?? true}
                      onCheckedChange={(checked) =>
                        updateNotifPrefs({ email_enabled: checked })
                      }
                    />
                  </div>

                  <Separator />

                  {/* Per-event toggles */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Event Types
                    </p>
                    {Object.entries(EMAIL_EVENT_LABELS).map(([eventKey, meta]) => {
                      const enabled = notifPrefs?.email_events?.[eventKey] ?? true;
                      const globalOff = !(notifPrefs?.email_enabled ?? true);

                      return (
                        <div
                          key={eventKey}
                          className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 transition-colors ${
                            globalOff ? "opacity-50" : ""
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium">{meta.label}</p>
                            <p className="text-[11px] text-muted-foreground">{meta.desc}</p>
                          </div>
                          <Switch
                            checked={enabled && !globalOff}
                            disabled={globalOff}
                            onCheckedChange={(checked) =>
                              updateNotifPrefs({
                                email_events: { [eventKey]: checked },
                              })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Status summary */}
                  <Separator />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--cbs-green))]" />
                    <span>
                      {notifPrefs?.email_enabled
                        ? `${
                            Object.values(notifPrefs?.email_events ?? {}).filter(Boolean).length
                          } of ${Object.keys(EMAIL_EVENT_LABELS).length} event types active`
                        : "All email notifications disabled"}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Real-time notifications info card */}
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Real-time Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                In-app notifications are delivered via WebSocket and always active while you are connected.
                They cover 13 event types including workflow status, sales activity, inventory alerts,
                portal interactions, and accounting updates. Use the bell icon in the header to view them.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general" className="mt-4 space-y-6">
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Workspace Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label className="text-xs">Workspace Name</Label>
                  <Input defaultValue="Composable OS" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Workspace URL</Label>
                  <Input defaultValue="composable-os.app" className="h-9" disabled />
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-semibold">Preferences</p>
                {[
                  { label: "Enable AI recommendations", desc: "Show AI insights across all modules", default: true },
                  { label: "Auto-create projects from deals", desc: "Automatically generate a project when a CRM deal closes", default: true },
                  { label: "Knowledge graph auto-linking", desc: "Automatically detect and link entities in documents", default: true },
                ].map(pref => (
                  <div key={pref.label} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{pref.label}</p>
                      <p className="text-[11px] text-muted-foreground">{pref.desc}</p>
                    </div>
                    <Switch defaultChecked={pref.default} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-4">
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Team Members</CardTitle>
                <Button size="sm" className="h-8 text-xs gap-1"><Users className="h-3.5 w-3.5" /> Invite</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { name: "Sarah Chen", email: "sarah@composable.dev", role: "Admin", initials: "SC" },
                { name: "James Park", email: "james@composable.dev", role: "Admin", initials: "JP" },
                { name: "Alex Kim", email: "alex@composable.dev", role: "Member", initials: "AK" },
                { name: "Maria Lopez", email: "maria@composable.dev", role: "Member", initials: "ML" },
                { name: "Sam Rivera", email: "sam@composable.dev", role: "Member", initials: "SR" },
                { name: "Jordan Davis", email: "jordan@composable.dev", role: "Member", initials: "JD" },
              ].map(member => (
                <div key={member.email} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{member.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-[11px] text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-2 py-0 ${member.role === "Admin" ? "bg-primary/10 text-primary border-primary/20" : ""}`}>
                    {member.role}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
