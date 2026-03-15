import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  UserCircle, Plus, Trash2, Edit, Eye, Copy, Download, Search,
  Target, Brain, TrendingUp, DollarSign, Globe, Briefcase, Heart,
  AlertTriangle, CheckCircle2, ArrowRight, ChevronRight, Sparkles,
  BarChart3, Share2, GitBranch, BookOpen, Zap, Clock, Star,
  Smile, Frown, Meh, MapPin, GraduationCap, Building2, Users,
  ShoppingCart, MessageSquare, Mail, Phone, Monitor, Layers,
  ExternalLink, FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Types ──────────────────────────────────────────────────

interface Persona {
  id: string;
  name: string;
  avatar: string;
  tagline: string;
  status: "complete" | "draft" | "validating";
  demographics: {
    age: string;
    gender: string;
    location: string;
    education: string;
    income: string;
    jobTitle: string;
    company: string;
    industry: string;
  };
  psychographics: {
    personality: string[];
    values: string[];
    interests: string[];
    techSavviness: number;
    decisionStyle: string;
  };
  goals: { id: string; text: string; priority: "high" | "medium" | "low" }[];
  painPoints: { id: string; text: string; severity: "critical" | "major" | "minor" }[];
  journey: { stage: string; touchpoints: string[]; emotions: "positive" | "neutral" | "negative"; actions: string; thoughts: string }[];
  channels: { name: string; preference: number }[];
  // RevPath integration
  revpathKeywords: { keyword: string; volume: number; revenue: string; intent: string }[];
  revenueImpact: { segment: string; ltv: string; acquisitionCost: string; conversionRate: string };
  // Knowledge Graph integration
  knowledgeEntities: { id: string; label: string; type: string; relation: string }[];
  contentAffinity: { title: string; type: string; engagement: number }[];
}

// ── Mock Data ──────────────────────────────────────────────

