import { useState } from "react";
import { useCRMStore, type CRMDeal } from "@/stores/useCRMStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  MoreHorizontal,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  ArrowRight,
  FolderKanban,
  MessageSquare,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Briefcase,
  Send,
} from "lucide-react";

// --- Mock Data ---

// Pipeline stages now come from the shared store

const contacts = [
  { id: "c1", name: "Sarah Chen", email: "sarah@acme.com", phone: "+1 555-0101", org: "Acme Corp", role: "VP Engineering", initials: "SC", deals: 1, lastActivity: "2 hours ago" },
  { id: "c2", name: "Tom Baker", email: "tom@globex.com", phone: "+1 555-0102", org: "Globex Corp", role: "CTO", initials: "TB", deals: 1, lastActivity: "1 day ago" },
  { id: "c3", name: "James Park", email: "james@megacorp.com", phone: "+1 555-0103", org: "MegaCorp", role: "Head of Product", initials: "JP", deals: 2, lastActivity: "3 hours ago" },
  { id: "c4", name: "Rachel Kim", email: "rachel@vertex.io", phone: "+1 555-0104", org: "Vertex Solutions", role: "CEO", initials: "RK", deals: 1, lastActivity: "5 hours ago" },
  { id: "c5", name: "David Lin", email: "david@horizon.com", phone: "+1 555-0105", org: "Horizon Media", role: "Director of Ops", initials: "DL", deals: 1, lastActivity: "2 days ago" },
  { id: "c6", name: "Amy Liu", email: "amy@novatech.io", phone: "+1 555-0106", org: "NovaTech", role: "Data Lead", initials: "AL", deals: 1, lastActivity: "4 hours ago" },
];

const organizations = [
  { id: "o1", name: "Acme Corp", industry: "Technology", contacts: 4, openDeals: 1, totalValue: "$24,000", initials: "AC" },
  { id: "o2", name: "Globex Corp", industry: "Manufacturing", contacts: 3, openDeals: 1, totalValue: "$45,000", initials: "GC" },
  { id: "o3", name: "MegaCorp", industry: "Finance", contacts: 6, openDeals: 2, totalValue: "$72,000", initials: "MC" },
  { id: "o4", name: "Vertex Solutions", industry: "Consulting", contacts: 2, openDeals: 1, totalValue: "$52,000", initials: "VS" },
  { id: "o5", name: "Horizon Media", industry: "Media", contacts: 5, openDeals: 0, totalValue: "$60,000", initials: "HM" },
  { id: "o6", name: "NovaTech", industry: "AI / ML", contacts: 3, openDeals: 1, totalValue: "$22,500", initials: "NT" },
];

const activityTimeline = [
  { id: "a1", type: "deal", icon: CheckCircle2, color: "text-[hsl(var(--cbs-green))]", bgColor: "bg-[hsl(var(--cbs-green))]/10", title: "Deal closed — Horizon Media Enterprise", description: "David Lin signed the annual contract for $60,000", time: "2 hours ago", linkedProject: "Horizon Media Onboarding" },
  { id: "a2", type: "email", icon: Mail, color: "text-accent", bgColor: "bg-accent/10", title: "Email sent to Rachel Kim", description: "Follow-up on contract terms for Vertex Solutions", time: "3 hours ago" },
  { id: "a3", type: "call", icon: Phone, color: "text-primary", bgColor: "bg-primary/10", title: "Call with James Park", description: "Discussed MegaCorp implementation timeline — 30 min", time: "5 hours ago" },
  { id: "a4", type: "note", icon: MessageSquare, color: "text-[hsl(var(--cbs-amber))]", bgColor: "bg-[hsl(var(--cbs-amber))]/10", title: "Note added to Acme Corp deal", description: "Sarah mentioned budget review happening next week", time: "1 day ago" },
  { id: "a5", type: "meeting", icon: Calendar, color: "text-primary", bgColor: "bg-primary/10", title: "Meeting scheduled with NovaTech", description: "Demo of Knowledge Graph module — Mar 12 at 2pm", time: "1 day ago" },
  { id: "a6", type: "document", icon: FileText, color: "text-accent", bgColor: "bg-accent/10", title: "Proposal sent to MegaCorp", description: "Full Suite proposal v2 with revised pricing", time: "2 days ago" },
  { id: "a7", type: "deal", icon: AlertCircle, color: "text-[hsl(var(--cbs-amber))]", bgColor: "bg-[hsl(var(--cbs-amber))]/10", title: "Deal stalled — TechStart Starter Plan", description: "No activity for 14 days — needs follow-up", time: "3 days ago" },
];

