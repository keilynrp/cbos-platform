import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare, Bot, Send, Plus, Trash2, GripVertical, Play, Pause,
  Settings, Globe, Smartphone, Mail, Zap, Brain, Target, Search,
  ArrowRight, ArrowDown, ChevronRight, CheckCircle2, AlertTriangle,
  Clock, Eye, Copy, ExternalLink, BarChart3, TrendingUp, Users,
  Sparkles, GitBranch, Loader2, Phone, Hash, Webhook,
  FolderKanban, FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Types ──────────────────────────────────────────────────

interface ChatbotConfig {
  id: string;
  name: string;
  description: string;
  agent: string | null;
  status: "active" | "draft" | "paused";
  channels: ChannelConfig[];
  nodes: FlowNode[];
  metrics: { conversations: number; messages: number; resolution: number; satisfaction: number };
}

interface ChannelConfig {
  type: "whatsapp" | "telegram" | "email" | "web" | "slack";
  enabled: boolean;
  config: Record<string, string>;
  status: "connected" | "pending" | "disconnected";
}

interface FlowNode {
  id: string;
  type: "trigger" | "message" | "condition" | "action" | "agent-handoff" | "api-call";
  label: string;
  config: Record<string, any>;
}

// ── Mock Data ──────────────────────────────────────────────

