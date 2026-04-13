import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useCRMStore } from "@/stores/useCRMStore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Search, Filter, Download, Plus, Building2, Mail, Phone, Globe, MapPin,
  Linkedin, UserCircle, Target, TrendingUp, Zap, Star, ChevronRight,
  ArrowRight, RefreshCw, CheckCircle2, Clock, AlertCircle, Sparkles,
  Users, DollarSign, GitBranch, Brain, Layers, MoreHorizontal, ExternalLink,
  ListFilter, BarChart3, Shield, Eye, Send,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────
type ProspectStatus = "new" | "enriched" | "contacted" | "qualified" | "nurturing";
type ViewMode = "search" | "detail" | "list-detail";

interface Prospect {
  id: string;
  name: string;
  title: string;
  company: string;
  companySize: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  website: string;
  initials: string;
  score: number;
  status: ProspectStatus;
  persona: string;
  revpathScore: number;
  intentSignals: string[];
  technologies: string[];
  lastActivity: string;
  enrichedAt: string;
  revenue: string;
  funding: string;
}

interface ProspectList {
  id: string;
  name: string;
  count: number;
  persona: string;
  lastUpdated: string;
  conversionRate: number;
  syncedToCRM: boolean;
}

// ── Mock Data ──────────────────────────────────────────────
const prospects: Prospect[] = [
  {
    id: "p1", name: "Sarah Chen", title: "VP of Engineering", company: "Acme Corp", companySize: "500-1000",
    industry: "SaaS", location: "San Francisco, CA", email: "sarah.chen@acme.com", phone: "+1 415-555-0142",
    linkedin: "linkedin.com/in/sarachen", website: "acme.com", initials: "SC", score: 92, status: "enriched",
    persona: "Technical Decision Maker", revpathScore: 87, intentSignals: ["Pricing Page Visit", "API Docs", "Competitor Comparison"],
    technologies: ["React", "AWS", "Kubernetes", "PostgreSQL"], lastActivity: "2h ago", enrichedAt: "Mar 5, 2026",
    revenue: "$45M", funding: "Series C — $80M",
  },
  {
    id: "p2", name: "Marcus Johnson", title: "Chief Revenue Officer", company: "Globex Corp", companySize: "1000-5000",
    industry: "Enterprise Software", location: "New York, NY", email: "m.johnson@globex.com", phone: "+1 212-555-0198",
    linkedin: "linkedin.com/in/marcusjohnson", website: "globex.com", initials: "MJ", score: 88, status: "contacted",
    persona: "Revenue Leader", revpathScore: 91, intentSignals: ["Demo Request", "ROI Calculator", "Case Study Download"],
    technologies: ["Salesforce", "Azure", "Snowflake"], lastActivity: "5h ago", enrichedAt: "Mar 4, 2026",
    revenue: "$120M", funding: "Series D — $200M",
  },
  {
    id: "p3", name: "Lena Zhao", title: "Head of Product", company: "DataFlow Labs", companySize: "50-200",
    industry: "Data Analytics", location: "Austin, TX", email: "lena@dataflow.io", phone: "+1 512-555-0167",
    linkedin: "linkedin.com/in/lenazhao", website: "dataflow.io", initials: "LZ", score: 79, status: "new",
    persona: "Product Champion", revpathScore: 72, intentSignals: ["Blog Read", "Newsletter Signup"],
    technologies: ["Python", "GCP", "BigQuery", "dbt"], lastActivity: "1d ago", enrichedAt: "Mar 6, 2026",
    revenue: "$8M", funding: "Series A — $15M",
  },
  {
    id: "p4", name: "Tom Baker", title: "Director of IT", company: "NovaTech", companySize: "200-500",
    industry: "FinTech", location: "Chicago, IL", email: "tbaker@novatech.io", phone: "+1 312-555-0134",
    linkedin: "linkedin.com/in/tombaker", website: "novatech.io", initials: "TB", score: 85, status: "qualified",
    persona: "Technical Decision Maker", revpathScore: 83, intentSignals: ["Free Trial Signup", "Integration Docs", "Security Whitepaper"],
    technologies: ["Java", "AWS", "Kafka", "MongoDB"], lastActivity: "3h ago", enrichedAt: "Mar 3, 2026",
    revenue: "$22M", funding: "Series B — $40M",
  },
  {
    id: "p5", name: "Amy Liu", title: "CMO", company: "BrightScale", companySize: "100-500",
    industry: "MarTech", location: "Seattle, WA", email: "amy@brightscale.com", phone: "+1 206-555-0189",
    linkedin: "linkedin.com/in/amyliu", website: "brightscale.com", initials: "AL", score: 74, status: "nurturing",
    persona: "Marketing Leader", revpathScore: 68, intentSignals: ["Webinar Attended", "eBook Download"],
    technologies: ["HubSpot", "Segment", "Mixpanel"], lastActivity: "2d ago", enrichedAt: "Mar 2, 2026",
    revenue: "$12M", funding: "Series A — $20M",
  },
  {
    id: "p6", name: "James Wright", title: "CEO", company: "CloudPeak", companySize: "10-50",
    industry: "Cloud Infrastructure", location: "Denver, CO", email: "james@cloudpeak.dev", phone: "+1 720-555-0156",
    linkedin: "linkedin.com/in/jameswright", website: "cloudpeak.dev", initials: "JW", score: 67, status: "new",
    persona: "Executive Buyer", revpathScore: 58, intentSignals: ["Homepage Visit"],
    technologies: ["Terraform", "AWS", "Docker"], lastActivity: "4d ago", enrichedAt: "Mar 6, 2026",
    revenue: "$2M", funding: "Seed — $3M",
  },
];

