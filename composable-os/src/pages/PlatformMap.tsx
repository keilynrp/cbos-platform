import { useState } from "react";
import {
  Layers, Monitor, Briefcase, Search, Settings2, Brain, Database,
  Server, Network, Users, ShoppingBag, Store, CalendarClock, Calendar,
  FileSignature, Warehouse, Cpu, Receipt, PanelTop, Blocks, Zap,
  GitBranch, Bot, Cable, BarChart3, Share2, Shield, Eye,
  ChevronDown, ChevronUp, ArrowDown, Sparkles, X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// --- Architecture Data ---

interface LayerModule {
  name: string;
  icon: any;
  description: string;
  route?: string;
  capabilities?: string[];
  events?: string[];
}

interface ArchitectureLayer {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string; // tailwind bg class using design tokens
  accent: string;
  modules: LayerModule[];
}

const layers: ArchitectureLayer[] = [
  {
    id: "experience",
    title: "Experience Layer",
    subtitle: "User-facing interfaces and adaptive experiences",
    icon: Monitor,
    color: "bg-primary/10",
    accent: "border-primary",
    modules: [
      { name: "Portal Builder", icon: PanelTop, description: "Custom portals for customers, partners and teams", route: "/portal-builder", capabilities: ["portal_access", "self_service"] },
      { name: "Store Builder", icon: ShoppingBag, description: "Composable commerce storefronts", route: "/shop-builder", capabilities: ["storefront", "catalog_display"] },
      { name: "POS Interface", icon: Store, description: "Point-of-sale terminal and checkout", route: "/pos-builder", capabilities: ["checkout", "payment_processing"] },
      { name: "Admin Dashboard", icon: Blocks, description: "Central operational dashboard", route: "/", capabilities: ["admin_overview", "system_control"] },
    ],
  },
  {
    id: "capability",
    title: "Business Capability Layer",
    subtitle: "Core functional modules exposing composable capabilities",
    icon: Briefcase,
    color: "bg-accent/10",
    accent: "border-accent",
    modules: [
      { name: "CRM Builder", icon: Users, description: "Customer relationship management", route: "/crm", capabilities: ["lead_capture", "pipeline_management", "contact_management"] },
      { name: "Sales Builder", icon: Receipt, description: "Quotations, CPQ and sales orders", route: "/sales-builder", capabilities: ["quote_generation", "order_management", "cpq"] },
      { name: "Inventory & Orders", icon: Blocks, description: "Stock, orders and fulfillment", route: "/inventory-orders", capabilities: ["inventory_visibility", "order_management"] },
      { name: "Appointment Builder", icon: CalendarClock, description: "Scheduling and booking", route: "/appointments", capabilities: ["appointment_booking", "calendar_sync"] },
      { name: "Event Builder", icon: Calendar, description: "Event management and ticketing", route: "/events", capabilities: ["event_management", "registration"] },
      { name: "Warehouse Builder", icon: Warehouse, description: "Warehouse operations and logistics", route: "/warehouse", capabilities: ["warehouse_management", "shipping"] },
      { name: "Contract Studio", icon: FileSignature, description: "Programmable contracts and smart agreements", route: "/contract-studio", capabilities: ["contract_creation", "clause_automation"] },
      { name: "IoT Builder", icon: Cpu, description: "IoT device management and telemetry", route: "/iot-builder", capabilities: ["device_management", "telemetry"] },
    ],
  },
  {
    id: "composition",
    title: "Composition & Discovery Layer",
    subtitle: "Identifies needs and composes modular solutions dynamically",
    icon: Search,
    color: "bg-[hsl(var(--cbs-green))]/10",
    accent: "border-[hsl(var(--cbs-green))]",
    modules: [
      { name: "Solution Discovery", icon: Search, description: "Translate business pain points into system configurations" },
      { name: "Capability Matcher", icon: Sparkles, description: "Match needs to reusable capability units" },
      { name: "Workspace Bootstrap", icon: Blocks, description: "Auto-configure workspaces from matched capabilities" },
    ],
  },
  {
    id: "orchestration",
    title: "Orchestration Layer",
    subtitle: "Coordinates cross-module operations via events",
    icon: Settings2,
    color: "bg-[hsl(var(--cbs-orange))]/10",
    accent: "border-[hsl(var(--cbs-orange))]",
    modules: [
      { name: "Workflow Engine", icon: GitBranch, description: "Visual workflow automation across modules", events: ["LeadCaptured", "QuoteGenerated", "OrderCreated"] },
      { name: "Event Bus", icon: Zap, description: "Platform-wide event distribution system", events: ["InventoryReserved", "RevenueRecorded", "ContractSigned"] },
      { name: "Automation Builder", icon: Bot, description: "No-code automation rules and triggers" },
      { name: "Integration Connectors", icon: Cable, description: "Connect external systems and APIs", route: "/mcp-hub" },
    ],
  },
  {
    id: "intelligence",
    title: "Decision Intelligence Layer",
    subtitle: "Adaptive AI and predictive analytics across the platform",
    icon: Brain,
    color: "bg-purple-500/10",
    accent: "border-purple-500",
    modules: [
      { name: "AI Agent Builder", icon: Bot, description: "Build and deploy AI agents", route: "/ai-agents" },
      { name: "MCP Integration Hub", icon: Cable, description: "Unified AI model coordination", route: "/mcp-hub" },
      { name: "Recommendation Engine", icon: Sparkles, description: "Contextual suggestions and next-best-actions" },
      { name: "Predictive Analytics", icon: BarChart3, description: "Forecasting and anomaly detection", route: "/analytics" },
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge & Context Layer",
    subtitle: "Structured context, entity relationships and history",
    icon: Share2,
    color: "bg-[hsl(var(--cbs-blue))]/10",
    accent: "border-[hsl(var(--cbs-blue))]",
    modules: [
      { name: "Knowledge Graph", icon: Share2, description: "Cross-module entity relationships", route: "/knowledge" },
      { name: "Entity Registry", icon: Database, description: "Canonical data entities: Person, Org, Product, Order" },
      { name: "Historical Telemetry", icon: Eye, description: "Time-series operational history" },
    ],
  },
  {
    id: "data",
    title: "Data Layer",
    subtitle: "Persistent storage, event streams and vector databases",
    icon: Database,
    color: "bg-muted",
    accent: "border-muted-foreground/30",
    modules: [
      { name: "PostgreSQL", icon: Database, description: "Primary relational data store" },
      { name: "Graph Database", icon: Share2, description: "Entity relationship graph" },
      { name: "Vector Database", icon: Brain, description: "Embeddings for AI and semantic search" },
      { name: "Event Stream", icon: Zap, description: "Persistent event log and replay" },
    ],
  },
  {
    id: "infrastructure",
    title: "Infrastructure Layer",
    subtitle: "Runtime services, security and observability",
    icon: Server,
    color: "bg-secondary",
    accent: "border-border",
    modules: [
      { name: "API Gateway", icon: Network, description: "Unified API routing and rate limiting" },
      { name: "Identity & Access", icon: Shield, description: "Authentication, authorization and RBAC" },
      { name: "Observability", icon: Eye, description: "Metrics, logging and distributed tracing" },
      { name: "Event Bus Infra", icon: Zap, description: "Distributed event streaming backbone" },
    ],
  },
];

const eventFlowExample = [
  { label: "Lead Captured", layer: "capability" },
  { label: "Event Bus", layer: "orchestration" },
  { label: "CRM Updated", layer: "capability" },
  { label: "AI Scoring", layer: "intelligence" },
  { label: "Sales Builder", layer: "capability" },
  { label: "Quote Generated", layer: "orchestration" },
  { label: "Order Created", layer: "capability" },
  { label: "Revenue Recorded", layer: "knowledge" },
];

export default function PlatformMap() {
  const [expandedLayer, setExpandedLayer] = useState<string | null>("capability");
  const [selectedModule, setSelectedModule] = useState<LayerModule | null>(null);

  const toggleLayer = (id: string) => {
    setExpandedLayer(expandedLayer === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Architecture Map</h1>
        <p className="text-muted-foreground text-sm mt-1">Interactive visualization of the Composable Business OS architecture layers and modules</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* Main Column — Layers */}
        <div className="space-y-3">
          {layers.map((layer, layerIdx) => {
            const isExpanded = expandedLayer === layer.id;
            const Icon = layer.icon;
            return (
              <div key={layer.id}>
                {/* Connector arrow between layers */}
                {layerIdx > 0 && (
                  <div className="flex justify-center -my-1.5 relative z-10">
                    <div className="flex flex-col items-center text-muted-foreground/40">
                      <div className="w-px h-3 bg-border" />
                      <ArrowDown className="h-3.5 w-3.5 -mt-0.5" />
                    </div>
                  </div>
                )}
                <Card
                  className={`border-l-4 ${layer.accent} cursor-pointer transition-all hover:shadow-md ${isExpanded ? "shadow-md" : ""}`}
                  onClick={() => toggleLayer(layer.id)}
                >
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg ${layer.color} flex items-center justify-center shrink-0`}>
                          <Icon className="h-4.5 w-4.5 text-foreground/70" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{layer.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{layer.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{layer.modules.length} components</Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 pb-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <Separator className="mb-3" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {layer.modules.map((mod) => {
                          const ModIcon = mod.icon;
                          const isSelected = selectedModule?.name === mod.name;
                          return (
                            <button
                              key={mod.name}
                              onClick={() => setSelectedModule(isSelected ? null : mod)}
                              className={`group text-left p-3 rounded-lg border transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border hover:border-primary/40 hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <ModIcon className={`h-3.5 w-3.5 ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                                <span className="text-xs font-medium truncate">{mod.name}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{mod.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            );
          })}
        </div>

        {/* Right Column — Details & Event Flow */}
        <div className="space-y-4">
          {/* Module Detail */}
          {selectedModule ? (
            <Card className="sticky top-4">
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div className="flex items-center gap-2">
                  <selectedModule.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{selectedModule.name}</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedModule(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground text-xs">{selectedModule.description}</p>
                {selectedModule.capabilities && (
                  <div>
                    <p className="text-xs font-medium mb-1.5">Capabilities</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedModule.capabilities.map((c) => (
                        <Badge key={c} variant="outline" className="text-[10px] font-mono">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedModule.events && (
                  <div>
                    <p className="text-xs font-medium mb-1.5">Events</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedModule.events.map((e) => (
                        <Badge key={e} variant="secondary" className="text-[10px] font-mono">{e}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedModule.route && (
                  <a href={selectedModule.route} className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                    Open module →
                  </a>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-xs">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Click any module to inspect its capabilities and connections
              </CardContent>
            </Card>
          )}

          {/* Event Flow Example */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Example Event Flow
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">Lead → Revenue lifecycle across layers</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {eventFlowExample.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`h-2.5 w-2.5 rounded-full ${
                        step.layer === "capability" ? "bg-accent" :
                        step.layer === "orchestration" ? "bg-[hsl(var(--cbs-orange))]" :
                        step.layer === "intelligence" ? "bg-purple-500" : "bg-[hsl(var(--cbs-blue))]"
                      }`} />
                      {i < eventFlowExample.length - 1 && <div className="w-px h-5 bg-border" />}
                    </div>
                    <div className="flex items-center gap-2 pb-1">
                      <span className="text-xs font-medium">{step.label}</span>
                      <Badge variant="outline" className="text-[9px] capitalize">{step.layer}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Entities */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                Core Entities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {["Person", "Organization", "User", "Product", "Order", "InventoryItem", "Contract", "Device", "Location"].map((e) => (
                  <Badge key={e} variant="secondary" className="text-[10px] font-mono">{e}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Synaptic Modeler Link */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4 flex items-center gap-3">
              <Network className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-medium">Synaptic System Modeler</p>
                <p className="text-[10px] text-muted-foreground">View live topology and data flows</p>
              </div>
              <a href="/system-modeler" className="ml-auto text-xs text-primary hover:underline whitespace-nowrap">Open →</a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
