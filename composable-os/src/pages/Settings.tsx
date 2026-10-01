import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { healthService, type HealthCheck, type HealthStatus } from "@/services/health";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageSelector } from "@/components/LanguageSelector";
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
import { useEnumLabel } from "@/i18n/enumLabel";
import { useFormat } from "@/i18n/useFormat";
import { useT } from "@/i18n/useT";
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
  RefreshCw,
} from "lucide-react";

// --- Architecture Data ---

/** Clave del nodo en el catalogo (`settings:architecture.nodes.<clave>`). */
type NodeKey =
  | "client" | "gateway" | "projects" | "crm" | "docs" | "knowledge" | "analytics" | "ai"
  | "eventbus" | "postgres" | "graph" | "vector";

interface ArchNode {
  id: string;
  /** El nombre y el subtitulo viven en el catalogo bajo esta clave. */
  key: NodeKey;
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
  { id: "client", key: "client", icon: Globe, color: "hsl(262, 80%, 55%)", bg: "hsl(262, 80%, 95%)", x: 380, y: 30, width: 160, height: 60, status: "healthy" },
  { id: "gateway", key: "gateway", icon: Shield, color: "hsl(220, 80%, 55%)", bg: "hsl(220, 80%, 95%)", x: 380, y: 130, width: 160, height: 60, status: "healthy" },
  // Microservices row
  { id: "ms-projects", key: "projects", icon: Box, color: "hsl(262, 80%, 55%)", bg: "hsl(262, 80%, 95%)", x: 60, y: 240, width: 120, height: 55, status: "healthy" },
  { id: "ms-crm", key: "crm", icon: Box, color: "hsl(220, 80%, 55%)", bg: "hsl(220, 80%, 95%)", x: 210, y: 240, width: 120, height: 55, status: "healthy" },
  { id: "ms-docs", key: "docs", icon: Box, color: "hsl(152, 60%, 48%)", bg: "hsl(152, 60%, 92%)", x: 360, y: 240, width: 120, height: 55, status: "healthy" },
  { id: "ms-knowledge", key: "knowledge", icon: Box, color: "hsl(38, 92%, 50%)", bg: "hsl(38, 92%, 92%)", x: 510, y: 240, width: 120, height: 55, status: "healthy" },
  { id: "ms-analytics", key: "analytics", icon: Box, color: "hsl(262, 80%, 55%)", bg: "hsl(262, 80%, 95%)", x: 660, y: 240, width: 120, height: 55, status: "healthy" },
  { id: "ms-ai", key: "ai", icon: Box, color: "hsl(220, 80%, 55%)", bg: "hsl(220, 80%, 95%)", x: 810, y: 240, width: 120, height: 55, status: "warning" },
  // Event Bus
  { id: "eventbus", key: "eventbus", icon: Radio, color: "hsl(152, 60%, 48%)", bg: "hsl(152, 60%, 92%)", x: 340, y: 345, width: 240, height: 50, status: "healthy" },
  // Databases
  { id: "db-postgres", key: "postgres", icon: Database, color: "hsl(220, 80%, 55%)", bg: "hsl(220, 80%, 95%)", x: 120, y: 445, width: 150, height: 55, status: "healthy" },
  { id: "db-graph", key: "graph", icon: Network, color: "hsl(262, 80%, 55%)", bg: "hsl(262, 80%, 95%)", x: 380, y: 445, width: 160, height: 55, status: "healthy" },
  { id: "db-vector", key: "vector", icon: Cpu, color: "hsl(38, 92%, 50%)", bg: "hsl(38, 92%, 92%)", x: 640, y: 445, width: 170, height: 55, status: "healthy" },
];