const prospectLists: ProspectList[] = [
  { id: "l1", name: "Enterprise SaaS Decision Makers", count: 245, persona: "Technical Decision Maker", lastUpdated: "2h ago", conversionRate: 18, syncedToCRM: true },
  { id: "l2", name: "Series B+ Revenue Leaders", count: 128, persona: "Revenue Leader", lastUpdated: "1d ago", conversionRate: 24, syncedToCRM: true },
  { id: "l3", name: "MarTech Product Champions", count: 89, persona: "Product Champion", lastUpdated: "3d ago", conversionRate: 12, syncedToCRM: false },
  { id: "l4", name: "FinTech IT Directors", count: 67, persona: "Technical Decision Maker", lastUpdated: "5h ago", conversionRate: 21, syncedToCRM: true },
  { id: "l5", name: "Startup Executive Buyers", count: 312, persona: "Executive Buyer", lastUpdated: "6h ago", conversionRate: 9, syncedToCRM: false },
];

const scoreDistribution = [
  { range: "90-100", count: 42, fill: "hsl(var(--cbs-green))" },
  { range: "80-89", count: 87, fill: "hsl(var(--primary))" },
  { range: "70-79", count: 124, fill: "hsl(var(--accent))" },
  { range: "60-69", count: 98, fill: "hsl(var(--cbs-amber))" },
  { range: "50-59", count: 56, fill: "hsl(var(--muted-foreground))" },
  { range: "<50", count: 23, fill: "hsl(var(--destructive))" },
];

const intentByPersona = [
  { name: "Tech DM", high: 45, medium: 32, low: 18 },
  { name: "Rev Leader", high: 38, medium: 41, low: 12 },
  { name: "Product", high: 22, medium: 48, low: 29 },
  { name: "Executive", high: 31, medium: 27, low: 35 },
  { name: "Marketing", high: 19, medium: 38, low: 42 },
];

