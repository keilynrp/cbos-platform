import { useState } from "react";
import {
  Brain, Layers, Cpu, Share2, Zap, Eye, Settings2, Database,
  ChevronDown, ChevronRight, ArrowDown, ArrowUp, RotateCcw,
  Activity, Workflow, Shield, Server, GitBranch
} from "lucide-react";

// ─── Data ───────────────────────────────────────────────────────────

interface Module {
  name: string;
  description: string;
}

interface Cluster {
  name: string;
  modules: Module[];
}

interface Layer {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  colorClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
  clusters?: Cluster[];
  modules?: Module[];
}

const layers: Layer[] = [
  {
    id: "experience",
    title: "Experience Layer",
    subtitle: "User-facing surfaces where interaction happens",
    icon: Eye,
    colorClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/30",
    textClass: "text-cyan-700 dark:text-cyan-400",
    badgeClass: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
    modules: [
      { name: "Portal Builder", description: "Dynamic customer & partner portals" },
      { name: "Store Builder", description: "E-commerce storefront surfaces" },
      { name: "POS Interface", description: "Point-of-sale interaction layer" },
      { name: "Admin Console", description: "Internal administration dashboard" },
      { name: "Dashboard Framework", description: "Dynamic data visualization panels" },
      { name: "Intake Forms", description: "Signal capture & onboarding forms" },
      { name: "Booking Pages", description: "Appointment & reservation surfaces" },
      { name: "Customer Portal", description: "Self-service customer experience" },
      { name: "Event Portals", description: "Event landing & registration pages" },
    ],
  },
  {
    id: "operational",
    title: "Operational Module Layer",
    subtitle: "Business modules responsible for transactional execution",
    icon: Layers,
    colorClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    textClass: "text-blue-700 dark:text-blue-400",
    badgeClass: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
    clusters: [
      {
        name: "Growth & Revenue",
        modules: [
          { name: "CRM Builder", description: "Lead & relationship management" },
          { name: "Intelligent Sales Builder", description: "AI-assisted sales pipeline" },
          { name: "RevPath", description: "Revenue pathway tracking" },
          { name: "Solution Discovery Engine", description: "Capability matching from pain points" },
          { name: "Persona Builder", description: "Customer persona modeling" },
        ],
      },
      {
        name: "Commerce",
        modules: [
          { name: "Inventory & Order Builder", description: "Stock & order lifecycle" },
          { name: "POS Builder", description: "Point-of-sale configuration" },
          { name: "Pricing Engine", description: "Dynamic pricing rules" },
          { name: "Warehouse Builder", description: "Warehouse operations management" },
          { name: "Fulfillment", description: "Order fulfillment pipeline" },
        ],
      },
      {
        name: "Experience",
        modules: [
          { name: "Portal Builder", description: "Composable portal surfaces" },
          { name: "Dynamic Experience Mapping", description: "Journey orchestration" },
          { name: "Appointment Builder", description: "Scheduling & booking engine" },
          { name: "Event Builder", description: "Event creation & management" },
        ],
      },
      {
        name: "Governance",
        modules: [
          { name: "Contract Studio", description: "Programmable contract engine" },
          { name: "Audit & Compliance", description: "Regulatory tracking" },
          { name: "Permissions & Roles", description: "Access control management" },
        ],
      },
      {
        name: "Physical Operations",
        modules: [
          { name: "IoT Builder", description: "Device integration platform" },
          { name: "Device Registry", description: "Connected device management" },
          { name: "Telemetry Monitoring", description: "Real-time signal tracking" },
          { name: "Alert Engine", description: "Threshold-based alert system" },
        ],
      },
    ],
  },
  {
    id: "capability",
    title: "Capability Layer",
    subtitle: "Reusable functional units shared across modules",
    icon: Settings2,
    colorClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    textClass: "text-amber-700 dark:text-amber-400",
    badgeClass: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    modules: [
      { name: "lead_capture", description: "Capture & qualify inbound leads" },
      { name: "pipeline_management", description: "Stage-based opportunity tracking" },
      { name: "quote_generation", description: "Dynamic quote composition" },
      { name: "order_management", description: "Order lifecycle orchestration" },
      { name: "inventory_visibility", description: "Real-time stock levels" },
      { name: "workflow_automation", description: "Trigger-based process execution" },
      { name: "portal_access", description: "Dynamic portal provisioning" },
      { name: "AI_classification", description: "Intelligent data categorization" },
      { name: "recommendation_logic", description: "Context-aware recommendations" },
      { name: "telemetry_monitoring", description: "Device signal processing" },
      { name: "scenario_simulation", description: "What-if analysis engine" },
      { name: "contract_automation", description: "Automated contract workflows" },
    ],
  },
  {
    id: "orchestration",
    title: "Orchestration Layer",
    subtitle: "Coordinates the platform through events and workflows",
    icon: Workflow,
    colorClass: "bg-orange-500/10",
    borderClass: "border-orange-500/30",
    textClass: "text-orange-700 dark:text-orange-400",
    badgeClass: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
    modules: [
      { name: "Workflow Engine", description: "Visual workflow orchestration" },
      { name: "Event Bus", description: "Async event distribution backbone" },
      { name: "Automation Builder", description: "No-code automation rules" },
      { name: "Notification Engine", description: "Multi-channel alert delivery" },
      { name: "Feature Flags", description: "Progressive feature rollout" },
      { name: "Module Activation Service", description: "Dynamic module provisioning" },
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge & Context Layer",
    subtitle: "Semantic backbone powered by UKIP",
    icon: Share2,
    colorClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    textClass: "text-emerald-700 dark:text-emerald-400",
    badgeClass: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    modules: [
      { name: "Knowledge Graph", description: "Entity-relationship semantic network" },
      { name: "Entity Resolution", description: "Cross-module identity unification" },
      { name: "Semantic Search", description: "Meaning-based data retrieval" },
      { name: "Document Intelligence", description: "Structured document understanding" },
      { name: "Context Graph Lookup", description: "Contextual relationship traversal" },
      { name: "Canonical Entity Registry", description: "Master entity definitions" },
    ],
  },
  {
    id: "intelligence",
    title: "Intelligence & Simulation Layer",
    subtitle: "Higher-order reasoning and forecasting",
    icon: Brain,
    colorClass: "bg-purple-500/10",
    borderClass: "border-purple-500/30",
    textClass: "text-purple-700 dark:text-purple-400",
    badgeClass: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
    modules: [
      { name: "MCP Integration Hub", description: "Model context protocol orchestrator" },
      { name: "Decision Intelligence Engine", description: "Multi-factor decision support" },
      { name: "AI Agents", description: "Autonomous task execution agents" },
      { name: "Prompt Registry", description: "Centralized prompt management" },
      { name: "Simulation & Decision Lab", description: "Interactive scenario workspace" },
      { name: "Monte Carlo Engine", description: "Probabilistic simulation service" },
      { name: "Anomaly Detection", description: "Pattern deviation alerting" },
      { name: "Predictive Forecasting", description: "Time-series prediction models" },
    ],
  },
  {
    id: "infrastructure",
    title: "Infrastructure Layer",
    subtitle: "Foundational runtime services",
    icon: Server,
    colorClass: "bg-gray-500/10",
    borderClass: "border-gray-500/30",
    textClass: "text-gray-700 dark:text-gray-400",
    badgeClass: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
    modules: [
      { name: "API Gateway", description: "Unified API entry point" },
      { name: "Identity & Access", description: "Authentication & authorization" },
      { name: "PostgreSQL", description: "Relational data persistence" },
      { name: "Graph Database", description: "Relationship-native storage" },
      { name: "Vector Layer", description: "Embedding similarity search" },
      { name: "Event Streaming Backbone", description: "High-throughput event transport" },
      { name: "Observability Platform", description: "Metrics, logs & traces" },
      { name: "Container Runtime", description: "Containerized service execution" },
    ],
  },
];

interface Synapse {
  name: string;
  steps: string[];
  color: string;
}

const synapses: Synapse[] = [
  {
    name: "Revenue Synapse",
    steps: ["Lead Capture", "CRM", "Opportunity", "Sales Builder", "Quote", "Sales Order", "Payment", "Revenue Recorded", "RevPath Update", "Analytics / AI Feedback"],
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    name: "Commerce Synapse",
    steps: ["Product", "Inventory", "Order", "Reservation", "Fulfillment", "Shipment", "Customer Portal Update", "Revenue Event"],
    color: "text-amber-600 dark:text-amber-400",
  },
  {
    name: "Discovery Synapse",
    steps: ["Discovery Intake", "Pain Point Detection", "Capability Matching", "Module Recommendation", "Workspace Blueprint", "Module Activation"],
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    name: "Physical Intelligence Synapse",
    steps: ["Device Signal", "Telemetry Event", "Alert Engine", "Workflow Trigger", "Operations Action", "Analytics / Simulation"],
    color: "text-cyan-600 dark:text-cyan-400",
  },
  {
    name: "Semantic Intelligence Synapse",
    steps: ["Operational Entity", "Event Emission", "Knowledge Graph Update", "Context Enrichment", "AI Recommendation", "Workflow / UI Feedback"],
    color: "text-purple-600 dark:text-purple-400",
  },
];

interface FeedbackLoop {
  name: string;
  label: string;
  steps: string[];
  color: string;
}

const feedbackLoops: FeedbackLoop[] = [
  { name: "Loop A", label: "Operational Learning", steps: ["Transaction", "Event", "Analytics", "Recommendation", "Workflow Adjustment"], color: "text-blue-500" },
  { name: "Loop B", label: "Discovery to Composition", steps: ["Pain Point", "Capability Match", "Module Composition", "Workspace Provisioning", "Adoption Signals", "Better Recommendations"], color: "text-emerald-500" },
  { name: "Loop C", label: "Knowledge Enrichment", steps: ["Operational Data", "Semantic Linking", "Context Retrieval", "Better AI Outputs", "Better Decisions"], color: "text-purple-500" },
  { name: "Loop D", label: "Simulation to Action", steps: ["Business Variables", "Monte Carlo Simulation", "Risk Distribution", "Decision Recommendation", "Process Adjustment"], color: "text-orange-500" },
];

const differentiators = [
  { title: "Capability-first architecture", desc: "Modules assembled from reusable capabilities" },
  { title: "Event-native orchestration", desc: "Everything meaningful emits signals" },
  { title: "Semantic context layer", desc: "UKIP enriches operations with knowledge & explainability" },
  { title: "AI-assisted composition", desc: "Platform recommends modules, workflows & actions" },
  { title: "Simulation-aware decisions", desc: "Monte Carlo & predictive engines manage uncertainty" },
  { title: "Synaptic system visibility", desc: "Architecture, operations & intelligence as one living graph" },
];

// ─── Components ─────────────────────────────────────────────────────

function LayerCard({ layer }: { layer: Layer }) {
  const [open, setOpen] = useState(false);
  const Icon = layer.icon;
  const moduleCount = layer.clusters
    ? layer.clusters.reduce((s, c) => s + c.modules.length, 0)
    : (layer.modules?.length ?? 0);

  return (
    <div className={`rounded-xl border ${layer.borderClass} ${layer.colorClass} transition-all duration-300`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left"
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${layer.badgeClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-base font-semibold ${layer.textClass}`}>{layer.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{layer.subtitle}</p>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${layer.badgeClass}`}>
          {moduleCount} modules
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {layer.clusters ? (
            layer.clusters.map((cluster) => (
              <div key={cluster.name}>
                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${layer.textClass}`}>
                  {cluster.name}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {cluster.modules.map((m) => (
                    <ModuleCard key={m.name} module={m} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {layer.modules?.map((m) => (
                <ModuleCard key={m.name} module={m} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleCard({ module }: { module: Module }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/80 backdrop-blur-sm p-3 hover:shadow-md transition-shadow">
      <p className="text-sm font-medium text-foreground">{module.name}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{module.description}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-1">
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-px h-4 bg-border" />
        <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

function SynapseCard({ synapse }: { synapse: Synapse }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <h4 className={`text-sm font-semibold mb-3 ${synapse.color}`}>{synapse.name}</h4>
      <div className="flex flex-wrap items-center gap-1.5">
        {synapse.steps.map((step, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="text-xs px-2 py-1 rounded-md bg-muted text-foreground font-medium">
              {step}
            </span>
            {i < synapse.steps.length - 1 && (
              <span className="text-muted-foreground text-xs">→</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function LoopCard({ loop }: { loop: FeedbackLoop }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <RotateCcw className={`h-4 w-4 ${loop.color}`} />
        <span className={`text-sm font-semibold ${loop.color}`}>{loop.name}:</span>
        <span className="text-sm text-foreground font-medium">{loop.label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {loop.steps.map((step, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="text-xs px-2 py-1 rounded-md bg-muted text-foreground">{step}</span>
            {i < loop.steps.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
          </span>
        ))}
        <span className="text-muted-foreground text-xs">↻</span>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

export default function SynapticModeler() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Synaptic Architecture Map
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Composable Business OS — A neural-style operating system where modules, capabilities,
                events, knowledge and intelligence connect as a living system.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Visual Metaphor Legend */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "Modules", sub: "Neural clusters", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
              { label: "Capabilities", sub: "Functional pathways", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
              { label: "Events", sub: "Electrical signals", color: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
              { label: "Knowledge", sub: "Semantic synapses", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
              { label: "Intelligence", sub: "Cognitive layers", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
              { label: "Experience", sub: "Sensory surfaces", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
              { label: "Infrastructure", sub: "Foundation", color: "bg-gray-500/15 text-gray-700 dark:text-gray-300" },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg px-3 py-2 text-center ${item.color}`}>
                <p className="text-xs font-semibold">{item.label}</p>
                <p className="text-[10px] opacity-80">{item.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Architecture Layers */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Platform Layer Stack
          </h2>
          <div className="space-y-1">
            {layers.map((layer, i) => (
              <div key={layer.id}>
                <LayerCard layer={layer} />
                {i < layers.length - 1 && <FlowArrow />}
              </div>
            ))}
          </div>
        </section>

        {/* Synaptic Flow Patterns */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Synaptic Flow Patterns
          </h2>
          <div className="grid gap-3">
            {synapses.map((s) => (
              <SynapseCard key={s.name} synapse={s} />
            ))}
          </div>
        </section>

        {/* Feedback Loops */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Core Feedback Loops
          </h2>
          <div className="grid gap-3">
            {feedbackLoops.map((l) => (
              <LoopCard key={l.name} loop={l} />
            ))}
          </div>
        </section>

        {/* Strategic Differentiators */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-emerald-500" />
            Strategic Differentiators
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {differentiators.map((d) => (
              <div key={d.title} className="rounded-lg border border-border/60 bg-card p-4">
                <p className="text-sm font-semibold text-foreground">{d.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{d.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MVP Core */}
        <section className="rounded-xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">MVP Synaptic Core</h2>
          <p className="text-xs text-muted-foreground mb-4">Minimum viable neural architecture to demonstrate the platform</p>
          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Modules</h3>
              <ul className="space-y-1">
                {["Solution Discovery Engine", "CRM Builder", "Intelligent Sales Builder", "Inventory & Order Builder", "Portal Builder"].map((m) => (
                  <li key={m} className="text-sm text-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {m}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Capabilities</h3>
              <ul className="space-y-1">
                {["lead_capture", "pipeline_management", "quote_generation", "order_management", "inventory_visibility", "workflow_automation", "portal_access", "recommendation_logic"].map((c) => (
                  <li key={c} className="text-sm text-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Supporting Layers</h3>
              <ul className="space-y-1">
                {["Event Bus", "Workflow Engine", "MCP Hub", "Knowledge Sync Bridge", "PostgreSQL", "Graph Layer (lightweight)"].map((s) => (
                  <li key={s} className="text-sm text-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Narrative */}
        <section className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-base text-foreground font-medium italic max-w-2xl mx-auto">
            "The system is not a collection of apps. It is a synaptic business operating system
            where operational modules, semantic knowledge and decision intelligence are connected
            through events and reusable capabilities."
          </p>
          <p className="text-xs text-muted-foreground">
            Architecture that detects needs, composes solutions, executes workflows, learns from outcomes and improves decisions over time.
          </p>
        </section>
      </div>
    </div>
  );
}