const personas: Persona[] = [
  {
    id: "p1",
    name: "Sarah Chen",
    avatar: "SC",
    tagline: "VP of Marketing at a mid-size SaaS company seeking data-driven attribution",
    status: "complete",
    demographics: {
      age: "34-42", gender: "Female", location: "San Francisco, CA",
      education: "MBA, Marketing", income: "$140K-$180K",
      jobTitle: "VP of Marketing", company: "Mid-size SaaS (100-500 employees)",
      industry: "B2B Software",
    },
    psychographics: {
      personality: ["Analytical", "Strategic", "Data-driven", "Results-oriented"],
      values: ["ROI transparency", "Team empowerment", "Innovation", "Accountability"],
      interests: ["Marketing analytics", "Revenue attribution", "AI/ML tools", "Leadership"],
      techSavviness: 82,
      decisionStyle: "Data-informed consensus builder",
    },
    goals: [
      { id: "g1", text: "Prove marketing's direct impact on revenue to the board", priority: "high" },
      { id: "g2", text: "Reduce customer acquisition cost by 25%", priority: "high" },
      { id: "g3", text: "Build a predictable, repeatable content-to-revenue pipeline", priority: "medium" },
      { id: "g4", text: "Automate reporting to save 10+ hours/week", priority: "medium" },
    ],
    painPoints: [
      { id: "pp1", text: "Can't connect keyword performance to actual revenue — data lives in silos", severity: "critical" },
      { id: "pp2", text: "Spends 15+ hours/week manually building attribution reports", severity: "major" },
      { id: "pp3", text: "Board questions marketing ROI every quarter with no clear answer", severity: "critical" },
      { id: "pp4", text: "Existing tools (GA4, GSC) show traffic but not revenue impact", severity: "major" },
    ],
    journey: [
      { stage: "Awareness", touchpoints: ["Google search", "LinkedIn thought leadership", "Industry podcast"], emotions: "neutral", actions: "Searches for 'marketing attribution tools'", thoughts: "There must be a better way to prove ROI" },
      { stage: "Consideration", touchpoints: ["Product comparison blog", "G2 reviews", "Peer recommendation"], emotions: "positive", actions: "Compares 3-4 solutions, reads case studies", thoughts: "This looks promising but will it integrate with our stack?" },
      { stage: "Decision", touchpoints: ["Free trial", "Sales demo", "ROI calculator"], emotions: "positive", actions: "Runs pilot with Q1 data, presents to CFO", thoughts: "If I can show 200% ROI, budget is approved" },
      { stage: "Onboarding", touchpoints: ["Setup wizard", "Data connectors", "Support chat"], emotions: "neutral", actions: "Connects GSC, GA4, CRM data sources", thoughts: "This needs to be fast — I don't have weeks to set up" },
      { stage: "Advocacy", touchpoints: ["Case study", "Referral", "Conference talk"], emotions: "positive", actions: "Shares results with peer network", thoughts: "This transformed how we think about content strategy" },
    ],
    channels: [
      { name: "LinkedIn", preference: 92 },
      { name: "Email Newsletter", preference: 85 },
      { name: "Google Search", preference: 78 },
      { name: "Industry Podcasts", preference: 65 },
      { name: "Twitter/X", preference: 42 },
      { name: "Webinars", preference: 58 },
    ],
    revpathKeywords: [
      { keyword: "marketing attribution software", volume: 8100, revenue: "$18,400", intent: "commercial" },
      { keyword: "content ROI tracking", volume: 4800, revenue: "$12,200", intent: "informational" },
      { keyword: "revenue attribution model", volume: 3200, revenue: "$9,800", intent: "commercial" },
      { keyword: "prove marketing ROI", volume: 6400, revenue: "$15,600", intent: "informational" },
      { keyword: "keyword to revenue pipeline", volume: 1800, revenue: "$7,400", intent: "commercial" },
    ],
    revenueImpact: { segment: "Enterprise Marketing Leaders", ltv: "$24,600", acquisitionCost: "$3,200", conversionRate: "4.8%" },
    knowledgeEntities: [
      { id: "ke1", label: "Revenue Attribution Models", type: "article", relation: "primary interest" },
      { id: "ke2", label: "GA4 Integration Guide", type: "document", relation: "references" },
      { id: "ke3", label: "Content Strategy Framework", type: "article", relation: "influences decisions" },
      { id: "ke4", label: "Marketing Analytics Dataset", type: "dataset", relation: "data source" },
      { id: "ke5", label: "Dr. Sarah Chen", type: "author", relation: "thought leader" },
    ],
    contentAffinity: [
      { title: "Ultimate CRM Comparison Guide 2026", type: "Pillar", engagement: 92 },
      { title: "CRM Pricing: Complete Breakdown", type: "Landing", engagement: 88 },
      { title: "Marketing Attribution Playbook", type: "Guide", engagement: 96 },
      { title: "Revenue Forecasting with AI", type: "Blog", engagement: 74 },
    ],
  },
  {
    id: "p2",
    name: "Marcus Rodriguez",
    avatar: "MR",
    tagline: "Head of Growth at a Series B startup focused on scaling organic acquisition",
    status: "complete",
    demographics: {
      age: "28-35", gender: "Male", location: "Austin, TX",
      education: "BS Computer Science", income: "$120K-$150K",
      jobTitle: "Head of Growth", company: "Series B Startup (30-80 employees)",
      industry: "B2B Tech",
    },
    psychographics: {
      personality: ["Scrappy", "Experimental", "Fast-moving", "Metrics-obsessed"],
      values: ["Speed", "Efficiency", "Scalability", "Transparency"],
      interests: ["Growth hacking", "SEO automation", "Product-led growth", "Data pipelines"],
      techSavviness: 94,
      decisionStyle: "Fast experimenter — test → measure → scale",
    },
    goals: [
      { id: "g1", text: "Scale organic traffic 5x in 12 months without linear headcount growth", priority: "high" },
      { id: "g2", text: "Build automated content-to-revenue attribution pipeline", priority: "high" },
      { id: "g3", text: "Identify highest-ROI keyword clusters to prioritize", priority: "medium" },
    ],
    painPoints: [
      { id: "pp1", text: "Manual keyword research takes too long — needs automation at scale", severity: "critical" },
      { id: "pp2", text: "Can't prioritize content by revenue potential — guessing which topics to write", severity: "major" },
      { id: "pp3", text: "Limited budget — needs to prove ROI before requesting headcount", severity: "major" },
    ],
    journey: [
      { stage: "Awareness", touchpoints: ["Twitter/X threads", "Product Hunt", "Hacker News"], emotions: "neutral", actions: "Sees mention in growth community", thoughts: "Another attribution tool? Let me check if it's different" },
      { stage: "Consideration", touchpoints: ["API docs", "GitHub", "Free tier"], emotions: "positive", actions: "Tests API, builds quick integration", thoughts: "API-first approach is exactly what I need" },
      { stage: "Decision", touchpoints: ["Self-serve upgrade", "Usage dashboard"], emotions: "positive", actions: "Upgrades when hitting free tier limits", thoughts: "ROI is obvious — paying for itself in time saved" },
      { stage: "Onboarding", touchpoints: ["API setup", "Zapier integration", "Slack alerts"], emotions: "positive", actions: "Fully automated pipeline in 2 hours", thoughts: "This is what onboarding should feel like" },
      { stage: "Advocacy", touchpoints: ["Twitter thread", "Blog post", "Community forum"], emotions: "positive", actions: "Writes public case study of results", thoughts: "My network needs to know about this" },
    ],
    channels: [
      { name: "Twitter/X", preference: 95 },
      { name: "Product Hunt", preference: 82 },
      { name: "Google Search", preference: 75 },
      { name: "GitHub", preference: 70 },
      { name: "Slack Communities", preference: 68 },
      { name: "Email", preference: 45 },
    ],
    revpathKeywords: [
      { keyword: "seo automation tools", volume: 12000, revenue: "$22,100", intent: "commercial" },
      { keyword: "keyword clustering tool", volume: 6800, revenue: "$14,800", intent: "commercial" },
      { keyword: "content roi calculator", volume: 5200, revenue: "$11,200", intent: "informational" },
    ],
    revenueImpact: { segment: "Growth-Stage Startups", ltv: "$8,400", acquisitionCost: "$840", conversionRate: "7.2%" },
    knowledgeEntities: [
      { id: "ke1", label: "SEO Automation Framework", type: "article", relation: "primary interest" },
      { id: "ke2", label: "Growth Hacking Playbook", type: "document", relation: "references" },
      { id: "ke3", label: "Keyword Clustering Dataset", type: "dataset", relation: "data source" },
    ],
    contentAffinity: [
      { title: "API Documentation", type: "Docs", engagement: 98 },
      { title: "Growth Automation Playbook", type: "Guide", engagement: 90 },
      { title: "Keyword Clustering Deep Dive", type: "Blog", engagement: 85 },
    ],
  },
  {
    id: "p3",
    name: "Emily Nakamura",
    avatar: "EN",
    tagline: "Content Director evaluating content strategy tools for enterprise team",
    status: "draft",
    demographics: {
      age: "38-45", gender: "Female", location: "New York, NY",
      education: "MA Journalism", income: "$130K-$160K",
      jobTitle: "Content Director", company: "Enterprise (1000+ employees)",
      industry: "Financial Services",
    },
    psychographics: {
      personality: ["Creative", "Strategic", "Detail-oriented", "Collaborative"],
      values: ["Quality content", "Brand consistency", "Team growth", "Measurable impact"],
      interests: ["Content strategy", "Brand storytelling", "Content ops", "AI writing tools"],
      techSavviness: 62,
      decisionStyle: "Collaborative — involves team leads in evaluation",
    },
    goals: [
      { id: "g1", text: "Connect content performance to business outcomes beyond traffic", priority: "high" },
      { id: "g2", text: "Build a content scoring system that predicts revenue impact", priority: "medium" },
    ],
    painPoints: [
      { id: "pp1", text: "Content team measured on traffic, not revenue — misaligned incentives", severity: "critical" },
      { id: "pp2", text: "No visibility into which content types drive actual conversions", severity: "major" },
    ],
    journey: [
      { stage: "Awareness", touchpoints: ["Content Marketing World", "Newsletter", "Peer recommendation"], emotions: "neutral", actions: "Hears about attribution gap from peers", thoughts: "We're probably leaving money on the table" },
      { stage: "Consideration", touchpoints: ["Case studies", "Demo", "Team evaluation"], emotions: "neutral", actions: "Involves 3 team leads in evaluation", thoughts: "Needs to work for non-technical team members" },
      { stage: "Decision", touchpoints: ["Enterprise demo", "Security review", "Contract negotiation"], emotions: "positive", actions: "Presents business case with projected ROI", thoughts: "If we can show content → revenue, budget doubles" },
      { stage: "Onboarding", touchpoints: ["White-glove setup", "Team training", "Custom dashboards"], emotions: "neutral", actions: "Gradual rollout across content team", thoughts: "Adoption is key — it needs to be intuitive" },
      { stage: "Advocacy", touchpoints: ["Internal champion", "Conference speaker"], emotions: "positive", actions: "Becomes internal champion for data-driven content", thoughts: "This changed how leadership sees our team" },
    ],
    channels: [
      { name: "Email Newsletter", preference: 90 },
      { name: "LinkedIn", preference: 78 },
      { name: "Conferences", preference: 72 },
      { name: "Google Search", preference: 65 },
      { name: "Webinars", preference: 60 },
      { name: "Slack Communities", preference: 35 },
    ],
    revpathKeywords: [
      { keyword: "content performance measurement", volume: 4200, revenue: "$8,600", intent: "informational" },
      { keyword: "content attribution enterprise", volume: 2800, revenue: "$12,400", intent: "commercial" },
    ],
    revenueImpact: { segment: "Enterprise Content Teams", ltv: "$48,200", acquisitionCost: "$8,400", conversionRate: "2.1%" },
    knowledgeEntities: [
      { id: "ke1", label: "Content Strategy at Scale", type: "article", relation: "primary interest" },
      { id: "ke2", label: "Enterprise Content Ops", type: "document", relation: "references" },
    ],
    contentAffinity: [
      { title: "Enterprise Content Playbook", type: "Whitepaper", engagement: 94 },
      { title: "Content ROI Framework", type: "Guide", engagement: 88 },
    ],
  },
];