const archConnections: ArchConnection[] = [
  { from: "client", to: "gateway", label: "HTTPS", animated: true }, // i18n-ok: nombre de protocolo
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

/** Rotulos de capa del diagrama: la posicion vertical y la clave del catalogo. */
const ARCH_LAYERS = [
  { y: 50, key: "presentation" },
  { y: 150, key: "api" },
  { y: 260, key: "microservices" },
  { y: 365, key: "messaging" },
  { y: 465, key: "data" },
] as const;

/** Las tres tarjetas bajo el diagrama; el texto vive en el catalogo. */
const ARCH_CARDS = [
  { key: "gateway", icon: Shield, color: "text-accent", bg: "bg-accent/10" },
  { key: "eventbus", icon: Radio, color: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/10" },
  { key: "data", icon: Database, color: "text-primary", bg: "bg-primary/10" },
] as const;

// --- SVG Architecture Diagram ---

function ArchitectureDiagram() {
  const t = useT();
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
          <style>{/* i18n-ok: CSS */}{`
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
                {t(`settings:architecture.nodes.${node.key}.label`)}
              </text>
              <text x={node.x + node.width / 2} y={node.y + node.height / 2 + 12} textAnchor="middle" fontSize="8.5" fill={node.color} opacity={0.7}>
                {t(`settings:architecture.nodes.${node.key}.sublabel`)}
              </text>
            </g>
          );
        })}

        {/* Layer Labels */}
        {ARCH_LAYERS.map(l => (
          <text key={l.key} x={12} y={l.y} fontSize="8" fontWeight="600" fill="hsl(var(--muted-foreground))" opacity={0.5} letterSpacing="1.5">
            {t(`settings:architecture.layers.${l.key}`)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// --- Service Health ---

const statusBadge: Record<HealthStatus | string, string> = {
  healthy:   "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))] border-[hsl(var(--cbs-green))]/20",
  degraded:  "bg-[hsl(var(--cbs-amber))]/15 text-[hsl(var(--cbs-amber))] border-[hsl(var(--cbs-amber))]/20",
  unhealthy: "bg-destructive/15 text-destructive border-destructive/20",
};

// Maps backend check name → icon. The display name comes from the catalogue
// (`settings:health.services.<name>`) and falls back to the raw check name.
const SERVICE_ICONS: Record<string, typeof Shield> = {
  api:      Shield,
  postgres: Database,
};

function ServiceCard({ check }: { check: HealthCheck }) {
  const t = useT();
  const label = useEnumLabel();
  const { formatMilliseconds } = useFormat();
  const Icon = SERVICE_ICONS[check.name] ?? HardDrive;
  return (
    <Card className="border border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{label("settings:health.services", check.name)}</span>
          </div>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadge[check.status] ?? ""}`}>
            {label("settings:health.status", check.status)}
          </Badge>
        </div>
        <div className="rounded-md bg-muted/50 p-2 text-center">
          <p className="text-sm font-semibold">{formatMilliseconds(check.latency_ms)}</p>
          <p className="text-[10px] text-muted-foreground">{t("settings:health.latency")}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemHealthPanel() {
  const t = useT();
  const label = useEnumLabel();
  const { formatRelativeTime } = useFormat();
  const { data, isLoading, error, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["system-health"],
    queryFn: healthService.getHealth,
    refetchInterval: 30_000,
    retry: 1,
  });

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {dataUpdatedAt
            ? t("settings:health.updated", { when: formatRelativeTime(dataUpdatedAt) })
            : t("settings:health.loading")}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          {t("settings:health.refresh")}
        </Button>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-center gap-2 py-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {t("settings:health.error")}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      )}

      {/* Service cards */}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            {data.checks.map((check) => (
              <ServiceCard key={check.name} check={check} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("settings:health.overall")}{" "}
            <span className={
              data.status === "healthy" ? "text-[hsl(var(--cbs-green))]" :
              data.status === "degraded" ? "text-[hsl(var(--cbs-amber))]" :
              "text-destructive"
            }>
              {label("settings:health.status", data.status)}
            </span>
            {" · "}{t("settings:health.version", { version: data.version })}
          </p>
        </>
      )}
    </div>
  );
}

// --- Email Notification Preferences ---

interface NotificationPreferences {
  email_enabled: boolean;
  email_events: Record<string, boolean>;
}

/** Eventos que pueden avisar por correo; etiqueta y descripcion en el catalogo. */
const EMAIL_EVENT_KEYS = [
  "QuoteAccepted",
  "SalesOrderCreated",
  "WorkflowFailed",
  "InventoryLowThresholdDetected",
  "InvoiceOverdue",
] as const;

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

/** Preferencias de la pestana General. Hoy no se guardan: son interruptores de muestra. */
const GENERAL_PREFS = [
  { key: "ai", default: true },
  { key: "projects", default: true },
  { key: "graph", default: true },
] as const;

/** Miembros de muestra de la pestana Equipo (datos ficticios, no vienen del backend). */
const SAMPLE_MEMBERS = [
  { name: "Sarah Chen", email: "sarah@composable.dev", role: "admin", initials: "SC" },
  { name: "James Park", email: "james@composable.dev", role: "admin", initials: "JP" },
  { name: "Alex Kim", email: "alex@composable.dev", role: "member", initials: "AK" },
  { name: "Maria Lopez", email: "maria@composable.dev", role: "member", initials: "ML" },
  { name: "Sam Rivera", email: "sam@composable.dev", role: "member", initials: "SR" },
  { name: "Jordan Davis", email: "jordan@composable.dev", role: "member", initials: "JD" },
];

// --- Main ---

