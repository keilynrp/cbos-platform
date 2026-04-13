import { useState } from "react";
import {
  Brain, Network, Database, Users, Store, ShoppingBag, Calendar,
  FileText, Warehouse, Monitor, PackageSearch, Share2, Bot, BarChart3,
  Cpu, Zap, Activity, ArrowDown, ArrowUp, Layers, Target, Sparkles,
  GitBranch, Cable, CircleDot, Workflow, Search, Link2, ChevronDown,
  ChevronUp, Landmark, MessageSquare
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ── Types ── */
interface PlaneModule {
  id: string;
  label: string;
  icon: any;
  description: string;
  events?: string[];
}

interface PlaneData {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  glowClass: string;
  badgeBg: string;
  modules: PlaneModule[];
}

/* ── Data ── */
const planes: PlaneData[] = [
  {
    id: "intelligence",
    title: "Intelligence Plane",
    subtitle: "Adaptive reasoning, prediction and simulation",
    color: "hsl(var(--cbs-purple))",
    bgClass: "bg-primary/5",
    borderClass: "border-primary/20",
    textClass: "text-primary",
    glowClass: "shadow-[0_0_40px_hsl(262,80%,55%,0.08)]",
    badgeBg: "bg-primary/10 text-primary border-primary/20",
    modules: [
      { id: "ai-agents", label: "AI Agents", icon: Bot, description: "Autonomous task execution and reasoning agents", events: ["agent_completed", "task_delegated"] },
      { id: "decision-engine", label: "Decision Intelligence", icon: Brain, description: "Contextual decision support and optimization", events: ["decision_generated", "recommendation_ready"] },
      { id: "monte-carlo", label: "Monte Carlo Simulation", icon: Activity, description: "Probabilistic scenario modeling and risk analysis", events: ["simulation_completed", "risk_assessed"] },
      { id: "predictive", label: "Predictive Analytics", icon: BarChart3, description: "Forecasting models for revenue, demand and operations", events: ["forecast_generated", "anomaly_detected"] },
      { id: "recommendations", label: "Recommendation Engine", icon: Target, description: "Personalized suggestions for actions and configurations", events: ["recommendation_served", "feedback_received"] },
      { id: "mcp-hub", label: "MCP Integration Hub", icon: Cable, description: "Model context protocol orchestration layer", events: ["context_resolved", "model_invoked"] },
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge Plane",
    subtitle: "Semantic data layer, entity resolution and contextual relationships",
    color: "hsl(var(--cbs-blue))",
    bgClass: "bg-accent/5",
    borderClass: "border-accent/20",
    textClass: "text-accent",
    glowClass: "shadow-[0_0_40px_hsl(220,80%,55%,0.08)]",
    badgeBg: "bg-accent/10 text-accent border-accent/20",
    modules: [
      { id: "knowledge-graph", label: "Knowledge Graph", icon: Share2, description: "Entity-relationship graph connecting all platform data", events: ["entity_linked", "relationship_created"] },
      { id: "entity-resolution", label: "Entity Resolution", icon: Search, description: "Deduplication and identity matching across sources", events: ["entity_resolved", "merge_completed"] },
      { id: "semantic-model", label: "Unified Semantic Model", icon: Layers, description: "Canonical data model for people, orgs, products and docs", events: ["schema_updated", "model_synced"] },
      { id: "context-engine", label: "Context Relationships", icon: GitBranch, description: "Temporal and causal relationship inference", events: ["context_enriched", "relationship_inferred"] },
      { id: "telemetry", label: "Historical Telemetry", icon: Database, description: "Time-series operational data and audit trails", events: ["telemetry_recorded", "pattern_detected"] },
    ],
  },
  {
    id: "operational",
    title: "Operational Plane",
    subtitle: "Modular business services connected via event-driven architecture",
    color: "hsl(var(--cbs-green))",
    bgClass: "bg-[hsl(152,60%,48%,0.05)]",
    borderClass: "border-[hsl(152,60%,48%,0.2)]",
    textClass: "text-[hsl(152,60%,48%)]",
    glowClass: "shadow-[0_0_40px_hsl(152,60%,48%,0.08)]",
    badgeBg: "bg-[hsl(152,60%,48%,0.1)] text-[hsl(152,60%,48%)] border-[hsl(152,60%,48%,0.2)]",
    modules: [
      { id: "crm", label: "CRM", icon: Users, description: "Contact management, pipeline tracking and lead scoring", events: ["lead_captured", "deal_closed", "contact_updated"] },
      { id: "sales", label: "Sales Builder", icon: Landmark, description: "Quote generation, proposals and revenue tracking", events: ["quote_generated", "proposal_sent", "revenue_recorded"] },
      { id: "inventory", label: "Inventory & Orders", icon: PackageSearch, description: "Stock management, order processing and fulfillment", events: ["order_created", "inventory_reserved", "shipment_dispatched"] },
      { id: "pos", label: "POS Builder", icon: Monitor, description: "Point of sale terminals and transaction processing", events: ["sale_completed", "payment_processed", "receipt_generated"] },
      { id: "warehouse", label: "Warehouse Builder", icon: Warehouse, description: "Warehouse operations, picking, packing and logistics", events: ["restock_triggered", "pick_completed", "shipment_ready"] },
      { id: "portal", label: "Portal Builder", icon: Store, description: "Customer and partner portals with dynamic content", events: ["portal_accessed", "content_rendered", "form_submitted"] },
      { id: "events", label: "Event Builder", icon: Calendar, description: "Event scheduling, registration and attendee management", events: ["event_created", "attendee_registered", "ticket_issued"] },
      { id: "contracts", label: "Contract Studio", icon: FileText, description: "Contract creation, negotiation and lifecycle management", events: ["contract_drafted", "signature_requested", "contract_executed"] },
    ],
  },
];

const dataFlows = [
  { from: "Operational Plane", to: "Knowledge Plane", label: "Business events stream into knowledge graph for entity resolution and semantic enrichment", direction: "down" as const },
  { from: "Knowledge Plane", to: "Intelligence Plane", label: "Structured knowledge feeds AI agents, simulations and predictive models", direction: "up" as const },
  { from: "Intelligence Plane", to: "Operational Plane", label: "Predictions, recommendations and decisions feed back to optimize operations", direction: "down" as const },
];

const coreEntities = [
  { name: "Person", icon: Users },
  { name: "Organization", icon: Landmark },
  { name: "Product", icon: ShoppingBag },
  { name: "Transaction", icon: Zap },
  { name: "Document", icon: FileText },
];

/* ── Component ── */
export default function IntelligenceGraphOS() {
  const [expandedPlane, setExpandedPlane] = useState<string | null>("operational");
  const [selectedModule, setSelectedModule] = useState<PlaneModule | null>(null);
  const [selectedPlaneColor, setSelectedPlaneColor] = useState<PlaneData | null>(null);

  const togglePlane = (id: string) => {
    setExpandedPlane(prev => prev === id ? null : id);
    setSelectedModule(null);
  };

  const selectModule = (mod: PlaneModule, plane: PlaneData) => {
    setSelectedModule(prev => prev?.id === mod.id ? null : mod);
    setSelectedPlaneColor(plane);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
            <Network className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Enterprise Intelligence Graph OS</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          A three-plane composable architecture where operational data flows into a semantic knowledge layer,
          analyzed by intelligence services that generate predictions, recommendations and simulations.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        {planes.map(p => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground font-medium">{p.title}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <Workflow className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground font-medium">Event Bus</span>
        </div>
      </div>

      {/* Architecture Stack */}
      <div className="space-y-3">
        {planes.map((plane, planeIdx) => {
          const isExpanded = expandedPlane === plane.id;
          return (
            <div key={plane.id}>
              {/* Flow arrow between planes */}
              {planeIdx > 0 && (
                <div className="flex flex-col items-center py-2">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-px w-12 bg-border" />
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border">
                      {planeIdx === 1 ? (
                        <>
                          <ArrowDown className="h-3 w-3 text-accent" />
                          <span>Data flows down</span>
                          <span className="text-muted-foreground/60">•</span>
                          <ArrowUp className="h-3 w-3 text-primary" />
                          <span>Insights flow up</span>
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-3 w-3 text-[hsl(var(--cbs-green))]" />
                          <span>Events stream in</span>
                          <span className="text-muted-foreground/60">•</span>
                          <ArrowUp className="h-3 w-3 text-primary" />
                          <span>Decisions feed back</span>
                        </>
                      )}
                    </div>
                    <div className="h-px w-12 bg-border" />
                  </div>
                </div>
              )}

              {/* Plane Card */}
              <Card
                className={`${plane.bgClass} ${plane.borderClass} ${plane.glowClass} transition-all duration-300 cursor-pointer overflow-hidden`}
                onClick={() => togglePlane(plane.id)}
              >
                <CardContent className="p-0">
                  {/* Plane Header */}
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${plane.bgClass} border ${plane.borderClass}`}>
                        {plane.id === "intelligence" && <Brain className={`h-5 w-5 ${plane.textClass}`} />}
                        {plane.id === "knowledge" && <Share2 className={`h-5 w-5 ${plane.textClass}`} />}
                        {plane.id === "operational" && <Cpu className={`h-5 w-5 ${plane.textClass}`} />}
                      </div>
                      <div>
                        <h2 className={`text-lg font-bold ${plane.textClass}`}>{plane.title}</h2>
                        <p className="text-xs text-muted-foreground">{plane.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-[10px] ${plane.badgeBg}`}>
                        {plane.modules.length} services
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className={`h-5 w-5 ${plane.textClass}`} />
                      ) : (
                        <ChevronDown className={`h-5 w-5 ${plane.textClass}`} />
                      )}
                    </div>
                  </div>

                  {/* Expanded Modules */}
                  {isExpanded && (
                    <div className="px-5 pb-5" onClick={e => e.stopPropagation()}>
                      {/* Event Bus Bar */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${plane.borderClass} ${plane.bgClass} mb-4`}>
                        <Workflow className={`h-3.5 w-3.5 ${plane.textClass}`} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Event Bus</span>
                        <div className={`flex-1 h-px ${plane.borderClass} border-t border-dashed`} />
                        <div className="flex gap-1">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className="h-1 w-1 rounded-full animate-pulse"
                              style={{
                                background: plane.color,
                                animationDelay: `${i * 200}ms`,
                                opacity: 0.6,
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Module Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {plane.modules.map(mod => {
                          const isSelected = selectedModule?.id === mod.id;
                          return (
                            <div
                              key={mod.id}
                              className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? `${plane.borderClass} ${plane.bgClass} ring-1 ring-offset-1 ring-offset-background`
                                  : "border-border bg-card hover:border-muted-foreground/20"
                              }`}
                              style={isSelected ? { ["--tw-ring-color" as any]: plane.color } : {}}
                              onClick={() => selectModule(mod, plane)}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                                  isSelected ? plane.bgClass : "bg-muted"
                                }`}>
                                  <mod.icon className={`h-4 w-4 ${isSelected ? plane.textClass : "text-muted-foreground"}`} />
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-sm font-semibold ${isSelected ? plane.textClass : "text-foreground"}`}>{mod.label}</p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{mod.description}</p>
                                </div>
                              </div>
                              {/* Connection dot */}
                              <div className={`absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full border-2 border-background transition-colors ${
                                isSelected ? "" : "bg-border"
                              }`} style={isSelected ? { background: plane.color } : {}} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Selected Module Detail */}
      {selectedModule && selectedPlaneColor && (
        <Card className={`${selectedPlaneColor.bgClass} ${selectedPlaneColor.borderClass} animate-fade-in`}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${selectedPlaneColor.bgClass} border ${selectedPlaneColor.borderClass}`}>
                <selectedModule.icon className={`h-6 w-6 ${selectedPlaneColor.textClass}`} />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className={`text-lg font-bold ${selectedPlaneColor.textClass}`}>{selectedModule.label}</h3>
                  <p className="text-sm text-muted-foreground">{selectedModule.description}</p>
                </div>
                {selectedModule.events && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Event Emissions</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedModule.events.map(evt => (
                        <div key={evt} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border border-border">
                          <Zap className={`h-3 w-3 ${selectedPlaneColor.textClass}`} />
                          <span className="text-xs font-mono text-foreground">{evt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Flow & Entities */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Data Flow Descriptions */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Data Flow & Feedback Loops</h3>
            </div>
            {dataFlows.map((flow, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="mt-0.5">
                  {flow.direction === "down" ? (
                    <ArrowDown className="h-4 w-4 text-accent" />
                  ) : (
                    <ArrowUp className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{flow.from} → {flow.to}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{flow.label}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Core Entities */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold text-foreground">Unified Semantic Entities</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              The Knowledge Plane resolves and connects these core entity types across all operational services.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {coreEntities.map(ent => (
                <div key={ent.name} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="p-1.5 rounded-lg bg-accent/10">
                    <ent.icon className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{ent.name}</span>
                </div>
              ))}
            </div>

            {/* Mini architecture diagram */}
            <div className="pt-2 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Architecture Flow</p>
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-muted/30 border border-border">
                <Badge variant="outline" className="bg-[hsl(152,60%,48%,0.1)] text-[hsl(152,60%,48%)] border-[hsl(152,60%,48%,0.2)] text-[10px]">Operations</Badge>
                <ArrowDown className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-[10px]">Knowledge</Badge>
                <ArrowDown className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">Intelligence</Badge>
                <ArrowUp className="h-3 w-3 text-primary" />
                <Badge variant="outline" className="bg-[hsl(152,60%,48%,0.1)] text-[hsl(152,60%,48%)] border-[hsl(152,60%,48%,0.2)] text-[10px]">Operations</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