// --- Sub-Components ---

const kpiStats = [
  { label: "Total Pipeline", value: "$346,500", change: "+12%", icon: DollarSign, trend: "up" },
  { label: "Open Deals", value: "10", change: "+3", icon: Briefcase, trend: "up" },
  { label: "Win Rate", value: "34%", change: "+5%", icon: TrendingUp, trend: "up" },
  { label: "Avg Deal Size", value: "$34,650", change: "+8%", icon: DollarSign, trend: "up" },
];

function DealCard({ deal }: { deal: CRMDeal }) {
  return (
    <Card className="group cursor-pointer border border-border/60 shadow-sm hover:shadow-md transition-all hover:border-primary/30 bg-card">
      <CardContent className="p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{deal.name}</p>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="bg-primary/10 text-primary text-[9px]">{deal.initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">{deal.contact}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">{deal.value}</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {deal.daysInStage}d
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
              {deal.probability}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Pipeline() {
  const stages = useCRMStore((s) => s.stages);
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
      {stages.map((stage) => (
        <div key={stage.id} className="min-w-[264px] w-[264px] shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
              <span className="text-sm font-semibold">{stage.title}</span>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {stage.deals.length}
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{stage.total}</span>
          </div>
          <div className="space-y-2.5">
            {stage.deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactsList() {
  return (
    <div className="grid gap-3">
      {contacts.map((c) => (
        <Card key={c.id} className="border border-border/60 hover:border-primary/20 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">{c.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{c.name}</p>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{c.role}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{c.org}</p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-medium">{c.deals} deal{c.deals > 1 ? "s" : ""}</p>
              <p className="text-[11px] text-muted-foreground">{c.lastActivity}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrganizationsList() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {organizations.map((org) => (
        <Card key={org.id} className="border border-border/60 hover:border-primary/20 transition-colors cursor-pointer">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{org.name}</p>
                <p className="text-xs text-muted-foreground">{org.industry}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-sm font-semibold">{org.contacts}</p>
                <p className="text-[10px] text-muted-foreground">Contacts</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-sm font-semibold">{org.openDeals}</p>
                <p className="text-[10px] text-muted-foreground">Open Deals</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-sm font-semibold">{org.totalValue}</p>
                <p className="text-[10px] text-muted-foreground">Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivityTimeline() {
  const recentPushes = useCRMStore((s) => s.recentPushes);
  const allActivities = [
    ...recentPushes.map((a) => ({
      id: a.id, type: a.type, icon: Send, color: "text-primary", bgColor: "bg-primary/10",
      title: a.title, description: a.description, time: a.time, linkedProject: undefined as string | undefined,
    })),
    ...activityTimeline,
  ];

  return (
    <div className="space-y-1">
      {allActivities.map((activity, i) => {
        const Icon = activity.icon;
        return (
          <div key={activity.id} className="flex gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
            <div className="relative">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${activity.bgColor}`}>
                <Icon className={`h-4 w-4 ${activity.color}`} />
              </div>
              {i < allActivities.length - 1 && (
                <div className="absolute left-1/2 top-8 w-px h-[calc(100%+4px)] bg-border -translate-x-1/2" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">{activity.time}</span>
              </div>
              {activity.linkedProject && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--cbs-green))]/10 border border-[hsl(var(--cbs-green))]/20 px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--cbs-green))]">
                  <FolderKanban className="h-3 w-3" />
                  Auto-created project: {activity.linkedProject}
                  <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Main Page ---

const CRM = () => {
  const [activeTab, setActiveTab] = useState("pipeline");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage leads, deals, and relationships — deals auto-create projects on close.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Building2 className="h-4 w-4" /> Add Organization
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Deal
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border border-border/60">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-[11px] text-[hsl(var(--cbs-green))] font-medium">{stat.change}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Contacts
          </TabsTrigger>
          <TabsTrigger value="organizations" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Organizations
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <Pipeline />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <ContactsList />
        </TabsContent>

        <TabsContent value="organizations" className="mt-4">
          <OrganizationsList />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Activity Timeline
                <Badge variant="secondary" className="text-[10px]">Last 7 days</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRM;