const Settings = () => {
  const t = useT();
  const label = useEnumLabel();
  const [activeTab, setActiveTab] = useState("architecture");
  const { prefs: notifPrefs, loading: notifLoading, saving: notifSaving, update: updateNotifPrefs } = useNotificationPreferences();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings:title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("settings:subtitle")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="architecture" className="gap-1.5"><Layers className="h-3.5 w-3.5" /> {t("settings:tabs.architecture")}</TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> {t("settings:tabs.health")}</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> {t("settings:tabs.notifications")}</TabsTrigger>
          <TabsTrigger value="general" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" /> {t("settings:tabs.general")}</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Users className="h-3.5 w-3.5" /> {t("settings:tabs.team")}</TabsTrigger>
        </TabsList>

        {/* Architecture Tab */}
        <TabsContent value="architecture" className="mt-4 space-y-6">
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" /> {t("settings:architecture.title")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t("settings:architecture.hint")}</p>
            </CardHeader>
            <CardContent>
              <ArchitectureDiagram />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ARCH_CARDS.map(item => {
              const Icon = item.icon;
              return (
                <Card key={item.key} className="border border-border/60">
                  <CardContent className="p-5 space-y-3">
                    <div className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <p className="text-sm font-semibold">{t(`settings:architecture.cards.${item.key}.title`)}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t(`settings:architecture.cards.${item.key}.description`)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="health" className="mt-4 space-y-4">
          <SystemHealthPanel />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-4 space-y-6">
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" /> {t("settings:notifications.title")}
                </CardTitle>
                {notifSaving && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> {t("settings:notifications.saving")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("settings:notifications.intro")}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {notifLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">{t("settings:notifications.loading")}</span>
                </div>
              ) : (
                <>
                  {/* Global toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                    <div>
                      <p className="text-sm font-semibold">{t("settings:notifications.master")}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("settings:notifications.masterHint")}
                      </p>
                    </div>
                    <Switch
                      checked={notifPrefs?.email_enabled ?? true}
                      aria-label={t("settings:notifications.master")}
                      onCheckedChange={(checked) =>
                        updateNotifPrefs({ email_enabled: checked })
                      }
                    />
                  </div>

                  <Separator />

                  {/* Per-event toggles */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {t("settings:notifications.eventTypes")}
                    </p>
                    {EMAIL_EVENT_KEYS.map((eventKey) => {
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
                            <p className="text-sm font-medium">{t(`settings:notifications.events.${eventKey}.label`)}</p>
                            <p className="text-[11px] text-muted-foreground">{t(`settings:notifications.events.${eventKey}.desc`)}</p>
                          </div>
                          <Switch
                            checked={enabled && !globalOff}
                            disabled={globalOff}
                            aria-label={t(`settings:notifications.events.${eventKey}.label`)}
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
                        ? t("settings:notifications.summaryOn", {
                            active: Object.values(notifPrefs?.email_events ?? {}).filter(Boolean).length,
                            total: EMAIL_EVENT_KEYS.length,
                          })
                        : t("settings:notifications.summaryOff")}
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
                <Bell className="h-4 w-4 text-primary" /> {t("settings:notifications.realtimeTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("settings:notifications.realtimeBody")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general" className="mt-4 space-y-6">
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t("settings:general.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label className="text-xs" htmlFor="workspace-name">{t("settings:general.name")}</Label>
                  <Input id="workspace-name" defaultValue="Composable OS" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs" htmlFor="workspace-url">{t("settings:general.url")}</Label>
                  <Input id="workspace-url" defaultValue="composable-os.app" className="h-9" disabled />
                </div>
                {/* Se dibuja solo cuando hay mas de un idioma enviado */}
                <LanguageSelector />
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-semibold">{t("settings:general.preferences")}</p>
                {GENERAL_PREFS.map(pref => (
                  <div key={pref.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t(`settings:general.prefs.${pref.key}.label`)}</p>
                      <p className="text-[11px] text-muted-foreground">{t(`settings:general.prefs.${pref.key}.desc`)}</p>
                    </div>
                    <Switch
                      defaultChecked={pref.default}
                      aria-label={t(`settings:general.prefs.${pref.key}.label`)}
                    />
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
                <CardTitle className="text-sm font-semibold">{t("settings:team.title")}</CardTitle>
                <Button size="sm" className="h-8 text-xs gap-1"><Users className="h-3.5 w-3.5" /> {t("settings:team.invite")}</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {SAMPLE_MEMBERS.map(member => (
                <div key={member.email} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{member.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-[11px] text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-2 py-0 ${member.role === "admin" ? "bg-primary/10 text-primary border-primary/20" : ""}`}>
                    {label("settings:team.role", member.role)}
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