const enrichmentSources = [
  { name: "Company Data", value: 35, color: "hsl(var(--primary))" },
  { name: "Intent Signals", value: 25, color: "hsl(var(--accent))" },
  { name: "Technographics", value: 20, color: "hsl(var(--cbs-green))" },
  { name: "Social Profiles", value: 12, color: "hsl(var(--cbs-amber))" },
  { name: "RevPath Insights", value: 8, color: "hsl(var(--muted-foreground))" },
];

const kpis = [
  { label: "Total Prospects", value: "1,284", change: "+156 this week", trend: "up", icon: Users },
  { label: "Avg Lead Score", value: "76.4", change: "+3.2 pts", trend: "up", icon: Target },
  { label: "Enrichment Rate", value: "94.7%", change: "+1.8%", trend: "up", icon: Sparkles },
  { label: "CRM Sync Rate", value: "87.3%", change: "+4.5%", trend: "up", icon: RefreshCw },
];

// ── Helpers ────────────────────────────────────────────────
const statusConfig: Record<ProspectStatus, { label: string; color: string }> = {
  new: { label: "New", color: "bg-muted-foreground/20 text-muted-foreground" },
  enriched: { label: "Enriched", color: "bg-primary/15 text-primary" },
  contacted: { label: "Contacted", color: "bg-accent/15 text-accent" },
  qualified: { label: "Qualified", color: "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))]" },
  nurturing: { label: "Nurturing", color: "bg-[hsl(var(--cbs-amber))]/15 text-[hsl(var(--cbs-amber))]" },
};

function scoreColor(score: number) {
  if (score >= 85) return "text-[hsl(var(--cbs-green))]";
  if (score >= 70) return "text-primary";
  if (score >= 55) return "text-[hsl(var(--cbs-amber))]";
  return "text-destructive";
}

function scoreBg(score: number) {
  if (score >= 85) return "bg-[hsl(var(--cbs-green))]/15";
  if (score >= 70) return "bg-primary/15";
  if (score >= 55) return "bg-[hsl(var(--cbs-amber))]/15";
  return "bg-destructive/15";
}

