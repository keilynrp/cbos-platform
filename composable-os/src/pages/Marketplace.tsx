import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  CheckCircle2,
  Star,
  Users,
  FolderKanban,
  BarChart3,
  Brain,
  FileText,
  Share2,
  Target,
  Store,
  Headphones,
  Package,
  Zap,
  Shield,
  CreditCard,
  Mail,
  CalendarDays,
  Workflow,
  UserCog,
  Truck,
  Globe,
  MessageSquare,
} from "lucide-react";

// --- Types & Data ---

interface App {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: typeof Brain;
  color: string;
  bg: string;
  category: string;
  installed: boolean;
  rating: number;
  installs: string;
  author: string;
  version: string;
  features: string[];
  tags: string[];
}

const categories = [
  { id: "all", label: "All Apps", count: 16 },
  { id: "core", label: "Core Modules", count: 6 },
  { id: "operations", label: "Operations", count: 4 },
  { id: "communication", label: "Communication", count: 3 },
  { id: "automation", label: "Automation", count: 3 },
];

const apps: App[] = [
  // Core — installed
  { id: "projects", name: "Project Management", description: "Kanban boards, sprints, and task tracking.", longDescription: "Full project management suite with Kanban boards, sprint planning, time tracking, and team workload visualization. Tasks connect to documents and knowledge entities for full traceability.", icon: FolderKanban, color: "text-primary", bg: "bg-primary/10", category: "core", installed: true, rating: 4.9, installs: "12.4K", author: "Composable OS", version: "2.3.0", features: ["Kanban boards", "Sprint planning", "Time tracking", "Team workload", "Document linking"], tags: ["project", "agile", "kanban"] },
  { id: "crm", name: "CRM", description: "Leads, deals, contacts, and organizations.", longDescription: "Complete customer relationship management with pipeline visualization, contact management, and activity timelines. Deals auto-create projects when closed.", icon: Users, color: "text-accent", bg: "bg-accent/10", category: "core", installed: true, rating: 4.8, installs: "10.2K", author: "Composable OS", version: "2.1.0", features: ["Deal pipeline", "Contact management", "Organizations", "Activity timeline", "Auto project creation"], tags: ["sales", "contacts", "pipeline"] },
  { id: "documents", name: "Documents", description: "Collaborative documents with version control.", longDescription: "Notion-like document editor with real-time collaboration, version history, and linked knowledge entities. Documents connect to the knowledge graph for rich context.", icon: FileText, color: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/10", category: "core", installed: true, rating: 4.7, installs: "11.8K", author: "Composable OS", version: "1.9.0", features: ["Rich editor", "Version history", "Entity linking", "Folder organization", "Collaborative editing"], tags: ["docs", "editor", "collaboration"] },
  { id: "knowledge", name: "Knowledge Graph", description: "Explore entities, relationships, and connected data.", longDescription: "Interactive network graph visualization for exploring entities, relationships, and connections across your entire organization's data. Supports authors, articles, datasets, and institutions.", icon: Share2, color: "text-primary", bg: "bg-primary/10", category: "core", installed: true, rating: 4.9, installs: "8.6K", author: "Composable OS", version: "3.0.0", features: ["Interactive graph", "Entity search", "Type filtering", "Detail panel", "Relationship mapping"], tags: ["graph", "entities", "data"] },
  { id: "analytics", name: "Analytics", description: "Revenue, performance, and marketing dashboards.", longDescription: "Cross-module analytics with revenue tracking, project performance, marketing funnel analysis, knowledge graph metrics, and AI-powered insights.", icon: BarChart3, color: "text-[hsl(var(--cbs-amber))]", bg: "bg-[hsl(var(--cbs-amber))]/10", category: "core", installed: true, rating: 4.8, installs: "9.1K", author: "Composable OS", version: "2.5.0", features: ["Revenue dashboard", "Sprint velocity", "Marketing funnel", "Knowledge metrics", "AI insights"], tags: ["charts", "metrics", "revenue"] },
  { id: "ai-agents", name: "AI Agents", description: "Intelligent assistants for your organization.", longDescription: "AI-powered agents that analyze company data across all modules. Includes Research, Marketing, Project Assistant, and Data Analyst agents with chat interfaces.", icon: Brain, color: "text-accent", bg: "bg-accent/10", category: "core", installed: true, rating: 4.6, installs: "7.3K", author: "Composable OS", version: "1.5.0", features: ["Research Agent", "Marketing Agent", "Project Assistant", "Data Analyst", "Chat interface"], tags: ["ai", "agents", "automation"] },
  // Operations — not installed
  { id: "hr", name: "HR & People", description: "Employee management, leave tracking, and org charts.", longDescription: "Comprehensive HR module with employee profiles, leave management, performance reviews, org chart visualization, and payroll integration.", icon: UserCog, color: "text-primary", bg: "bg-primary/10", category: "operations", installed: false, rating: 4.5, installs: "5.2K", author: "Composable OS", version: "1.2.0", features: ["Employee profiles", "Leave management", "Org chart", "Performance reviews", "Payroll integration"], tags: ["hr", "people", "employees"] },
  { id: "inventory", name: "Inventory", description: "Stock management, warehouses, and supply chain.", longDescription: "End-to-end inventory management with multi-warehouse support, stock tracking, reorder alerts, and supply chain analytics integrated with the knowledge graph.", icon: Package, color: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/10", category: "operations", installed: false, rating: 4.4, installs: "3.8K", author: "Composable OS", version: "1.0.0", features: ["Multi-warehouse", "Stock tracking", "Reorder alerts", "Supply chain", "Barcode scanning"], tags: ["inventory", "stock", "warehouse"] },
  { id: "finance", name: "Finance & Invoicing", description: "Invoices, expenses, and financial reporting.", longDescription: "Financial management with invoice generation, expense tracking, profit & loss reports, and bank reconciliation. Connects to CRM deals for seamless billing.", icon: CreditCard, color: "text-[hsl(var(--cbs-amber))]", bg: "bg-[hsl(var(--cbs-amber))]/10", category: "operations", installed: false, rating: 4.6, installs: "6.1K", author: "Composable OS", version: "1.8.0", features: ["Invoice generation", "Expense tracking", "P&L reports", "Bank reconciliation", "CRM integration"], tags: ["finance", "invoicing", "accounting"] },
  { id: "shipping", name: "Shipping & Logistics", description: "Order fulfillment, tracking, and delivery management.", longDescription: "Manage shipping workflows from order to delivery. Multi-carrier support, real-time tracking, and route optimization powered by AI.", icon: Truck, color: "text-accent", bg: "bg-accent/10", category: "operations", installed: false, rating: 4.3, installs: "2.4K", author: "Composable OS", version: "0.9.0", features: ["Multi-carrier", "Real-time tracking", "Route optimization", "Label generation", "Returns management"], tags: ["shipping", "logistics", "delivery"] },
  // Communication
  { id: "support", name: "Customer Support", description: "Helpdesk, ticketing, and live chat.", longDescription: "Full customer support suite with ticket management, live chat, knowledge base integration, SLA tracking, and customer satisfaction surveys.", icon: Headphones, color: "text-primary", bg: "bg-primary/10", category: "communication", installed: false, rating: 4.7, installs: "4.9K", author: "Composable OS", version: "1.4.0", features: ["Ticket management", "Live chat", "Knowledge base", "SLA tracking", "CSAT surveys"], tags: ["support", "helpdesk", "tickets"] },
  { id: "email", name: "Email Marketing", description: "Campaigns, templates, and audience segmentation.", longDescription: "Design and send email campaigns with drag-and-drop templates, A/B testing, audience segmentation, and detailed analytics. Integrates with CRM contacts.", icon: Mail, color: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/10", category: "communication", installed: false, rating: 4.5, installs: "5.7K", author: "Composable OS", version: "1.6.0", features: ["Template builder", "A/B testing", "Segmentation", "Send scheduling", "CRM sync"], tags: ["email", "marketing", "campaigns"] },
  { id: "chat", name: "Team Chat", description: "Internal messaging, channels, and threads.", longDescription: "Real-time team communication with channels, direct messages, threads, file sharing, and integration with project tasks and CRM activities.", icon: MessageSquare, color: "text-[hsl(var(--cbs-amber))]", bg: "bg-[hsl(var(--cbs-amber))]/10", category: "communication", installed: false, rating: 4.4, installs: "6.8K", author: "Composable OS", version: "1.1.0", features: ["Channels", "Direct messages", "Threads", "File sharing", "Task integration"], tags: ["chat", "messaging", "team"] },
  // Automation
  { id: "automation", name: "Workflow Automation", description: "No-code automation between modules.", longDescription: "Build automated workflows with a visual drag-and-drop builder. Trigger actions across any module — when a deal closes, send an email, create a project, and notify the team.", icon: Workflow, color: "text-primary", bg: "bg-primary/10", category: "automation", installed: false, rating: 4.8, installs: "4.1K", author: "Composable OS", version: "1.3.0", features: ["Visual builder", "Cross-module triggers", "Conditional logic", "Scheduling", "Webhook support"], tags: ["automation", "workflows", "no-code"] },
  { id: "security", name: "Security & Compliance", description: "Audit logs, permissions, and compliance tools.", longDescription: "Enterprise security module with detailed audit logging, role-based access control, GDPR compliance tools, and security posture monitoring.", icon: Shield, color: "text-accent", bg: "bg-accent/10", category: "automation", installed: false, rating: 4.6, installs: "3.2K", author: "Composable OS", version: "1.0.0", features: ["Audit logs", "RBAC", "GDPR tools", "Security monitoring", "SSO integration"], tags: ["security", "compliance", "audit"] },
  { id: "integrations", name: "Integrations Hub", description: "Connect to Slack, GitHub, Stripe, and 200+ apps.", longDescription: "Pre-built connectors for popular tools. Sync data bidirectionally with Slack, GitHub, Stripe, Salesforce, HubSpot, Jira, and 200+ other applications.", icon: Globe, color: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/10", category: "automation", installed: false, rating: 4.7, installs: "7.9K", author: "Composable OS", version: "2.0.0", features: ["200+ connectors", "Bidirectional sync", "Webhook triggers", "API builder", "Data mapping"], tags: ["integrations", "api", "connectors"] },
];

// --- Components ---

function AppCard({ app, onSelect, onToggleInstall }: { app: App; onSelect: () => void; onToggleInstall: () => void }) {
  const Icon = app.icon;
  return (
    <Card className="border border-border/60 hover:border-primary/20 hover:shadow-md transition-all cursor-pointer group" onClick={onSelect}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className={`h-11 w-11 rounded-xl ${app.bg} flex items-center justify-center`}>
            <Icon className={`h-5.5 w-5.5 ${app.color}`} />
          </div>
          {app.installed ? (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 bg-[hsl(var(--cbs-green))]/10 text-[hsl(var(--cbs-green))] border-[hsl(var(--cbs-green))]/20">
              <CheckCircle2 className="h-3 w-3" /> Installed
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onToggleInstall(); }}
            >
              <Download className="h-3 w-3" /> Install
            </Button>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold">{app.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{app.description}</p>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-[hsl(var(--cbs-amber))] fill-[hsl(var(--cbs-amber))]" /> {app.rating}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" /> {app.installs}
          </span>
          <span className="text-[10px] ml-auto">v{app.version}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function AppDetailModal({ app, open, onClose, onToggleInstall }: { app: App | null; open: boolean; onClose: () => void; onToggleInstall: () => void }) {
  if (!app) return null;
  const Icon = app.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl ${app.bg} flex items-center justify-center`}>
              <Icon className={`h-6 w-6 ${app.color}`} />
            </div>
            <div>
              <DialogTitle className="text-lg">{app.name}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">by {app.author} · v{app.version}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Stats */}
          <div className="flex gap-4">
            {[
              { icon: Star, label: "Rating", value: app.rating.toString(), extra: "text-[hsl(var(--cbs-amber))]" },
              { icon: Download, label: "Installs", value: app.installs, extra: "" },
            ].map(s => {
              const SIcon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-2 text-sm">
                  <SIcon className={`h-4 w-4 ${s.extra || "text-muted-foreground"}`} />
                  <span className="font-medium">{s.value}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">{app.longDescription}</p>

          {/* Features */}
          <div>
            <p className="text-xs font-semibold mb-2">Features</p>
            <div className="grid grid-cols-2 gap-1.5">
              {app.features.map(f => (
                <span key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-[hsl(var(--cbs-green))]" /> {f}
                </span>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {app.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">{tag}</Badge>
            ))}
          </div>

          {/* Action */}
          <Button className="w-full gap-2" variant={app.installed ? "outline" : "default"} onClick={onToggleInstall}>
            {app.installed ? (
              <><CheckCircle2 className="h-4 w-4" /> Installed — Uninstall</>
            ) : (
              <><Download className="h-4 w-4" /> Install {app.name}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Main ---

const Marketplace = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [installedState, setInstalledState] = useState<Record<string, boolean>>(
    Object.fromEntries(apps.map(a => [a.id, a.installed]))
  );
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const toggleInstall = (id: string) => {
    setInstalledState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const enrichedApps = apps.map(a => ({ ...a, installed: installedState[a.id] ?? a.installed }));

  const filtered = enrichedApps.filter(a => {
    if (activeCategory !== "all" && a.category !== activeCategory) return false;
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase()) && !a.tags.some(t => t.includes(searchQuery.toLowerCase()))) return false;
    return true;
  });

  const installedApps = filtered.filter(a => a.installed);
  const availableApps = filtered.filter(a => !a.installed);
  const selectedApp = enrichedApps.find(a => a.id === selectedAppId) || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">App Marketplace</h1>
          <p className="text-muted-foreground text-sm mt-1">Install new modules to extend your composable workspace.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Store className="h-4 w-4" />
          <span>{enrichedApps.filter(a => a.installed).length} of {enrichedApps.length} installed</span>
        </div>
      </div>

      {/* Search & Categories */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search apps..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        <div className="flex items-center gap-1.5">
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Installed */}
      {installedApps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[hsl(var(--cbs-green))]" /> Installed ({installedApps.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {installedApps.map(app => (
              <AppCard key={app.id} app={app} onSelect={() => setSelectedAppId(app.id)} onToggleInstall={() => toggleInstall(app.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Available */}
      {availableApps.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" /> Available ({availableApps.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableApps.map(app => (
              <AppCard key={app.id} app={app} onSelect={() => setSelectedAppId(app.id)} onToggleInstall={() => toggleInstall(app.id)} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Store className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No apps match your search.</p>
        </div>
      )}

      {/* Detail Modal */}
      <AppDetailModal
        app={selectedApp}
        open={!!selectedAppId}
        onClose={() => setSelectedAppId(null)}
        onToggleInstall={() => { if (selectedAppId) toggleInstall(selectedAppId); }}
      />
    </div>
  );
};

export default Marketplace;
