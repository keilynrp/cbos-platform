import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  Sparkles, Target, TrendingUp, Zap, FileText, BarChart3, Brain,
  Download, RefreshCw, ChevronRight, CheckCircle2, Clock, Globe,
  Layers, GitBranch, Eye, Users, DollarSign, BookOpen, ListChecks,
  GraduationCap, HelpCircle, FileBarChart, ScrollText, Layout, Send,
  ArrowRight, ArrowDown, Play, Pause, Mail, Bell, UserCircle, Building2,
  Lightbulb, Search, Wand2, MousePointer, Star, ExternalLink, Plus,
  Workflow, Monitor, Smartphone, ChevronDown, Check, Copy, Pen, Magnet,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────
type MainView = "dashboard" | "builder" | "detail";
type BuilderStep = 1 | 2 | 3 | 4 | 5 | 6;

interface LeadMagnet {
  id: string;
  name: string;
  type: string;
  typeIcon: any;
  persona: string;
  revpathStage: string;
  status: "live" | "draft" | "optimizing";
  conversions: number;
  conversionRate: number;
  views: number;
  leads: number;
  cpl: string;
  revenue: string;
  lastUpdated: string;
}

// ── Mock Data ──────────────────────────────────────────
const leadMagnets: LeadMagnet[] = [
  { id: "lm1", name: "SaaS Revenue Operations Guide", type: "ebook", typeIcon: BookOpen, persona: "Founder", revpathStage: "TOFU", status: "live", conversions: 842, conversionRate: 34.2, views: 2462, leads: 842, cpl: "$2.40", revenue: "$84,200", lastUpdated: "2h ago" },
  { id: "lm2", name: "Growth Marketing Checklist 2026", type: "checklist", typeIcon: ListChecks, persona: "Growth Marketer", revpathStage: "TOFU", status: "live", conversions: 1204, conversionRate: 41.8, views: 2880, leads: 1204, cpl: "$1.80", revenue: "$62,400", lastUpdated: "5h ago" },
  { id: "lm3", name: "Data Analytics ROI Calculator", type: "interactive quiz", typeIcon: HelpCircle, persona: "Data Analyst", revpathStage: "MOFU", status: "live", conversions: 567, conversionRate: 28.4, views: 1996, leads: 567, cpl: "$3.20", revenue: "$45,600", lastUpdated: "1d ago" },
  { id: "lm4", name: "Product-Led Growth Masterclass", type: "mini course", typeIcon: GraduationCap, persona: "Product Manager", revpathStage: "MOFU", status: "optimizing", conversions: 312, conversionRate: 22.1, views: 1412, leads: 312, cpl: "$4.50", revenue: "$31,200", lastUpdated: "3h ago" },
  { id: "lm5", name: "CMO's Guide to Attribution", type: "whitepaper", typeIcon: ScrollText, persona: "CMO", revpathStage: "BOFU", status: "draft", conversions: 0, conversionRate: 0, views: 0, leads: 0, cpl: "—", revenue: "—", lastUpdated: "Just now" },
  { id: "lm6", name: "B2B SaaS Benchmark Report 2026", type: "research report", typeIcon: FileBarChart, persona: "Founder", revpathStage: "TOFU", status: "live", conversions: 1891, conversionRate: 38.7, views: 4886, leads: 1891, cpl: "$1.20", revenue: "$156,800", lastUpdated: "12h ago" },
];