// ── Component ──────────────────────────────────────────────
export default function Prospecting() {
  const [view, setView] = useState<ViewMode>("search");
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [selectedList, setSelectedList] = useState<ProspectList | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pushedIds, setPushedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const navigate = useNavigate();
  const pushProspectToCRM = useCRMStore((s) => s.pushProspectToCRM);

  const handlePushToCRM = (p: Prospect) => {
    if (pushedIds.has(p.id)) return;
    const stageName = pushProspectToCRM({
      id: p.id, name: p.name, title: p.title,
      company: p.company, initials: p.initials,
      score: p.score, revenue: p.revenue,
    });
    setPushedIds((prev) => new Set(prev).add(p.id));
    toast({
      title: "Pushed to CRM",
      description: `${p.name} (${p.company}) → "${stageName}" stage (score: ${p.score})`,
    });
  };

  const handleBulkPush = () => {
    const toPush = prospects.filter((p) => selectedProspects.has(p.id) && !pushedIds.has(p.id));
    toPush.forEach((p) => {
      pushProspectToCRM({
        id: p.id, name: p.name, title: p.title,
        company: p.company, initials: p.initials,
        score: p.score, revenue: p.revenue,
      });
    });
    setPushedIds((prev) => {
      const next = new Set(prev);
      toPush.forEach((p) => next.add(p.id));
      return next;
    });
    setSelectedProspects(new Set());
    toast({
      title: `Pushed ${toPush.length} prospect${toPush.length > 1 ? "s" : ""} to CRM`,
      description: "Auto-assigned to pipeline stages based on lead scores.",
    });
  };

  const filtered = prospects.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.company.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
    const matchesIndustry = industryFilter === "all" || p.industry === industryFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesIndustry && matchesStatus;
  });

  const toggleSelect = (id: string) => {
    setSelectedProspects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openDetail = (p: Prospect) => { setSelectedProspect(p); setView("detail"); };
  const openListDetail = (l: ProspectList) => { setSelectedList(l); setView("list-detail"); };
  const goBack = () => { setView("search"); setSelectedProspect(null); setSelectedList(null); };

  // ── Detail View ──────────────────────────────────────────
  if (view === "detail" && selectedProspect) {
    const p = selectedProspect;
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={goBack} className="hover:text-foreground transition-colors">Prospecting</button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{p.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{p.initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
              <p className="text-muted-foreground">{p.title} at {p.company}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={statusConfig[p.status].color}>{statusConfig[p.status].label}</Badge>
                <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" />{p.location}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Email</Button>
            <Button variant="outline" size="sm" className="gap-1.5"><Phone className="h-3.5 w-3.5" />Call</Button>
            <Button size="sm" className="gap-1.5" onClick={() => handlePushToCRM(p)} disabled={pushedIds.has(p.id)}>
              {pushedIds.has(p.id) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              {pushedIds.has(p.id) ? "In CRM" : "Push to CRM"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="enrichment">Enrichment</TabsTrigger>
            <TabsTrigger value="revpath">RevPath Intel</TabsTrigger>
            <TabsTrigger value="persona">Persona Match</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lead Score */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Lead Score</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className={`text-4xl font-black ${scoreColor(p.score)}`}>{p.score}</div>
                    <div className="flex-1">
                      <Progress value={p.score} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Top {100 - p.score + 5}% of prospects</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Contact Info */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Contact Info</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{p.email}</div>
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{p.phone}</div>
                  <div className="flex items-center gap-2"><Linkedin className="h-3.5 w-3.5 text-muted-foreground" />{p.linkedin}</div>
                </CardContent>
              </Card>
              {/* Company */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Company</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{p.company} · {p.companySize} employees</div>
                  <div className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" />Revenue: {p.revenue}</div>
                  <div className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />{p.funding}</div>
                </CardContent>
              </Card>
            </div>

            {/* Intent Signals */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Intent Signals</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {p.intentSignals.map((s) => (
                    <Badge key={s} variant="outline" className="bg-primary/5 border-primary/20 gap-1">
                      <Eye className="h-3 w-3" />{s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Technologies */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-accent" />Tech Stack</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {p.technologies.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enrichment Tab */}
          <TabsContent value="enrichment" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Enrichment Sources</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={enrichmentSources} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {enrichmentSources.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Enrichment Timeline</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { date: p.enrichedAt, action: "Contact info verified", source: "Email Verification", icon: CheckCircle2, color: "text-[hsl(var(--cbs-green))]" },
                    { date: "Mar 4, 2026", action: "Company data enriched", source: "Company Database", icon: Building2, color: "text-primary" },
                    { date: "Mar 3, 2026", action: "Tech stack identified", source: "Technographics", icon: Layers, color: "text-accent" },
                    { date: "Mar 2, 2026", action: "Intent signals detected", source: "RevPath Intelligence", icon: Zap, color: "text-[hsl(var(--cbs-amber))]" },
                    { date: "Mar 1, 2026", action: "Social profile linked", source: "LinkedIn Scraper", icon: Linkedin, color: "text-primary" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <item.icon className={`h-4 w-4 mt-0.5 ${item.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.action}</p>
                        <p className="text-xs text-muted-foreground">{item.source} · {item.date}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-[hsl(var(--cbs-green))]" />Data Quality</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Email Verified", value: true },
                  { label: "Phone Verified", value: true },
                  { label: "LinkedIn Active", value: true },
                  { label: "Company Match", value: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--cbs-green))]" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RevPath Intel Tab */}
          <TabsContent value="revpath" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">RevPath Score</span>
                    <GitBranch className="h-4 w-4 text-primary" />
                  </div>
                  <div className={`text-3xl font-black ${scoreColor(p.revpathScore)}`}>{p.revpathScore}</div>
                  <Progress value={p.revpathScore} className="h-1.5 mt-2" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Content Touches</span>
                    <Eye className="h-4 w-4 text-accent" />
                  </div>
                  <div className="text-3xl font-black">14</div>
                  <p className="text-xs text-muted-foreground mt-1">Across 6 content pieces</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Revenue Attribution</span>
                    <DollarSign className="h-4 w-4 text-[hsl(var(--cbs-green))]" />
                  </div>
                  <div className="text-3xl font-black">$4,200</div>
                  <p className="text-xs text-muted-foreground mt-1">Estimated pipeline value</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Revenue Path Journey</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { keyword: "enterprise automation platform", intent: "Commercial", volume: "2,400/mo", position: 3, revenue: "$1,800" },
                  { keyword: "business process automation SaaS", intent: "Informational", volume: "5,100/mo", position: 7, revenue: "$920" },
                  { keyword: "composable business OS", intent: "Branded", volume: "880/mo", position: 1, revenue: "$1,480" },
                ].map((kw, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{kw.keyword}</p>
                      <p className="text-xs text-muted-foreground">{kw.volume} · Position #{kw.position}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">{kw.intent}</Badge>
                    <span className="text-sm font-bold text-[hsl(var(--cbs-green))]">{kw.revenue}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" />View in RevPath Intelligence</Button>
            </div>
          </TabsContent>

          {/* Persona Match Tab */}
          <TabsContent value="persona" className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-primary" />Matched Persona: {p.persona}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Match Confidence</p>
                    <p className="text-2xl font-black text-primary">94%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Persona Segment</p>
                    <p className="text-sm font-semibold">{p.persona}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Buying Stage</p>
                    <p className="text-sm font-semibold">Evaluation</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Preferred Channel</p>
                    <p className="text-sm font-semibold">Email + LinkedIn</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <p className="text-sm font-medium mb-2">Persona Traits Match</p>
                  <div className="space-y-2">
                    {[
                      { trait: "Decision Authority", match: 95 },
                      { trait: "Technical Depth", match: 88 },
                      { trait: "Budget Control", match: 72 },
                      { trait: "Innovation Appetite", match: 91 },
                    ].map((t) => (
                      <div key={t.trait} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-36">{t.trait}</span>
                        <Progress value={t.match} className="h-1.5 flex-1" />
                        <span className={`text-sm font-bold w-10 text-right ${scoreColor(t.match)}`}>{t.match}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-accent" />AI Persona Insights</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  "High alignment with 'Technical Decision Maker' persona — prioritize technical content and ROI-focused messaging.",
                  "Intent signals suggest evaluation phase — send comparison guides and case studies from similar-sized companies.",
                  "RevPath data shows strong engagement with API documentation — highlight integration capabilities in outreach.",
                ].map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-accent/5 border border-accent/10">
                    <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" />View in Persona Builder</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ── List Detail View ─────────────────────────────────────
  if (view === "list-detail" && selectedList) {
    const l = selectedList;
    const listProspects = prospects.filter((p) => p.persona === l.persona);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={goBack} className="hover:text-foreground transition-colors">Prospecting</button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{l.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{l.name}</h1>
            <p className="text-muted-foreground">{l.count} prospects · Persona: {l.persona}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" />Export</Button>
            <Button size="sm" className="gap-1.5">{l.syncedToCRM ? <CheckCircle2 className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}{l.syncedToCRM ? "Synced to CRM" : "Sync to CRM"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
              <p className="text-3xl font-black text-primary">{l.conversionRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Avg Lead Score</p>
              <p className="text-3xl font-black">{Math.round(listProspects.reduce((a, c) => a + c.score, 0) / (listProspects.length || 1))}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="text-lg font-semibold">{l.lastUpdated}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Prospects in List</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {listProspects.map((p) => (
              <button key={p.id} onClick={() => openDetail(p)} className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-colors text-left">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{p.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.title} · {p.company}</p>
                </div>
                <div className={`text-sm font-bold ${scoreColor(p.score)}`}>{p.score}</div>
                <Badge className={statusConfig[p.status].color}>{statusConfig[p.status].label}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
            {listProspects.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No matching prospects in this list.</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main Search View ─────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prospecting System</h1>
          <p className="text-muted-foreground text-sm">Find, enrich, and qualify leads with AI-powered intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" />Export</Button>
          <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />New List</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{k.label}</span>
                <k.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-black">{k.value}</div>
              <p className="text-xs text-[hsl(var(--cbs-green))] flex items-center gap-1"><TrendingUp className="h-3 w-3" />{k.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search" className="gap-1.5"><Search className="h-3.5 w-3.5" />Prospect Search</TabsTrigger>
          <TabsTrigger value="lists" className="gap-1.5"><ListFilter className="h-3.5 w-3.5" />Smart Lists</TabsTrigger>
          <TabsTrigger value="scoring" className="gap-1.5"><Target className="h-3.5 w-3.5" />Lead Scoring</TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5"><Brain className="h-3.5 w-3.5" />AI Insights</TabsTrigger>
        </TabsList>

        {/* ── Prospect Search ────────────────────────── */}
        <TabsContent value="search" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, company, or title…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Industry" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {[...new Set(prospects.map((p) => p.industry))].map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedProspects.size > 0 && (
              <Button size="sm" className="gap-1.5" onClick={handleBulkPush}><Send className="h-3.5 w-3.5" />Push {selectedProspects.size} to CRM</Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="p-3 text-left w-8"></th>
                      <th className="p-3 text-left">Prospect</th>
                      <th className="p-3 text-left">Company</th>
                      <th className="p-3 text-left">Industry</th>
                      <th className="p-3 text-center">Score</th>
                      <th className="p-3 text-center">RevPath</th>
                      <th className="p-3 text-left">Persona</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Signals</th>
                      <th className="p-3 text-right">Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => openDetail(p)}>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedProspects.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{p.initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium group-hover:text-primary transition-colors">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{p.company}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{p.industry}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center justify-center w-10 h-7 rounded-md text-xs font-bold ${scoreBg(p.score)} ${scoreColor(p.score)}`}>
                            {p.score}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center justify-center w-10 h-7 rounded-md text-xs font-bold ${scoreBg(p.revpathScore)} ${scoreColor(p.revpathScore)}`}>
                            {p.revpathScore}
                          </span>
                        </td>
                        <td className="p-3"><Badge variant="outline" className="text-xs">{p.persona}</Badge></td>
                        <td className="p-3"><Badge className={`text-xs ${statusConfig[p.status].color}`}>{statusConfig[p.status].label}</Badge></td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Zap className="h-3.5 w-3.5 text-[hsl(var(--cbs-amber))]" />
                            <span className="text-xs">{p.intentSignals.length} signals</span>
                          </div>
                        </td>
                        <td className="p-3 text-right text-muted-foreground text-xs">{p.lastActivity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No prospects found matching your criteria.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Smart Lists ────────────────────────────── */}
        <TabsContent value="lists" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prospectLists.map((l) => (
              <Card key={l.id} className="cursor-pointer hover:border-primary/30 transition-colors group" onClick={() => openListDetail(l)}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{l.name}</h3>
                      <p className="text-xs text-muted-foreground">{l.count} prospects · Updated {l.lastUpdated}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs gap-1"><UserCircle className="h-3 w-3" />{l.persona}</Badge>
                    {l.syncedToCRM && <Badge className="text-xs bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))]"><CheckCircle2 className="h-3 w-3 mr-1" />CRM Synced</Badge>}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Conversion Rate</span>
                      <span className="font-bold">{l.conversionRate}%</span>
                    </div>
                    <Progress value={l.conversionRate} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Lead Scoring ───────────────────────────── */}
        <TabsContent value="scoring" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Score Distribution</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {scoreDistribution.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-accent" />Intent by Persona</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intentByPersona} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={80} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="high" fill="hsl(var(--cbs-green))" stackId="a" radius={[0, 0, 0, 0]} name="High Intent" />
                    <Bar dataKey="medium" fill="hsl(var(--primary))" stackId="a" name="Medium Intent" />
                    <Bar dataKey="low" fill="hsl(var(--muted-foreground))" stackId="a" radius={[0, 4, 4, 0]} name="Low Intent" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Scoring Model Weights</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { factor: "Intent Signals (RevPath)", weight: 30, icon: Zap },
                { factor: "Persona Match Score", weight: 25, icon: UserCircle },
                { factor: "Company Fit (Firmographics)", weight: 20, icon: Building2 },
                { factor: "Engagement Level", weight: 15, icon: Eye },
                { factor: "Recency of Activity", weight: 10, icon: Clock },
              ].map((f) => (
                <div key={f.factor} className="flex items-center gap-3">
                  <f.icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm flex-1">{f.factor}</span>
                  <Progress value={f.weight} className="h-2 w-40" />
                  <span className="text-sm font-bold w-10 text-right">{f.weight}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI Insights ────────────────────────────── */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "High-Intent Surge Detected",
                description: "12 prospects from the FinTech sector showed a 340% increase in pricing page visits this week. Cross-referencing with RevPath data shows alignment with 'enterprise automation platform' keyword cluster.",
                action: "View in RevPath",
                icon: Zap,
                color: "text-[hsl(var(--cbs-amber))]",
                borderColor: "border-[hsl(var(--cbs-amber))]/20",
              },
              {
                title: "Persona Cluster Opportunity",
                description: "'Technical Decision Maker' personas at Series B+ companies have a 3.2x higher conversion rate. 34 new prospects match this profile — recommend creating a targeted outreach campaign.",
                action: "View Persona",
                icon: UserCircle,
                color: "text-primary",
                borderColor: "border-primary/20",
              },
              {
                title: "CRM Pipeline Gap",
                description: "87 enriched prospects haven't been pushed to the CRM pipeline yet. Of these, 23 have lead scores above 80 and active intent signals — they should be fast-tracked to the 'Qualified' stage.",
                action: "Push to CRM",
                icon: Users,
                color: "text-accent",
                borderColor: "border-accent/20",
              },
              {
                title: "Competitive Displacement Signal",
                description: "8 prospects from Globex Corp and NovaTech are actively researching competitor products. Knowledge Graph shows overlapping pain points that align with your product's differentiation areas.",
                action: "View Knowledge Graph",
                icon: Brain,
                color: "text-[hsl(var(--cbs-green))]",
                borderColor: "border-[hsl(var(--cbs-green))]/20",
              },
            ].map((insight, i) => (
              <Card key={i} className={`${insight.borderColor}`}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-muted/50 ${insight.color}`}>
                      <insight.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />{insight.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Cross-Module Intelligence Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg border border-border/50 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium"><GitBranch className="h-4 w-4 text-primary" />RevPath Integration</div>
                  <p className="text-xs text-muted-foreground">Revenue attribution signals feeding into lead scoring — 142 prospects enriched with keyword-level intent data.</p>
                </div>
                <div className="p-3 rounded-lg border border-border/50 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium"><Users className="h-4 w-4 text-accent" />CRM Sync</div>
                  <p className="text-xs text-muted-foreground">1,121 prospects synced to CRM pipeline — auto-stage assignment based on lead score and intent signals.</p>
                </div>
                <div className="p-3 rounded-lg border border-border/50 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium"><UserCircle className="h-4 w-4 text-[hsl(var(--cbs-green))]" />Persona Matching</div>
                  <p className="text-xs text-muted-foreground">94.7% of prospects matched to buyer personas — top-performing segment: Technical Decision Maker (18% conversion).</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