const availableAgents = [
  { id: "research", name: "Research Agent", role: "Knowledge Discovery", icon: Search, color: "text-primary", bg: "bg-primary/10" },
  { id: "marketing", name: "Marketing Agent", role: "Campaign Optimization", icon: Target, color: "text-accent", bg: "bg-accent/10" },
  { id: "project", name: "Project Assistant", role: "Sprint & Task Management", icon: FolderKanban, color: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/10" },
  { id: "analyst", name: "Data Analyst Agent", role: "Business Intelligence", icon: BarChart3, color: "text-[hsl(var(--cbs-amber))]", bg: "bg-[hsl(var(--cbs-amber))]/10" },
];

const chatbots: ChatbotConfig[] = [
  {
    id: "cb-1",
    name: "Customer Support Bot",
    description: "Handles tier-1 customer inquiries across all channels with AI agent escalation",
    agent: "research",
    status: "active",
    channels: [
      { type: "whatsapp", enabled: true, config: { phone: "+1 (555) 012-3456", businessId: "BA-98234" }, status: "connected" },
      { type: "telegram", enabled: true, config: { botToken: "••••••••3k9F", username: "@composable_support" }, status: "connected" },
      { type: "email", enabled: true, config: { address: "support@composable.io", smtpHost: "smtp.composable.io" }, status: "connected" },
      { type: "web", enabled: true, config: { widgetId: "w-48291", domain: "composable.io" }, status: "connected" },
      { type: "slack", enabled: false, config: {}, status: "disconnected" },
    ],
    nodes: [
      { id: "n1", type: "trigger", label: "User Message Received", config: { channels: ["all"] } },
      { id: "n2", type: "message", label: "Welcome Greeting", config: { text: "Hi! 👋 I'm your Composable OS assistant. How can I help?" } },
      { id: "n3", type: "condition", label: "Intent Classification", config: { conditions: ["billing", "technical", "general"] } },
      { id: "n4", type: "agent-handoff", label: "Escalate to AI Agent", config: { agent: "research", threshold: 0.6 } },
      { id: "n5", type: "action", label: "Create Support Ticket", config: { system: "CRM", action: "create_ticket" } },
      { id: "n6", type: "message", label: "Resolution Confirmation", config: { text: "Was this helpful? Rate your experience:" } },
    ],
    metrics: { conversations: 12480, messages: 48200, resolution: 87, satisfaction: 4.6 },
  },
  {
    id: "cb-2",
    name: "Sales Qualifier Bot",
    description: "Qualifies inbound leads and routes to appropriate sales agent based on ICP scoring",
    agent: "marketing",
    status: "active",
    channels: [
      { type: "web", enabled: true, config: { widgetId: "w-91823", domain: "composable.io/pricing" }, status: "connected" },
      { type: "whatsapp", enabled: true, config: { phone: "+1 (555) 987-6543" }, status: "connected" },
      { type: "email", enabled: false, config: {}, status: "disconnected" },
      { type: "telegram", enabled: false, config: {}, status: "disconnected" },
      { type: "slack", enabled: false, config: {}, status: "disconnected" },
    ],
    nodes: [
      { id: "n1", type: "trigger", label: "Pricing Page Visit", config: { channels: ["web"] } },
      { id: "n2", type: "message", label: "Proactive Greeting", config: { text: "Looking for the right plan? I can help you find the best fit." } },
      { id: "n3", type: "condition", label: "Lead Scoring", config: { conditions: ["enterprise", "team", "starter"] } },
      { id: "n4", type: "agent-handoff", label: "Route to Marketing Agent", config: { agent: "marketing" } },
    ],
    metrics: { conversations: 3840, messages: 11200, resolution: 72, satisfaction: 4.3 },
  },
  {
    id: "cb-3",
    name: "Internal Ops Bot",
    description: "Assists team members with project updates, sprint status, and internal knowledge base queries",
    agent: "project",
    status: "draft",
    channels: [
      { type: "slack", enabled: true, config: { workspace: "composable-team", channel: "#ops-bot" }, status: "pending" },
      { type: "web", enabled: false, config: {}, status: "disconnected" },
      { type: "whatsapp", enabled: false, config: {}, status: "disconnected" },
      { type: "telegram", enabled: false, config: {}, status: "disconnected" },
      { type: "email", enabled: false, config: {}, status: "disconnected" },
    ],
    nodes: [
      { id: "n1", type: "trigger", label: "Slack Mention", config: { channels: ["slack"] } },
      { id: "n2", type: "agent-handoff", label: "Project Assistant", config: { agent: "project" } },
    ],
    metrics: { conversations: 0, messages: 0, resolution: 0, satisfaction: 0 },
  },
];

const channelMeta: Record<string, { label: string; icon: typeof Globe; color: string; bg: string }> = {
  whatsapp: { label: "WhatsApp", icon: Phone, color: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/10" },
  telegram: { label: "Telegram", icon: Send, color: "text-accent", bg: "bg-accent/10" },
  email: { label: "Email", icon: Mail, color: "text-[hsl(var(--cbs-amber))]", bg: "bg-[hsl(var(--cbs-amber))]/10" },
  web: { label: "Web Widget", icon: Globe, color: "text-primary", bg: "bg-primary/10" },
  slack: { label: "Slack", icon: Hash, color: "text-[hsl(var(--cbs-purple))]", bg: "bg-[hsl(var(--cbs-purple))]/10" },
};

const nodeTypeMeta: Record<string, { icon: typeof MessageSquare; color: string; bg: string }> = {
  trigger: { icon: Zap, color: "text-[hsl(var(--cbs-amber))]", bg: "bg-[hsl(var(--cbs-amber))]/10" },
  message: { icon: MessageSquare, color: "text-primary", bg: "bg-primary/10" },
  condition: { icon: GitBranch, color: "text-accent", bg: "bg-accent/10" },
  action: { icon: Play, color: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/10" },
  "agent-handoff": { icon: Brain, color: "text-primary", bg: "bg-primary/10" },
  "api-call": { icon: Webhook, color: "text-muted-foreground", bg: "bg-muted" },
};

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: "Active", class: "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))] border-[hsl(var(--cbs-green))]/20" },
  draft: { label: "Draft", class: "bg-muted text-muted-foreground border-border" },
  paused: { label: "Paused", class: "bg-[hsl(var(--cbs-amber))]/15 text-[hsl(var(--cbs-amber))] border-[hsl(var(--cbs-amber))]/20" },
};

// ── Chatbot List View ──────────────────────────────────────

function ChatbotListView({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Conversations", value: "16,320", change: "+22.4%", icon: MessageSquare },
          { label: "Messages Processed", value: "59,400", change: "+18.1%", icon: Send },
          { label: "Avg Resolution Rate", value: "84%", change: "+5.2%", icon: CheckCircle2 },
          { label: "Avg Satisfaction", value: "4.5/5", change: "+0.3", icon: TrendingUp },
        ].map((kpi) => (
          <Card key={kpi.label} className="border border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                <kpi.icon className="h-3.5 w-3.5 text-primary/50" />
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
              <span className="text-[10px] font-medium text-[hsl(var(--cbs-green))]">{kpi.change} vs last month</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chatbot Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {chatbots.map((bot) => {
          const linkedAgent = availableAgents.find((a) => a.id === bot.agent);
          const activeChannels = bot.channels.filter((ch) => ch.enabled);
          const st = statusConfig[bot.status];
          return (
            <Card
              key={bot.id}
              className="border border-border/60 hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => onSelect(bot.id)}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">{bot.name}</p>
                      <p className="text-[10px] text-muted-foreground">{bot.nodes.length} flow nodes</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${st.class}`}>{st.label}</Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{bot.description}</p>

                {/* Linked Agent */}
                {linkedAgent && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/40">
                    <div className={`h-6 w-6 rounded-md ${linkedAgent.bg} flex items-center justify-center`}>
                      <linkedAgent.icon className={`h-3 w-3 ${linkedAgent.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">{linkedAgent.name}</p>
                      <p className="text-[9px] text-muted-foreground">{linkedAgent.role}</p>
                    </div>
                    <Badge variant="secondary" className="text-[8px]">AI Agent</Badge>
                  </div>
                )}

                {/* Channels */}
                <div className="flex items-center gap-1.5">
                  {activeChannels.map((ch) => {
                    const meta = channelMeta[ch.type];
                    return (
                      <div key={ch.type} className={`h-7 w-7 rounded-md ${meta.bg} flex items-center justify-center`} title={meta.label}>
                        <meta.icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      </div>
                    );
                  })}
                  {activeChannels.length === 0 && <span className="text-[10px] text-muted-foreground">No channels configured</span>}
                </div>

                {/* Metrics */}
                {bot.status !== "draft" && (
                  <div className="flex items-center justify-between pt-3 border-t border-border/40 text-[10px]">
                    <span className="text-muted-foreground">{bot.metrics.conversations.toLocaleString()} conversations</span>
                    <span className="text-muted-foreground">{bot.metrics.resolution}% resolved</span>
                    <span className="font-medium text-[hsl(var(--cbs-green))]">★ {bot.metrics.satisfaction}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* New Bot Card */}
        <Card className="border border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer group flex items-center justify-center min-h-[260px]">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Create New Chatbot</p>
              <p className="text-[10px] text-muted-foreground mt-1">Design conversational flows with AI agent integration</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Detail View ────────────────────────────────────────────

function ChatbotDetailView({ bot, onBack }: { bot: ChatbotConfig; onBack: () => void }) {
  const [detailTab, setDetailTab] = useState("flow");
  const navigate = useNavigate();
  const linkedAgent = availableAgents.find((a) => a.id === bot.agent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={onBack}>
            ← Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{bot.name}</h2>
              <Badge variant="outline" className={`text-[9px] ${statusConfig[bot.status].class}`}>{statusConfig[bot.status].label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{bot.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            <Eye className="h-3 w-3" /> Preview
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            <Copy className="h-3 w-3" /> Duplicate
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1">
            <Play className="h-3 w-3" /> Deploy
          </Button>
        </div>
      </div>

      <Tabs value={detailTab} onValueChange={setDetailTab}>
        <TabsList className="h-9">
          <TabsTrigger value="flow" className="text-xs gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Conversation Flow</TabsTrigger>
          <TabsTrigger value="channels" className="text-xs gap-1.5"><Globe className="h-3.5 w-3.5" /> Channels</TabsTrigger>
          <TabsTrigger value="agent" className="text-xs gap-1.5"><Brain className="h-3.5 w-3.5" /> AI Agent</TabsTrigger>
          <TabsTrigger value="testing" className="text-xs gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Test Chat</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
        </TabsList>

        {/* ── Flow Designer ── */}
        <TabsContent value="flow" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Flow Canvas */}
            <div className="lg:col-span-2">
              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Conversation Flow</CardTitle>
                    <div className="flex gap-1.5">
                      {(["trigger", "message", "condition", "agent-handoff", "action", "api-call"] as const).map((t) => {
                        const meta = nodeTypeMeta[t];
                        return (
                          <Button key={t} variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                            <meta.icon className={`h-3 w-3 ${meta.color}`} />
                            {t === "agent-handoff" ? "Agent" : t === "api-call" ? "API" : t.charAt(0).toUpperCase() + t.slice(1)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bot.nodes.map((node, i) => {
                    const meta = nodeTypeMeta[node.type];
                    return (
                      <div key={node.id}>
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/30 transition-colors group cursor-pointer">
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          <div className={`h-8 w-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                            <meta.icon className={`h-4 w-4 ${meta.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold">{node.label}</p>
                              <Badge variant="secondary" className="text-[8px]">{node.type}</Badge>
                            </div>
                            {node.config.text && (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">"{node.config.text}"</p>
                            )}
                            {node.config.agent && (
                              <p className="text-[10px] text-primary mt-0.5">
                                → {availableAgents.find((a) => a.id === node.config.agent)?.name || node.config.agent}
                              </p>
                            )}
                            {node.config.conditions && (
                              <div className="flex gap-1 mt-1">
                                {node.config.conditions.map((c: string) => (
                                  <Badge key={c} variant="outline" className="text-[8px]">{c}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                        {i < bot.nodes.length - 1 && (
                          <div className="flex justify-center py-1">
                            <ArrowDown className="h-4 w-4 text-border" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <Button variant="outline" size="sm" className="w-full h-9 text-xs gap-1 mt-3 border-dashed">
                    <Plus className="h-3.5 w-3.5" /> Add Node
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Node Palette & Settings */}
            <div className="space-y-4">
              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Node Types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(nodeTypeMeta).map(([type, meta]) => (
                    <div key={type} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:border-primary/30 cursor-grab transition-colors">
                      <div className={`h-7 w-7 rounded-md ${meta.bg} flex items-center justify-center`}>
                        <meta.icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium capitalize">{type.replace("-", " ")}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {type === "trigger" && "Start the flow"}
                          {type === "message" && "Send a message"}
                          {type === "condition" && "Branch by intent"}
                          {type === "action" && "Execute an action"}
                          {type === "agent-handoff" && "Escalate to AI Agent"}
                          {type === "api-call" && "Call external API"}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Settings */}
              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Bot Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bot Name</Label>
                    <Input className="h-8 text-xs" defaultValue={bot.name} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">System Prompt</Label>
                    <Textarea className="text-xs min-h-[80px]" defaultValue="You are a helpful customer support assistant for Composable OS. Be concise, friendly, and solution-oriented." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fallback Message</Label>
                    <Input className="h-8 text-xs" defaultValue="I'm not sure about that. Let me connect you with a specialist." />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Auto-escalate on low confidence</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Collect user feedback</Label>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Channels ── */}
        <TabsContent value="channels" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bot.channels.map((ch) => {
              const meta = channelMeta[ch.type];
              const connStatus = ch.status === "connected"
                ? { label: "Connected", cls: "text-[hsl(var(--cbs-green))]", icon: CheckCircle2 }
                : ch.status === "pending"
                ? { label: "Pending", cls: "text-[hsl(var(--cbs-amber))]", icon: Clock }
                : { label: "Disconnected", cls: "text-muted-foreground", icon: AlertTriangle };
              return (
                <Card key={ch.type} className={`border transition-all ${ch.enabled ? "border-border/60" : "border-border/30 opacity-60"}`}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${meta.bg} flex items-center justify-center`}>
                          <meta.icon className={`h-5 w-5 ${meta.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{meta.label}</p>
                          <div className={`flex items-center gap-1 text-[10px] ${connStatus.cls}`}>
                            <connStatus.icon className="h-3 w-3" />
                            <span>{connStatus.label}</span>
                          </div>
                        </div>
                      </div>
                      <Switch checked={ch.enabled} />
                    </div>

                    {ch.enabled && Object.entries(ch.config).length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border/40">
                        {Object.entries(ch.config).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                            <span className="font-mono text-[10px] truncate max-w-[140px]">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button variant={ch.enabled ? "outline" : "secondary"} size="sm" className="w-full h-8 text-xs">
                      {ch.enabled ? "Configure" : "Enable Channel"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Webhook & API */}
          <Card className="mt-4 border border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Webhook & API Access</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input className="h-8 text-xs font-mono flex-1" readOnly value={`https://api.composable.io/chatbot/${bot.id}/webhook`} />
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Copy className="h-3 w-3" /> Copy</Button>
              </div>
              <div className="flex items-center gap-2">
                <Input className="h-8 text-xs font-mono flex-1" readOnly value={`https://api.composable.io/chatbot/${bot.id}/messages`} />
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><ExternalLink className="h-3 w-3" /> Docs</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI Agent Integration ── */}
        <TabsContent value="agent" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Agent Link */}
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Linked AI Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkedAgent ? (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className={`h-10 w-10 rounded-xl ${linkedAgent.bg} flex items-center justify-center`}>
                        <linkedAgent.icon className={`h-5 w-5 ${linkedAgent.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{linkedAgent.name}</p>
                        <p className="text-[10px] text-muted-foreground">{linkedAgent.role}</p>
                      </div>
                      <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">Active</Badge>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Handoff Confidence Threshold</Label>
                      <div className="flex items-center gap-3">
                        <Progress value={60} className="h-2 flex-1" />
                        <span className="text-xs font-medium w-10 text-right">60%</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Escalate to agent when bot confidence drops below this threshold</p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-xs">Agent Capabilities Used</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {["Knowledge search", "Context analysis", "Multi-turn reasoning", "Entity extraction"].map((cap) => (
                          <Badge key={cap} variant="outline" className="text-[9px]">{cap}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => navigate("/ai-agents")}>
                        <ExternalLink className="h-3 w-3" /> Open in Agent Builder
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs text-destructive">Unlink</Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No AI Agent linked</p>
                    <p className="text-[10px] text-muted-foreground mt-1 mb-4">Link an AI Agent to enable intelligent conversation handling</p>
                    <Button size="sm" className="text-xs">Link Agent</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Agents */}
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Available AI Agents</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => navigate("/ai-agents")}>
                    <ExternalLink className="h-3 w-3" /> Agent Builder
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {availableAgents.map((agent) => {
                  const isLinked = bot.agent === agent.id;
                  return (
                    <div key={agent.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${isLinked ? "border-primary/30 bg-primary/5" : "border-border/40 hover:border-primary/20"}`}>
                      <div className={`h-8 w-8 rounded-lg ${agent.bg} flex items-center justify-center`}>
                        <agent.icon className={`h-4 w-4 ${agent.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{agent.name}</p>
                        <p className="text-[9px] text-muted-foreground">{agent.role}</p>
                      </div>
                      {isLinked ? (
                        <Badge className="text-[8px] bg-primary/10 text-primary border-primary/20">Linked</Badge>
                      ) : (
                        <Button variant="outline" size="sm" className="h-6 text-[9px]">Link</Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Test Chat ── */}
        <TabsContent value="testing" className="mt-6">
          <TestChatPanel bot={bot} />
        </TabsContent>

        {/* ── Analytics ── */}
        <TabsContent value="analytics" className="mt-6">
          <ChatbotAnalytics bot={bot} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Test Chat ──────────────────────────────────────────────

function TestChatPanel({ bot }: { bot: ChatbotConfig }) {
  const [messages, setMessages] = useState<{ id: string; role: "user" | "assistant"; content: string }[]>([
    { id: "1", role: "assistant", content: `Hi! 👋 I'm **${bot.name}**. How can I help you today?` },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [channel, setChannel] = useState("web");

  const send = () => {
    if (!input.trim() || typing) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user" as const, content: input }]);
    setInput("");
    setTyping(true);

    const responses = [
      "I found some relevant information for you. Let me check our knowledge base...\n\nBased on our records, here are the top 3 solutions:\n1. **Reset your API key** in Settings → API\n2. **Check rate limits** — you may be exceeding the 1000 req/min threshold\n3. **Update your SDK** to version 2.4+\n\nWould any of these help?",
      "Let me analyze that for you. I'm cross-referencing with our **Research Agent** for deeper insights...\n\n✅ Found 3 matching knowledge base articles\n📊 Similar issues resolved in avg 4.2 minutes\n\nI'll walk you through the most common fix first.",
      "Great question! I'm connecting with the **Marketing Agent** to get you the latest campaign data.\n\n📈 Your current conversion rate is **14.2%**\n🎯 Industry benchmark: **11.8%**\n\nYou're outperforming! Want me to suggest optimization strategies?",
    ];
    const resp = responses[Math.floor(Math.random() * responses.length)];

    setTimeout(() => {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant" as const, content: resp }]);
      setTyping(false);
    }, 1000 + Math.random() * 800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="border border-border/60">
          <div className="flex items-center justify-between p-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Test Conversation</span>
            </div>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="h-7 w-32 text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(channelMeta).map(([key, meta]) => (
                  <SelectItem key={key} value={key} className="text-xs">{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-[400px] overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className={msg.role === "assistant" ? "bg-primary/10 text-primary text-[9px]" : "bg-muted text-muted-foreground text-[9px]"}>
                    {msg.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60"
                }`}>
                  {msg.content.split("\n").map((line, i) => {
                    let processed = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                    processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");
                    return <p key={i} className={i > 0 ? "mt-1" : ""} dangerouslySetInnerHTML={{ __html: processed || "&nbsp;" }} />;
                  })}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2.5">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-[9px]"><Bot className="h-3.5 w-3.5" /></AvatarFallback>
                </Avatar>
                <div className="bg-muted/60 rounded-xl px-4 py-3 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Typing...</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/60">
            <div className="flex gap-2">
              <Input
                placeholder="Type a test message..."
                className="h-9 text-xs"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={!input.trim() || typing}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Debug Panel */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[11px]">
          <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
            <p className="font-semibold">Channel</p>
            <p className="text-muted-foreground">{channelMeta[channel]?.label}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
            <p className="font-semibold">Active Flow Nodes</p>
            <p className="text-muted-foreground">{bot.nodes.length} nodes</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
            <p className="font-semibold">AI Agent</p>
            <p className="text-muted-foreground">{availableAgents.find((a) => a.id === bot.agent)?.name || "None"}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
            <p className="font-semibold">Intent Detected</p>
            <Badge variant="outline" className="text-[9px]">general_inquiry</Badge>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
            <p className="font-semibold">Confidence</p>
            <Progress value={82} className="h-1.5" />
            <p className="text-muted-foreground">82% — above escalation threshold</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
            <p className="font-semibold">Session Duration</p>
            <p className="text-muted-foreground">0m 24s</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Analytics ──────────────────────────────────────────────

function ChatbotAnalytics({ bot }: { bot: ChatbotConfig }) {
  const dailyData = [
    { day: "Mon", conversations: 420, resolved: 365 },
    { day: "Tue", conversations: 480, resolved: 420 },
    { day: "Wed", conversations: 510, resolved: 448 },
    { day: "Thu", conversations: 390, resolved: 340 },
    { day: "Fri", conversations: 560, resolved: 490 },
    { day: "Sat", conversations: 280, resolved: 252 },
    { day: "Sun", conversations: 220, resolved: 198 },
  ];

  const channelDistribution = bot.channels
    .filter((ch) => ch.enabled)
    .map((ch, i) => ({ name: channelMeta[ch.type].label, value: [40, 28, 20, 12][i] || 5 }));

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Conversations", value: bot.metrics.conversations.toLocaleString(), icon: MessageSquare },
          { label: "Messages", value: bot.metrics.messages.toLocaleString(), icon: Send },
          { label: "Resolution Rate", value: `${bot.metrics.resolution}%`, icon: CheckCircle2 },
          { label: "Satisfaction", value: `${bot.metrics.satisfaction}/5`, icon: TrendingUp },
        ].map((m) => (
          <Card key={m.label} className="border border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
                <m.icon className="h-3.5 w-3.5 text-primary/50" />
              </div>
              <p className="text-xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="border border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Conversations This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-40">
            {dailyData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center gap-0.5" style={{ height: "120px" }}>
                  <div className="w-full bg-primary/20 rounded-t relative flex-1" style={{ maxHeight: `${(d.conversations / 560) * 100}%` }}>
                    <div className="absolute bottom-0 w-full bg-primary rounded-t" style={{ height: `${(d.resolved / d.conversations) * 100}%` }} />
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px]">
            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-primary" /> Resolved</div>
            <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-primary/20" /> Total</div>
          </div>
        </CardContent>
      </Card>

      {/* Top intents */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Top Intents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {[
            { intent: "Account & Billing", pct: 32 },
            { intent: "Technical Support", pct: 28 },
            { intent: "Product Information", pct: 22 },
            { intent: "Feature Requests", pct: 12 },
            { intent: "Other", pct: 6 },
          ].map((item) => (
            <div key={item.intent} className="flex items-center gap-3">
              <span className="text-xs w-36 truncate">{item.intent}</span>
              <Progress value={item.pct} className="h-2 flex-1" />
              <span className="text-xs font-medium w-8 text-right">{item.pct}%</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

const ChatbotBuilder = () => {
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const bot = chatbots.find((b) => b.id === selectedBot);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {!bot ? (
        <>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">Chatbot Builder</h1>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Multi-Channel</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Design conversational bots connected to your AI Agents — deploy to WhatsApp, Telegram, Email & more</p>
            </div>
            <Button size="sm" className="h-8 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> New Chatbot
            </Button>
          </div>
          <ChatbotListView onSelect={setSelectedBot} />
        </>
      ) : (
        <ChatbotDetailView bot={bot} onBack={() => setSelectedBot(null)} />
      )}
    </div>
  );
};

export default ChatbotBuilder;