const personas = [
  { id: "p1", name: "Founder", goals: ["Scale revenue", "Optimize operations", "Fundraise"], pains: ["Limited time", "Hiring challenges", "Cash flow"], industry: "SaaS / Tech", triggers: ["Board meetings", "Funding rounds"], formats: ["Guides", "Reports", "Case Studies"], color: "bg-primary/10 text-primary" },
  { id: "p2", name: "CMO", goals: ["Increase pipeline", "Prove marketing ROI", "Brand building"], pains: ["Attribution gaps", "Budget pressure", "Channel fatigue"], industry: "Enterprise Software", triggers: ["Quarterly reviews", "Campaign launches"], formats: ["Whitepapers", "Webinars", "Templates"], color: "bg-accent/10 text-accent" },
  { id: "p3", name: "Growth Marketer", goals: ["Optimize funnels", "Increase conversions", "Scale acquisition"], pains: ["Data silos", "Tool overload", "Content velocity"], industry: "SaaS / MarTech", triggers: ["Performance reviews", "New tool evaluation"], formats: ["Checklists", "Templates", "Quizzes"], color: "bg-[hsl(var(--cbs-green))]/10 text-[hsl(var(--cbs-green))]" },
  { id: "p4", name: "Data Analyst", goals: ["Better dashboards", "Automate reporting", "Data quality"], pains: ["Manual processes", "Tool fragmentation", "Stakeholder alignment"], industry: "Analytics / BI", triggers: ["Quarterly analysis", "Tool renewal"], formats: ["Calculators", "Reports", "Mini Courses"], color: "bg-[hsl(var(--cbs-amber))]/10 text-[hsl(var(--cbs-amber))]" },
  { id: "p5", name: "Product Manager", goals: ["Drive adoption", "Feature prioritization", "User research"], pains: ["Competing priorities", "Limited resources", "Stakeholder buy-in"], industry: "Product / SaaS", triggers: ["Sprint planning", "Launch cycles"], formats: ["Guides", "Courses", "Templates"], color: "bg-primary/10 text-primary" },
];

const conversionTrend = [
  { month: "Sep", rate: 24.2, leads: 1200 }, { month: "Oct", rate: 27.8, leads: 1580 },
  { month: "Nov", rate: 30.1, leads: 1840 }, { month: "Dec", rate: 28.4, leads: 1720 },
  { month: "Jan", rate: 32.6, leads: 2100 }, { month: "Feb", rate: 35.8, leads: 2460 },
  { month: "Mar", rate: 38.2, leads: 2890 },
];

const trafficSources = [
  { name: "Organic Search", value: 38, color: "hsl(var(--primary))" },
  { name: "Social Media", value: 24, color: "hsl(var(--accent))" },
  { name: "Email", value: 18, color: "hsl(var(--cbs-green))" },
  { name: "Paid Ads", value: 12, color: "hsl(var(--cbs-amber))" },
  { name: "Referral", value: 8, color: "hsl(var(--muted-foreground))" },
];

const revenueByStage = [
  { stage: "TOFU", magnets: 3, leads: 3937, revenue: 303400 },
  { stage: "MOFU", magnets: 2, leads: 879, revenue: 76800 },
  { stage: "BOFU", magnets: 1, leads: 0, revenue: 0 },
];

const personaEngagement = [
  { persona: "Founder", engagement: 87, magnets: 2 },
  { persona: "Growth Marketer", engagement: 92, magnets: 1 },
  { persona: "Data Analyst", engagement: 74, magnets: 1 },
  { persona: "Product Manager", engagement: 68, magnets: 1 },
  { persona: "CMO", engagement: 45, magnets: 1 },
];

const funnelData = [
  { stage: "Visitors", value: 14636, pct: 100 },
  { stage: "Views", value: 9848, pct: 67 },
  { stage: "Form Starts", value: 6204, pct: 42 },
  { stage: "Conversions", value: 4816, pct: 33 },
  { stage: "MQLs", value: 2890, pct: 20 },
  { stage: "SQLs", value: 1240, pct: 8 },
];

const kpis = [
  { label: "Total Leads Captured", value: "4,816", change: "+24.3%", icon: Users, color: "text-primary" },
  { label: "Avg Conversion Rate", value: "34.2%", change: "+6.8%", icon: Target, color: "text-[hsl(var(--cbs-green))]" },
  { label: "Revenue Attributed", value: "$380.2K", change: "+18.7%", icon: DollarSign, color: "text-accent" },
  { label: "Cost Per Lead", value: "$2.40", change: "-12%", icon: TrendingUp, color: "text-[hsl(var(--cbs-amber))]" },
];

const aiSuggestions = [
  { title: "Create a guide for SaaS founders about revenue operations", persona: "Founder", confidence: 94, type: "ebook", reasoning: "High search volume for 'revenue operations guide' + Founder persona has 87% engagement rate" },
  { title: "Generate a checklist for growth marketers on funnel optimization", persona: "Growth Marketer", confidence: 91, type: "checklist", reasoning: "Growth Marketer persona prefers checklists + 'funnel optimization' is trending keyword in RevPath" },
  { title: "Build an ROI calculator for marketing attribution", persona: "CMO", confidence: 88, type: "interactive quiz", reasoning: "CMO pain point: attribution gaps. Interactive tools have 28% higher conversion rate" },
  { title: "Develop a mini course on product-led growth metrics", persona: "Product Manager", confidence: 85, type: "mini course", reasoning: "Product Manager persona shows high engagement with educational content formats" },
];