const statusMeta: Record<string, { label: string; cls: string }> = {
  complete: { label: "Complete", cls: "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))] border-[hsl(var(--cbs-green))]/20" },
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground border-border" },
  validating: { label: "Validating", cls: "bg-[hsl(var(--cbs-amber))]/15 text-[hsl(var(--cbs-amber))] border-[hsl(var(--cbs-amber))]/20" },
};

const severityColors: Record<string, string> = {
  critical: "text-destructive bg-destructive/10 border-destructive/20",
  major: "text-[hsl(var(--cbs-amber))] bg-[hsl(var(--cbs-amber))]/10 border-[hsl(var(--cbs-amber))]/20",
  minor: "text-muted-foreground bg-muted border-border",
};

const priorityColors: Record<string, string> = {
  high: "text-destructive",
  medium: "text-[hsl(var(--cbs-amber))]",
  low: "text-muted-foreground",
};

const emotionIcons: Record<string, typeof Smile> = { positive: Smile, neutral: Meh, negative: Frown };
const emotionColors: Record<string, string> = {
  positive: "text-[hsl(var(--cbs-green))]",
  neutral: "text-[hsl(var(--cbs-amber))]",
  negative: "text-destructive",
};

const knowledgeTypeIcons: Record<string, typeof BookOpen> = {
  article: BookOpen,
  document: FileText,
  dataset: BarChart3,
  author: UserCircle,
};