const automationWorkflows = [
  { id: "w1", name: "Lead Capture → CRM", trigger: "Form submission", actions: ["Create CRM contact", "Assign lead score", "Tag persona"], status: "active", runs: 4816 },
  { id: "w2", name: "High Score → Sales Alert", trigger: "Lead score > 80", actions: ["Notify sales team", "Create opportunity", "Schedule follow-up"], status: "active", runs: 1240 },
  { id: "w3", name: "Persona Match → Nurture", trigger: "Persona tag assigned", actions: ["Start email sequence", "Add to campaign", "Update CRM stage"], status: "active", runs: 2890 },
  { id: "w4", name: "Download → Engagement Track", trigger: "Lead magnet download", actions: ["Track engagement", "Score behavior", "Recommend next content"], status: "paused", runs: 3420 },
];

const magnetTypes = [
  { type: "ebook", label: "eBook", icon: BookOpen, desc: "In-depth guides and educational content" },
  { type: "checklist", label: "Checklist", icon: ListChecks, desc: "Actionable step-by-step lists" },
  { type: "template", label: "Template", icon: Layout, desc: "Ready-to-use frameworks and templates" },
  { type: "mini-course", label: "Mini Course", icon: GraduationCap, desc: "Multi-part educational series" },
  { type: "quiz", label: "Interactive Quiz", icon: HelpCircle, desc: "Engaging assessments and calculators" },
  { type: "report", label: "Research Report", icon: FileBarChart, desc: "Data-driven industry insights" },
  { type: "whitepaper", label: "Whitepaper", icon: ScrollText, desc: "Deep technical or strategic analysis" },
  { type: "guide", label: "Guide", icon: FileText, desc: "Practical how-to content" },
];

const statusConfig = {
  live: { label: "Live", color: "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))]" },
  draft: { label: "Draft", color: "bg-muted-foreground/20 text-muted-foreground" },
  optimizing: { label: "AI Optimizing", color: "bg-primary/15 text-primary" },
};