// ── Persona List ───────────────────────────────────────────

function PersonaListView({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Personas", value: personas.length.toString(), icon: Users, sub: "Active profiles" },
          { label: "Avg LTV", value: "$27,067", icon: DollarSign, sub: "Across segments" },
          { label: "Linked Keywords", value: "10", icon: Search, sub: "From RevPath" },
          { label: "Knowledge Entities", value: "10", icon: Share2, sub: "Graph connections" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                <kpi.icon className="h-3.5 w-3.5 text-primary/50" />
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
              <span className="text-[10px] text-muted-foreground">{kpi.sub}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Persona Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {personas.map((p) => {
          const st = statusMeta[p.status];
          return (
            <Card
              key={p.id}
              className="border border-border/60 hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => onSelect(p.id)}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{p.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold group-hover:text-primary transition-colors">{p.name}</p>
                      <Badge variant="outline" className={`text-[8px] ${st.cls}`}>{st.label}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.demographics.jobTitle}</p>
                    <p className="text-[10px] text-muted-foreground">{p.demographics.company}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed italic">"{p.tagline}"</p>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs font-bold">{p.goals.length}</p>
                    <p className="text-[9px] text-muted-foreground">Goals</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs font-bold">{p.painPoints.length}</p>
                    <p className="text-[9px] text-muted-foreground">Pain Points</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-xs font-bold">{p.revpathKeywords.length}</p>
                    <p className="text-[9px] text-muted-foreground">Keywords</p>
                  </div>
                </div>

                {/* Revenue Impact */}
                <div className="flex items-center justify-between pt-3 border-t border-border/40 text-[10px]">
                  <span className="text-muted-foreground">LTV: <strong className="text-foreground">{p.revenueImpact.ltv}</strong></span>
                  <span className="text-muted-foreground">CAC: <strong className="text-foreground">{p.revenueImpact.acquisitionCost}</strong></span>
                  <span className="text-[hsl(var(--cbs-green))] font-medium">{p.revenueImpact.conversionRate} conv.</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[8px] gap-1"><GitBranch className="h-2.5 w-2.5" /> RevPath</Badge>
                  <Badge variant="outline" className="text-[8px] gap-1"><Share2 className="h-2.5 w-2.5" /> Knowledge Graph</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* New Persona Card */}
        <Card className="border border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer group flex items-center justify-center min-h-[320px]">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Plus className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Create New Persona</p>
              <p className="text-[10px] text-muted-foreground mt-1">Build data-driven buyer personas with AI assistance</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Persona Detail ─────────────────────────────────────────

function PersonaDetailView({ persona, onBack }: { persona: Persona; onBack: () => void }) {
  const [tab, setTab] = useState("profile");
  const navigate = useNavigate();
  const st = statusMeta[persona.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onBack}>← Back</Button>
          <Separator orientation="vertical" className="h-6" />
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{persona.avatar}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{persona.name}</h2>
              <Badge variant="outline" className={`text-[9px] ${st.cls}`}>{st.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{persona.demographics.jobTitle} · {persona.demographics.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Edit className="h-3 w-3" /> Edit</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Copy className="h-3 w-3" /> Duplicate</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Download className="h-3 w-3" /> Export</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="profile" className="text-xs gap-1.5"><UserCircle className="h-3.5 w-3.5" /> Profile</TabsTrigger>
          <TabsTrigger value="journey" className="text-xs gap-1.5"><MapPin className="h-3.5 w-3.5" /> Journey Map</TabsTrigger>
          <TabsTrigger value="revpath" className="text-xs gap-1.5"><GitBranch className="h-3.5 w-3.5" /> RevPath Data</TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs gap-1.5"><Share2 className="h-3.5 w-3.5" /> Knowledge Graph</TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Demographics */}
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Demographics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {Object.entries(persona.demographics).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                    <span className="text-[11px] font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Psychographics */}
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Psychographics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Personality Traits</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {persona.psychographics.personality.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[9px]">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Values</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {persona.psychographics.values.map((v) => (
                      <Badge key={v} variant="outline" className="text-[9px]">{v}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Interests</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {persona.psychographics.interests.map((i) => (
                      <Badge key={i} variant="outline" className="text-[9px] border-primary/20 text-primary">{i}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">Tech Savviness</span>
                    <span className="font-medium">{persona.psychographics.techSavviness}%</span>
                  </div>
                  <Progress value={persona.psychographics.techSavviness} className="h-1.5" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Decision Style</Label>
                  <p className="text-xs font-medium mt-0.5">{persona.psychographics.decisionStyle}</p>
                </div>
              </CardContent>
            </Card>

            {/* Goals & Pain Points */}
            <div className="space-y-4">
              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-[hsl(var(--cbs-green))]" /> Goals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {persona.goals.map((g) => (
                    <div key={g.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                      <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${priorityColors[g.priority]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] leading-relaxed">{g.text}</p>
                        <Badge variant="outline" className={`text-[8px] mt-1 ${priorityColors[g.priority]}`}>{g.priority}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Pain Points</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {persona.painPoints.map((pp) => (
                    <div key={pp.id} className={`flex items-start gap-2 p-2 rounded-lg border ${severityColors[pp.severity]}`}>
                      <Frown className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] leading-relaxed">{pp.text}</p>
                        <Badge variant="outline" className="text-[8px] mt-1">{pp.severity}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Channel Preferences */}
              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4 text-accent" /> Channel Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {persona.channels.map((ch) => (
                    <div key={ch.name} className="flex items-center gap-3">
                      <span className="text-[11px] w-28 truncate">{ch.name}</span>
                      <Progress value={ch.preference} className="h-1.5 flex-1" />
                      <span className="text-[10px] font-medium w-8 text-right">{ch.preference}%</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Journey Map Tab ── */}
        <TabsContent value="journey" className="mt-6">
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Customer Journey Map</CardTitle>
                <p className="text-[10px] text-muted-foreground italic">"{persona.tagline}"</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Stage Headers */}
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${persona.journey.length}, 1fr)` }}>
                    {persona.journey.map((stage, i) => (
                      <div key={i} className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{i + 1}</div>
                          {i < persona.journey.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-border mx-1" />}
                        </div>
                        <p className="text-xs font-bold mb-3">{stage.stage}</p>
                      </div>
                    ))}
                  </div>

                  {/* Emotion Row */}
                  <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `repeat(${persona.journey.length}, 1fr)` }}>
                    {persona.journey.map((stage, i) => {
                      const EmotionIcon = emotionIcons[stage.emotions];
                      return (
                        <div key={i} className="flex justify-center">
                          <EmotionIcon className={`h-5 w-5 ${emotionColors[stage.emotions]}`} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Touchpoints */}
                  <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `repeat(${persona.journey.length}, 1fr)` }}>
                    {persona.journey.map((stage, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-muted/50 border border-border/40">
                        <p className="text-[9px] font-semibold text-muted-foreground mb-1.5">TOUCHPOINTS</p>
                        <div className="space-y-1">
                          {stage.touchpoints.map((tp) => (
                            <Badge key={tp} variant="outline" className="text-[8px] mr-1">{tp}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `repeat(${persona.journey.length}, 1fr)` }}>
                    {persona.journey.map((stage, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-[9px] font-semibold text-primary mb-1">ACTIONS</p>
                        <p className="text-[10px] leading-relaxed">{stage.actions}</p>
                      </div>
                    ))}
                  </div>

                  {/* Thoughts */}
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${persona.journey.length}, 1fr)` }}>
                    {persona.journey.map((stage, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-accent/5 border border-accent/10">
                        <p className="text-[9px] font-semibold text-accent mb-1">THOUGHTS</p>
                        <p className="text-[10px] leading-relaxed italic">"{stage.thoughts}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── RevPath Data Tab ── */}
        <TabsContent value="revpath" className="mt-6">
          <div className="space-y-6">
            {/* Revenue Impact Card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Segment", value: persona.revenueImpact.segment, icon: Users },
                { label: "Lifetime Value", value: persona.revenueImpact.ltv, icon: DollarSign },
                { label: "Acquisition Cost", value: persona.revenueImpact.acquisitionCost, icon: TrendingUp },
                { label: "Conversion Rate", value: persona.revenueImpact.conversionRate, icon: Target },
              ].map((m) => (
                <Card key={m.label} className="border border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-muted-foreground">{m.label}</span>
                      <m.icon className="h-3.5 w-3.5 text-primary/50" />
                    </div>
                    <p className="text-lg font-bold">{m.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Linked Keywords */}
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" /> Persona-Linked Keywords
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => navigate("/revpath")}>
                    <ExternalLink className="h-3 w-3" /> Open RevPath
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {["Keyword", "Volume", "Revenue", "Intent", "Relevance"].map((h) => (
                        <th key={h} className="text-left p-2 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {persona.revpathKeywords.map((kw) => (
                      <tr key={kw.keyword} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="p-2 font-medium">{kw.keyword}</td>
                        <td className="p-2 text-muted-foreground">{kw.volume.toLocaleString()}</td>
                        <td className="p-2 font-semibold text-[hsl(var(--cbs-green))]">{kw.revenue}</td>
                        <td className="p-2"><Badge variant={kw.intent === "commercial" ? "default" : "secondary"} className="text-[8px]">{kw.intent}</Badge></td>
                        <td className="p-2"><Progress value={75 + Math.random() * 20} className="h-1.5 w-16" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Content Affinity */}
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" /> Content Affinity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {persona.contentAffinity.map((c) => (
                  <div key={c.title} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:border-primary/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{c.title}</p>
                      <Badge variant="outline" className="text-[8px] mt-0.5">{c.type}</Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Progress value={c.engagement} className="h-1.5 w-20" />
                      <span className="text-[10px] font-medium w-8 text-right">{c.engagement}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Knowledge Graph Tab ── */}
        <TabsContent value="knowledge" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Linked Entities */}
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-primary" /> Linked Knowledge Entities
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => navigate("/knowledge")}>
                    <ExternalLink className="h-3 w-3" /> Open Graph
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {persona.knowledgeEntities.map((entity) => {
                  const Icon = knowledgeTypeIcons[entity.type] || BookOpen;
                  return (
                    <div key={entity.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-primary/20 transition-colors cursor-pointer">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{entity.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[8px]">{entity.type}</Badge>
                          <span className="text-[9px] text-muted-foreground">{entity.relation}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1 border-dashed mt-2">
                  <Plus className="h-3 w-3" /> Link Entity from Knowledge Graph
                </Button>
              </CardContent>
            </Card>

            {/* Persona Intelligence Map */}
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> AI Persona Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: "insight", title: "High-value content gap detected", desc: `${persona.name} searches for "revenue attribution model" but no pillar content exists. Estimated $9.8K/mo revenue opportunity.`, priority: "high" },
                  { type: "recommendation", title: "Knowledge Graph connection opportunity", desc: `3 entities in Knowledge Graph match ${persona.name}'s interests but aren't linked. Linking could improve content targeting by 18%.`, priority: "medium" },
                  { type: "prediction", title: "Conversion likelihood forecast", desc: `Based on behavioral patterns and keyword data, this persona segment has a ${persona.revenueImpact.conversionRate} conversion rate with potential to reach ${(parseFloat(persona.revenueImpact.conversionRate) * 1.4).toFixed(1)}% with targeted content.`, priority: "high" },
                ].map((insight, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${insight.priority === "high" ? "border-primary/30 bg-primary/5" : "border-border/40 bg-muted/30"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <p className="text-[11px] font-semibold">{insight.title}</p>
                      <Badge variant={insight.priority === "high" ? "default" : "secondary"} className="text-[8px]">{insight.priority}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{insight.desc}</p>
                  </div>
                ))}

                <Separator />

                {/* Cross-module navigation */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground">CONNECTED MODULES</p>
                  {[
                    { label: "RevPath Intelligence", desc: `${persona.revpathKeywords.length} linked keywords`, path: "/revpath", icon: GitBranch },
                    { label: "Knowledge Graph", desc: `${persona.knowledgeEntities.length} linked entities`, path: "/knowledge", icon: Share2 },
                    { label: "Content Performance", desc: `${persona.contentAffinity.length} affinity scores`, path: "/revpath", icon: FileText },
                    { label: "CRM", desc: `${persona.revenueImpact.segment} segment`, path: "/crm", icon: Users },
                  ].map((mod) => (
                    <div
                      key={mod.label}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(mod.path)}
                    >
                      <mod.icon className="h-3.5 w-3.5 text-primary" />
                      <div className="flex-1">
                        <p className="text-[11px] font-medium">{mod.label}</p>
                        <p className="text-[9px] text-muted-foreground">{mod.desc}</p>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

const PersonaBuilder = () => {
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const persona = personas.find((p) => p.id === selectedPersona);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {!persona ? (
        <>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold tracking-tight">Persona Builder</h1>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Data-Driven</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Create buyer personas enriched with RevPath revenue data and Knowledge Graph intelligence</p>
            </div>
            <Button size="sm" className="h-8 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> New Persona
            </Button>
          </div>
          <PersonaListView onSelect={setSelectedPersona} />
        </>
      ) : (
        <PersonaDetailView persona={persona} onBack={() => setSelectedPersona(null)} />
      )}
    </div>
  );
};

export default PersonaBuilder;