// ── Component ──────────────────────────────────────────
export default function LeadMagnetBuilder() {
  const [mainView, setMainView] = useState<MainView>("dashboard");
  const [selectedMagnet, setSelectedMagnet] = useState<LeadMagnet | null>(null);
  const [builderStep, setBuilderStep] = useState<BuilderStep>(1);
  const [selectedPersona, setSelectedPersona] = useState<string>("");
  const [selectedRevpath, setSelectedRevpath] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");

  const openDetail = (m: LeadMagnet) => { setSelectedMagnet(m); setMainView("detail"); };
  const openBuilder = () => { setBuilderStep(1); setSelectedPersona(""); setSelectedRevpath(""); setSelectedType(""); setMainView("builder"); };
  const goBack = () => { setMainView("dashboard"); setSelectedMagnet(null); };

  // ── Builder View ─────────────────────────────────────
  if (mainView === "builder") {
    const steps = [
      { num: 1, label: "Select Persona" },
      { num: 2, label: "Revenue Path" },
      { num: 3, label: "Magnet Type" },
      { num: 4, label: "AI Outline" },
      { num: 5, label: "AI Content" },
      { num: 6, label: "Publish" },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={goBack} className="hover:text-foreground transition-colors">Lead Magnets</button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Create New</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lead Magnet Builder</h1>
            <p className="text-sm text-muted-foreground">AI-powered creation with persona and revenue path targeting</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <button
                onClick={() => s.num <= builderStep && setBuilderStep(s.num as BuilderStep)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  s.num === builderStep ? "bg-primary text-primary-foreground" :
                  s.num < builderStep ? "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))]" :
                  "bg-muted text-muted-foreground"
                }`}
              >
                {s.num < builderStep ? <Check className="h-3 w-3" /> : <span>{s.num}</span>}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1: Persona Selection */}
        {builderStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Select Target Persona</h2>
            <p className="text-sm text-muted-foreground">Choose a buyer persona from your Persona Builder. The lead magnet will adapt to their goals, pain points, and preferred content formats.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personas.map((p) => (
                <Card
                  key={p.id}
                  className={`cursor-pointer transition-all ${selectedPersona === p.id ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"}`}
                  onClick={() => setSelectedPersona(p.id)}
                >
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${p.color}`}>
                        <UserCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{p.name}</h3>
                        <p className="text-xs text-muted-foreground">{p.industry}</p>
                      </div>
                      {selectedPersona === p.id && <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Goals</p>
                        <div className="flex flex-wrap gap-1 mt-1">{p.goals.map((g) => <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>)}</div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Pain Points</p>
                        <div className="flex flex-wrap gap-1 mt-1">{p.pains.map((pp) => <Badge key={pp} variant="outline" className="text-[10px]">{pp}</Badge>)}</div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Preferred Formats</p>
                        <div className="flex flex-wrap gap-1 mt-1">{p.formats.map((f) => <Badge key={f} className="text-[10px] bg-primary/10 text-primary border-0">{f}</Badge>)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goBack}>Cancel</Button>
              <Button disabled={!selectedPersona} onClick={() => setBuilderStep(2)} className="gap-1.5">Next <ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}

        {/* Step 2: Revenue Path */}
        {builderStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Select Revenue Path Stage</h2>
            <p className="text-sm text-muted-foreground">Map your lead magnet to the revenue funnel. This determines the content depth and conversion strategy.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "TOFU", label: "Top of Funnel", desc: "Awareness & discovery content", types: "eBooks, Reports, Checklists", icon: Globe, flow: "Traffic → Lead Magnet → Lead", color: "bg-primary/10 text-primary border-primary/20" },
                { id: "MOFU", label: "Middle of Funnel", desc: "Evaluation & consideration content", types: "Case Studies, Courses, Quizzes", icon: Target, flow: "Lead → Opportunity", color: "bg-accent/10 text-accent border-accent/20" },
                { id: "BOFU", label: "Bottom of Funnel", desc: "Decision & conversion content", types: "Demos, Whitepapers, ROI Tools", icon: DollarSign, flow: "Opportunity → Customer", color: "bg-[hsl(var(--cbs-green))]/10 text-[hsl(var(--cbs-green))] border-[hsl(var(--cbs-green))]/20" },
              ].map((stage) => (
                <Card
                  key={stage.id}
                  className={`cursor-pointer transition-all ${selectedRevpath === stage.id ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"}`}
                  onClick={() => setSelectedRevpath(stage.id)}
                >
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stage.color}`}>
                        <stage.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{stage.label}</h3>
                        <p className="text-xs text-muted-foreground">{stage.id}</p>
                      </div>
                      {selectedRevpath === stage.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{stage.desc}</p>
                    <div className="text-xs space-y-1">
                      <p className="font-medium">Best for: <span className="text-muted-foreground font-normal">{stage.types}</span></p>
                      <p className="font-medium">Flow: <span className="text-muted-foreground font-normal">{stage.flow}</span></p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* RevPath Map */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Revenue Path Map</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2 overflow-x-auto py-4">
                  {["Traffic", "Lead Magnet", "Lead", "Opportunity", "Customer"].map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                        i === 1 ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/50 border-border"
                      }`}>{s}</div>
                      {i < 4 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setBuilderStep(1)}>Back</Button>
              <Button disabled={!selectedRevpath} onClick={() => setBuilderStep(3)} className="gap-1.5">Next <ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}

        {/* Step 3: Magnet Type */}
        {builderStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Select Lead Magnet Type</h2>
            <p className="text-sm text-muted-foreground">Choose the format. AI will recommend the best type based on your persona and revenue path.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {magnetTypes.map((t) => (
                <Card
                  key={t.type}
                  className={`cursor-pointer transition-all ${selectedType === t.type ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"}`}
                  onClick={() => setSelectedType(t.type)}
                >
                  <CardContent className="pt-4 flex flex-col items-center text-center gap-2">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${selectedType === t.type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} transition-colors`}>
                      <t.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-sm">{t.label}</h3>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setBuilderStep(2)}>Back</Button>
              <Button disabled={!selectedType} onClick={() => setBuilderStep(4)} className="gap-1.5">Generate Outline <Sparkles className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}

        {/* Step 4: AI Outline */}
        {builderStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">AI-Generated Outline</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Generated Outline</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { num: 1, title: "Introduction: The Revenue Operations Landscape", desc: "Why RevOps matters in 2026 and key trends shaping the industry" },
                      { num: 2, title: "The Data-Driven Framework", desc: "A step-by-step approach to building your RevOps foundation" },
                      { num: 3, title: "Aligning Sales, Marketing & CS", desc: "Breaking down silos and creating unified revenue workflows" },
                      { num: 4, title: "Tech Stack Optimization", desc: "Choosing and integrating the right tools for your stage" },
                      { num: 5, title: "Metrics That Matter", desc: "The KPIs that actually predict revenue growth" },
                      { num: 6, title: "Implementation Playbook", desc: "90-day plan to transform your revenue operations" },
                    ].map((section) => (
                      <div key={section.num} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{section.num}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{section.title}</p>
                          <p className="text-xs text-muted-foreground">{section.desc}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">AI Recommendations</span></div>
                    <div className="text-xs space-y-2 text-muted-foreground">
                      <p>• Add a ROI calculator section — Founders respond 2.4x better to quantified outcomes</p>
                      <p>• Include real company examples — increases trust signals by 45%</p>
                      <p>• Target 3,500-4,000 words — optimal length for this persona/type combo</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">SEO Recommendations</p>
                    <div className="space-y-1">
                      {["revenue operations guide", "SaaS RevOps framework", "revenue operations metrics"].map((kw) => (
                        <div key={kw} className="flex items-center gap-2 text-xs">
                          <Search className="h-3 w-3 text-primary" />
                          <span>{kw}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setBuilderStep(3)}>Back</Button>
              <Button onClick={() => setBuilderStep(5)} className="gap-1.5">Generate Content <Wand2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}

        {/* Step 5: AI Content */}
        {builderStep === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">AI-Generated Content</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2"><Pen className="h-4 w-4 text-primary" />Content Editor</CardTitle>
                      <Badge className="bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))]">AI Generated</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                      <h3 className="text-lg font-bold">SaaS Revenue Operations Guide: The 2026 Framework</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">Revenue Operations has evolved from a buzzword to a critical business function. In this comprehensive guide, we'll walk you through the exact framework used by high-growth SaaS companies to align their revenue teams and accelerate growth...</p>
                      <div className="border-t border-border/50 pt-3">
                        <h4 className="font-semibold text-sm">Chapter 1: The Revenue Operations Landscape</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-1">The modern SaaS company generates data across dozens of touchpoints — from first website visit to renewal conversation. Revenue Operations is the discipline of connecting these dots into a coherent, actionable picture...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span>3,847 words generated · 6 sections · Optimized for Founder persona</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <p className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Headline Optimization</p>
                    {[
                      { headline: "SaaS Revenue Operations Guide: The 2026 Framework", score: 92 },
                      { headline: "The Complete RevOps Playbook for SaaS Founders", score: 88 },
                      { headline: "How Top SaaS Companies Build Revenue Machines", score: 85 },
                    ].map((h, i) => (
                      <div key={i} className="p-2 rounded-lg border border-border/50 flex items-center gap-2">
                        <span className={`text-xs font-bold ${h.score >= 90 ? "text-[hsl(var(--cbs-green))]" : "text-primary"}`}>{h.score}</span>
                        <span className="text-xs flex-1">{h.headline}</span>
                        {i === 0 && <Star className="h-3 w-3 text-[hsl(var(--cbs-amber))]" />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-sm font-semibold">Content Quality</p>
                    {[
                      { label: "Persona Alignment", value: 94 },
                      { label: "SEO Score", value: 87 },
                      { label: "Readability", value: 91 },
                      { label: "Engagement Prediction", value: 82 },
                    ].map((m) => (
                      <div key={m.label} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-32">{m.label}</span>
                        <Progress value={m.value} className="h-1.5 flex-1" />
                        <span className="text-xs font-bold w-8 text-right">{m.value}%</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setBuilderStep(4)}>Back</Button>
              <Button onClick={() => setBuilderStep(6)} className="gap-1.5">Create Landing Page <Layout className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}

        {/* Step 6: Landing Page */}
        {builderStep === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Landing Page Generator</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2"><Monitor className="h-4 w-4" />Preview</CardTitle>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Monitor className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Smartphone className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl border border-border/50 overflow-hidden bg-background">
                      {/* Hero */}
                      <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-background p-8 text-center space-y-4">
                        <Badge className="bg-primary/15 text-primary border-0">Free Guide</Badge>
                        <h3 className="text-xl font-bold">SaaS Revenue Operations Guide: The 2026 Framework</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">The complete playbook for SaaS founders to build high-performing revenue operations from scratch.</p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <Input placeholder="Enter your email" className="max-w-xs h-9 text-sm" />
                          <Button size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" />Get Free Guide</Button>
                        </div>
                      </div>
                      {/* Benefits */}
                      <div className="p-6 grid grid-cols-3 gap-4">
                        {["6-chapter framework", "90-day implementation plan", "Real company examples"].map((b, i) => (
                          <div key={i} className="text-center space-y-1">
                            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--cbs-green))] mx-auto" />
                            <p className="text-xs font-medium">{b}</p>
                          </div>
                        ))}
                      </div>
                      {/* Testimonial */}
                      <div className="px-6 pb-6">
                        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                          <p className="text-xs italic text-muted-foreground">"This guide transformed how we think about revenue operations. Within 90 days, we increased pipeline velocity by 40%."</p>
                          <p className="text-xs font-medium mt-2">— Sarah Chen, VP Engineering at Acme Corp</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <p className="text-sm font-semibold">Page Settings</p>
                    <div className="space-y-2">
                      <div><p className="text-xs text-muted-foreground mb-1">Page Title</p><Input className="h-8 text-sm" defaultValue="Free RevOps Guide for SaaS Founders" /></div>
                      <div><p className="text-xs text-muted-foreground mb-1">URL Slug</p><Input className="h-8 text-sm" defaultValue="/resources/revops-guide" /></div>
                      <div><p className="text-xs text-muted-foreground mb-1">CTA Button</p><Input className="h-8 text-sm" defaultValue="Get Free Guide" /></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Automations</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-[hsl(var(--cbs-green))]" />Push lead to CRM on form submit</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-[hsl(var(--cbs-green))]" />Auto-assign persona tag</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-[hsl(var(--cbs-green))]" />Score lead based on engagement</div>
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-[hsl(var(--cbs-green))]" />Start email nurture sequence</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setBuilderStep(5)}>Back</Button>
              <Button onClick={goBack} className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Publish Lead Magnet</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Detail View ──────────────────────────────────────
  if (mainView === "detail" && selectedMagnet) {
    const m = selectedMagnet;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={goBack} className="hover:text-foreground transition-colors">Lead Magnets</button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{m.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <m.typeIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{m.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={statusConfig[m.status].color}>{statusConfig[m.status].label}</Badge>
                <Badge variant="outline">{m.type}</Badge>
                <Badge variant="outline" className="gap-1"><UserCircle className="h-3 w-3" />{m.persona}</Badge>
                <Badge variant="outline" className="gap-1"><GitBranch className="h-3 w-3" />{m.revpathStage}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5"><Pen className="h-3.5 w-3.5" />Edit</Button>
            <Button variant="outline" size="sm" className="gap-1.5"><Copy className="h-3.5 w-3.5" />Duplicate</Button>
            <Button size="sm" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" />View Page</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Conversions", value: m.conversions.toLocaleString(), icon: Target },
            { label: "Conversion Rate", value: `${m.conversionRate}%`, icon: TrendingUp },
            { label: "Page Views", value: m.views.toLocaleString(), icon: Eye },
            { label: "Revenue", value: m.revenue, icon: DollarSign },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-black">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Conversion Trend</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={conversionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="leads" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">CRM Lead Pipeline</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "New Leads Pushed", value: m.leads, desc: "Auto-created in CRM", icon: Users, color: "text-primary" },
                { label: "Avg Lead Score", value: "76", desc: "Based on engagement", icon: Target, color: "text-accent" },
                { label: "Persona Classified", value: `${Math.round(m.leads * 0.94)}`, desc: `${m.persona} persona tagged`, icon: UserCircle, color: "text-[hsl(var(--cbs-green))]" },
                { label: "Sales Notified", value: `${Math.round(m.leads * 0.18)}`, desc: "High-score leads flagged", icon: Bell, color: "text-[hsl(var(--cbs-amber))]" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <span className="text-sm font-bold">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Main Dashboard ───────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Magnet Intelligence Center</h1>
          <p className="text-sm text-muted-foreground">Create, test, and optimize AI-powered lead magnets across personas and revenue paths</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={openBuilder}><Plus className="h-3.5 w-3.5" />New Lead Magnet</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{k.label}</span>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <div className="text-2xl font-black">{k.value}</div>
              <p className="text-xs text-[hsl(var(--cbs-green))] flex items-center gap-1"><TrendingUp className="h-3 w-3" />{k.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="magnets" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="magnets" className="gap-1.5"><Magnet className="h-3.5 w-3.5" />Lead Magnets</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Analytics</TabsTrigger>
          <TabsTrigger value="personas" className="gap-1.5"><UserCircle className="h-3.5 w-3.5" />Persona Targeting</TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5"><Brain className="h-3.5 w-3.5" />AI Engine</TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5"><Workflow className="h-3.5 w-3.5" />Automations</TabsTrigger>
        </TabsList>

        {/* ── Lead Magnets Tab ──────────────────────── */}
        <TabsContent value="magnets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leadMagnets.map((m) => (
              <Card key={m.id} className="cursor-pointer hover:border-primary/30 transition-all group" onClick={() => openDetail(m)}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <m.typeIcon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors leading-tight">{m.name}</h3>
                        <p className="text-xs text-muted-foreground">{m.type} · {m.persona}</p>
                      </div>
                    </div>
                    <Badge className={`text-[10px] ${statusConfig[m.status].color}`}>{statusConfig[m.status].label}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-sm font-bold">{m.conversions.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Leads</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-sm font-bold">{m.conversionRate}%</p>
                      <p className="text-[10px] text-muted-foreground">CVR</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-sm font-bold">{m.revenue}</p>
                      <p className="text-[10px] text-muted-foreground">Revenue</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />{m.revpathStage}
                    </div>
                    <span>{m.lastUpdated}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Analytics Tab ─────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Conversion Trend</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={conversionTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} name="CVR %" />
                    <Line type="monotone" dataKey="leads" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--accent))" }} name="Leads" yAxisId={0} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4 text-accent" />Traffic Sources</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={trafficSources} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                      {trafficSources.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 -mt-4">
                  {trafficSources.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-muted-foreground">{s.name} ({s.value}%)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Funnel */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-primary" />Full Funnel Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {funnelData.map((f, i) => (
                  <div key={f.stage} className="flex items-center gap-4">
                    <span className="text-sm font-medium w-24">{f.stage}</span>
                    <div className="flex-1 relative">
                      <div className="h-8 rounded-lg bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-lg transition-all"
                          style={{
                            width: `${f.pct}%`,
                            background: `hsl(var(--primary) / ${0.2 + (1 - i * 0.15)})`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold w-16 text-right">{f.value.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground w-10 text-right">{f.pct}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Stage */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Revenue Attribution by RevPath Stage</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {revenueByStage.map((r) => (
                  <div key={r.stage} className="p-4 rounded-xl border border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-semibold">{r.stage}</Badge>
                      <span className="text-xs text-muted-foreground">{r.magnets} magnets</span>
                    </div>
                    <div className="text-2xl font-black">${(r.revenue / 1000).toFixed(1)}K</div>
                    <p className="text-xs text-muted-foreground">{r.leads.toLocaleString()} leads captured</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Persona Targeting Tab ─────────────────── */}
        <TabsContent value="personas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personas.map((p) => {
              const engagement = personaEngagement.find((e) => e.persona === p.name);
              return (
                <Card key={p.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${p.color}`}>
                        <UserCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{p.name}</h3>
                        <p className="text-xs text-muted-foreground">{p.industry}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Engagement Score</span>
                      <span className="font-bold">{engagement?.engagement}%</span>
                    </div>
                    <Progress value={engagement?.engagement} className="h-1.5" />
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Goals</p>
                        <div className="flex flex-wrap gap-1">{p.goals.map((g) => <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>)}</div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Pain Points</p>
                        <div className="flex flex-wrap gap-1">{p.pains.map((pp) => <Badge key={pp} variant="outline" className="text-[10px]">{pp}</Badge>)}</div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Decision Triggers</p>
                        <div className="flex flex-wrap gap-1">{p.triggers.map((t) => <Badge key={t} className="text-[10px] bg-[hsl(var(--cbs-amber))]/10 text-[hsl(var(--cbs-amber))] border-0">{t}</Badge>)}</div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Preferred Formats</p>
                        <div className="flex flex-wrap gap-1">{p.formats.map((f) => <Badge key={f} className="text-[10px] bg-primary/10 text-primary border-0">{f}</Badge>)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                      <span className="text-muted-foreground">{engagement?.magnets} active magnet{(engagement?.magnets ?? 0) > 1 ? "s" : ""}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1"><ExternalLink className="h-3 w-3" />Persona Builder</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-accent" />Persona Engagement Comparison</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={personaEngagement}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="persona" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Engagement %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI Engine Tab ─────────────────────────── */}
        <TabsContent value="ai" className="space-y-4">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI Content Engine — Suggested Lead Magnets</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {aiSuggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card/80 hover:border-primary/30 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Lightbulb className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-semibold">"{s.title}"</h3>
                    <p className="text-xs text-muted-foreground">{s.reasoning}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="outline" className="text-[10px] gap-1"><UserCircle className="h-3 w-3" />{s.persona}</Badge>
                      <Badge variant="outline" className="text-[10px]">{s.type}</Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-primary">{s.confidence}%</div>
                    <p className="text-[10px] text-muted-foreground">confidence</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={openBuilder}>
                    <Wand2 className="h-3.5 w-3.5" />Create
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Search className="h-4 w-4 text-accent" />SEO Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { keyword: "revenue operations guide 2026", volume: "8,400/mo", difficulty: 34, opportunity: "High" },
                  { keyword: "SaaS growth marketing checklist", volume: "5,200/mo", difficulty: 28, opportunity: "High" },
                  { keyword: "marketing attribution calculator", volume: "3,100/mo", difficulty: 42, opportunity: "Medium" },
                  { keyword: "product-led growth metrics", volume: "6,800/mo", difficulty: 38, opportunity: "High" },
                ].map((kw) => (
                  <div key={kw.keyword} className="flex items-center gap-3 p-2 rounded-lg border border-border/50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{kw.keyword}</p>
                      <p className="text-xs text-muted-foreground">{kw.volume} · Difficulty: {kw.difficulty}</p>
                    </div>
                    <Badge className={kw.opportunity === "High" ? "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))]" : "bg-[hsl(var(--cbs-amber))]/15 text-[hsl(var(--cbs-amber))]"}>{kw.opportunity}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Pen className="h-4 w-4 text-primary" />Content Structure Suggestions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  "Interactive elements increase conversion by 28% — add quizzes to existing guides",
                  "Shorter formats (checklists) outperform long-form for Growth Marketer persona by 1.6x",
                  "Adding ROI calculators to MOFU content increases MQL rate by 34%",
                  "Video summaries at the top of whitepapers boost engagement time by 45%",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm">{s}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Automations Tab ───────────────────────── */}
        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automationWorkflows.map((w) => (
              <Card key={w.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{w.name}</h3>
                    <Badge className={w.status === "active" ? "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))]" : "bg-muted-foreground/20 text-muted-foreground"}>
                      {w.status === "active" ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                      {w.status}
                    </Badge>
                  </div>

                  {/* Visual Workflow */}
                  <div className="flex items-center gap-2 overflow-x-auto py-2">
                    <div className="px-3 py-1.5 rounded-lg bg-[hsl(var(--cbs-amber))]/10 border border-[hsl(var(--cbs-amber))]/20 text-xs font-medium shrink-0 flex items-center gap-1">
                      <Zap className="h-3 w-3 text-[hsl(var(--cbs-amber))]" />{w.trigger}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {w.actions.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium shrink-0">{a}</div>
                        {i < w.actions.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span>{w.runs.toLocaleString()} total runs</span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1"><ExternalLink className="h-3 w-3" />CRM</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CRM Integration Summary */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-accent" />CRM Integration Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: "Download ebook → Create CRM contact", desc: "Auto-creates contact with persona tag, lead score, and source attribution", runs: "3,420", icon: Download },
                  { title: "High engagement → Notify sales", desc: "Triggers sales alert when lead score exceeds 80 with Slack notification", runs: "1,240", icon: Bell },
                  { title: "Persona match → Start nurture campaign", desc: "Enrolls lead in persona-specific email sequence with dynamic content", runs: "2,890", icon: Mail },
                ].map((a) => (
                  <div key={a.title} className="p-4 rounded-xl border border-border/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <a.icon className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">{a.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                    <p className="text-xs font-medium">{a.runs} executions</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
