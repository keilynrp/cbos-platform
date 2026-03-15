import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  Sankey, Layer, Rectangle,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Search, Eye, MousePointer,
  ArrowRight, Sparkles, Target, Zap, FileText, BarChart3, Brain,
  Filter, Download, RefreshCw, ChevronRight, Star, AlertTriangle,
  CheckCircle2, Clock, Globe, Layers, GitBranch,
} from "lucide-react";

// ── Mock Data ──────────────────────────────────────────────

const kpiData = [
  { label: "Attributed Revenue", value: "$284,500", change: "+18.3%", trend: "up", icon: DollarSign },
  { label: "Revenue per Keyword", value: "$142.25", change: "+7.8%", trend: "up", icon: Search },
  { label: "Content ROI", value: "340%", change: "+24.1%", trend: "up", icon: Target },
  { label: "Attribution Accuracy", value: "94.2%", change: "+2.1%", trend: "up", icon: Brain },
];

// Revenue Attribution Map data
const attributionFlowData = [
  { source: "Branded Keywords", impressions: 45000, clicks: 8200, conversions: 410, revenue: 82000 },
  { source: "Product Keywords", impressions: 120000, clicks: 15600, conversions: 312, revenue: 62400 },
  { source: "Informational", impressions: 280000, clicks: 22400, conversions: 224, revenue: 44800 },
  { source: "Comparison", impressions: 65000, clicks: 9100, conversions: 273, revenue: 54600 },
  { source: "Long-tail", impressions: 180000, clicks: 12600, conversions: 189, revenue: 37800 },
];

const channelBreakdown = [
  { name: "Organic Search", value: 45, color: "hsl(var(--primary))" },
  { name: "Paid Search", value: 25, color: "hsl(var(--accent))" },
  { name: "Direct", value: 15, color: "hsl(var(--cbs-green))" },
  { name: "Social", value: 10, color: "hsl(var(--cbs-amber))" },
  { name: "Referral", value: 5, color: "hsl(var(--muted-foreground))" },
];

const monthlyRevenue = [
  { month: "Jul", organic: 18200, paid: 12400, direct: 6800, total: 37400 },
  { month: "Aug", organic: 21500, paid: 13100, direct: 7200, total: 41800 },
  { month: "Sep", organic: 24800, paid: 14200, direct: 7800, total: 46800 },
  { month: "Oct", organic: 28100, paid: 15800, direct: 8400, total: 52300 },
  { month: "Nov", organic: 32400, paid: 16500, direct: 9100, total: 58000 },
  { month: "Dec", organic: 36200, paid: 17800, direct: 9800, total: 63800 },
  { month: "Jan", organic: 38500, paid: 18200, direct: 10200, total: 66900 },
  { month: "Feb", organic: 41200, paid: 19500, direct: 10800, total: 71500 },
];

// Keyword Intelligence data
const keywordClusters = [
  {
    cluster: "Product Reviews",
    keywords: 48,
    totalVolume: 124000,
    avgPosition: 4.2,
    revenue: "$42,800",
    opportunity: "high",
    topKeywords: ["best crm software 2026", "crm comparison", "top crm tools"],
  },
  {
    cluster: "How-to Guides",
    keywords: 72,
    totalVolume: 210000,
    avgPosition: 6.8,
    revenue: "$28,400",
    opportunity: "medium",
    topKeywords: ["how to set up crm", "crm implementation guide", "crm best practices"],
  },
  {
    cluster: "Pricing & Plans",
    keywords: 23,
    totalVolume: 85000,
    avgPosition: 3.1,
    revenue: "$68,200",
    opportunity: "high",
    topKeywords: ["crm pricing", "affordable crm", "crm free trial"],
  },
  {
    cluster: "Industry-specific",
    keywords: 56,
    totalVolume: 96000,
    avgPosition: 8.4,
    revenue: "$18,600",
    opportunity: "high",
    topKeywords: ["crm for real estate", "healthcare crm", "crm for startups"],
  },
  {
    cluster: "Alternatives & Migrations",
    keywords: 31,
    totalVolume: 72000,
    avgPosition: 5.6,
    revenue: "$36,500",
    opportunity: "medium",
    topKeywords: ["salesforce alternative", "hubspot vs", "crm migration guide"],
  },
];

const keywordTable = [
  { keyword: "best crm software 2026", volume: 18100, position: 2, ctr: 14.2, clicks: 2570, conversions: 128, revenue: 25600, trend: "up" },
  { keyword: "crm pricing comparison", volume: 12400, position: 1, ctr: 22.8, clicks: 2827, conversions: 113, revenue: 22600, trend: "up" },
  { keyword: "salesforce alternative", volume: 14800, position: 4, ctr: 8.6, clicks: 1273, conversions: 76, revenue: 15200, trend: "up" },
  { keyword: "crm for small business", volume: 22000, position: 6, ctr: 5.4, clicks: 1188, conversions: 59, revenue: 11800, trend: "down" },
  { keyword: "how to choose crm", volume: 8900, position: 3, ctr: 12.1, clicks: 1077, conversions: 54, revenue: 10800, trend: "up" },
  { keyword: "crm implementation guide", volume: 6200, position: 5, ctr: 7.8, clicks: 484, conversions: 29, revenue: 5800, trend: "up" },
  { keyword: "crm free trial", volume: 15600, position: 8, ctr: 3.2, clicks: 499, conversions: 25, revenue: 5000, trend: "down" },
  { keyword: "enterprise crm features", volume: 4100, position: 7, ctr: 6.1, clicks: 250, conversions: 20, revenue: 4000, trend: "up" },
];

// Content Performance data
const contentPieces = [
  { title: "Ultimate CRM Comparison Guide 2026", type: "Pillar", stage: "Top of Funnel", revenueScore: 92, views: 48200, conversions: 241, revenue: 48200, roi: 480, status: "active", updated: "2 days ago" },
  { title: "CRM Pricing: Complete Breakdown", type: "Landing", stage: "Bottom of Funnel", revenueScore: 88, views: 32100, conversions: 192, revenue: 38400, roi: 640, status: "active", updated: "1 week ago" },
  { title: "Salesforce vs HubSpot vs Composable", type: "Comparison", stage: "Mid Funnel", revenueScore: 85, views: 28400, conversions: 170, revenue: 34000, roi: 520, status: "active", updated: "3 days ago" },
  { title: "How to Implement CRM in 30 Days", type: "Guide", stage: "Mid Funnel", revenueScore: 78, views: 22800, conversions: 114, revenue: 22800, roi: 380, status: "active", updated: "5 days ago" },
  { title: "CRM for Real Estate: Complete Guide", type: "Vertical", stage: "Top of Funnel", revenueScore: 72, views: 18600, conversions: 93, revenue: 18600, roi: 310, status: "optimizing", updated: "1 day ago" },
  { title: "Free CRM Trial: Getting Started", type: "Landing", stage: "Bottom of Funnel", revenueScore: 68, views: 15200, conversions: 76, revenue: 15200, roi: 253, status: "active", updated: "2 weeks ago" },
  { title: "CRM Best Practices for 2026", type: "Blog", stage: "Top of Funnel", revenueScore: 55, views: 12400, conversions: 62, revenue: 12400, roi: 207, status: "declining", updated: "3 weeks ago" },
  { title: "Enterprise CRM Buying Guide", type: "Whitepaper", stage: "Bottom of Funnel", revenueScore: 48, views: 8200, conversions: 41, revenue: 8200, roi: 137, status: "draft", updated: "today" },
];

// Predictive Forecast data
const forecastData = [
  { month: "Mar", actual: 71500, predicted: null, optimistic: null, pessimistic: null },
  { month: "Apr", actual: null, predicted: 76200, optimistic: 82400, pessimistic: 70100 },
  { month: "May", actual: null, predicted: 81800, optimistic: 90200, pessimistic: 74500 },
  { month: "Jun", actual: null, predicted: 88400, optimistic: 99800, pessimistic: 78200 },
  { month: "Jul", actual: null, predicted: 95600, optimistic: 110400, pessimistic: 82800 },
  { month: "Aug", actual: null, predicted: 103200, optimistic: 122000, pessimistic: 87400 },
  { month: "Sep", actual: null, predicted: 112800, optimistic: 136200, pessimistic: 92100 },
];

const pipelineOpportunities = [
  { content: "CRM for Healthcare: 2026 Guide", keywords: 12, estVolume: 28000, estRevenue: "$18,400", confidence: 87, timeline: "2 weeks" },
  { content: "CRM ROI Calculator Tool", keywords: 8, estVolume: 15000, estRevenue: "$24,600", confidence: 92, timeline: "3 weeks" },
  { content: "AI-Powered CRM Features Guide", keywords: 18, estVolume: 42000, estRevenue: "$31,200", confidence: 78, timeline: "4 weeks" },
  { content: "CRM Integration Ecosystem Map", keywords: 14, estVolume: 22000, estRevenue: "$14,800", confidence: 84, timeline: "3 weeks" },
];

const aiInsights = [
  { type: "opportunity", title: "Keyword gap: 'AI CRM' cluster underserved", description: "18 high-volume keywords with no ranking content. Estimated $31.2K monthly revenue potential.", priority: "high" },
  { type: "alert", title: "Revenue decline in 'free trial' keywords", description: "Position dropped from #3 to #8 in 30 days. Estimated $5K/mo revenue at risk.", priority: "critical" },
  { type: "insight", title: "Content refresh opportunity", description: "'CRM Best Practices' post declining — refresh with 2026 data could recover $4.2K/mo.", priority: "medium" },
  { type: "prediction", title: "Seasonal trend: Q2 budget allocation spike", description: "Historical pattern shows 22% increase in 'CRM pricing' searches Apr-Jun.", priority: "high" },
];

// ── Components ─────────────────────────────────────────────

function KPICards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiData.map((kpi) => (
        <Card key={kpi.label} className="border border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
              <kpi.icon className="h-4 w-4 text-primary/60" />
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {kpi.trend === "up" ? (
                <TrendingUp className="h-3 w-3 text-[hsl(var(--cbs-green))]" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={`text-xs font-medium ${kpi.trend === "up" ? "text-[hsl(var(--cbs-green))]" : "text-destructive"}`}>
                {kpi.change}
              </span>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AIInsightsPanel() {
  const icons: Record<string, typeof Sparkles> = {
    opportunity: Sparkles,
    alert: AlertTriangle,
    insight: Brain,
    prediction: Eye,
  };
  const colors: Record<string, string> = {
    critical: "border-destructive/40 bg-destructive/5",
    high: "border-primary/40 bg-primary/5",
    medium: "border-[hsl(var(--cbs-amber))]/40 bg-[hsl(var(--cbs-amber))]/5",
  };

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">AI Strategic Insights</CardTitle>
          <Badge variant="secondary" className="text-[9px]">Powered by AI</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {aiInsights.map((insight, i) => {
          const Icon = icons[insight.type] || Sparkles;
          return (
            <div key={i} className={`rounded-lg border p-3 ${colors[insight.priority] || ""}`}>
              <div className="flex items-start gap-2">
                <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold">{insight.title}</p>
                    <Badge variant={insight.priority === "critical" ? "destructive" : "outline"} className="text-[8px] shrink-0">
                      {insight.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ── Tab Views ──────────────────────────────────────────────

function RevenueAttributionMap() {
  return (
    <div className="space-y-6">
      <KPICards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue Attribution Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="organic" stackId="1" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.6} name="Organic" />
                <Area type="monotone" dataKey="paid" stackId="1" fill="hsl(var(--accent))" stroke="hsl(var(--accent))" fillOpacity={0.4} name="Paid" />
                <Area type="monotone" dataKey="direct" stackId="1" fill="hsl(var(--cbs-green))" stroke="hsl(var(--cbs-green))" fillOpacity={0.3} name="Direct" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel Breakdown */}
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Channel Contribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={channelBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                  {channelBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v}%`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {channelBreakdown.map((ch) => (
                <div key={ch.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: ch.color }} />
                    <span className="text-muted-foreground">{ch.name}</span>
                  </div>
                  <span className="font-medium">{ch.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attribution Flow Table */}
      <Card className="border border-border/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Keyword → Revenue Attribution Flow</CardTitle>
            <Badge variant="outline" className="text-[9px]">Multi-touch model</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold">Keyword Source</th>
                  <th className="text-right p-2 font-semibold">Impressions</th>
                  <th className="text-center p-2 font-semibold" />
                  <th className="text-right p-2 font-semibold">Clicks</th>
                  <th className="text-center p-2 font-semibold" />
                  <th className="text-right p-2 font-semibold">Conversions</th>
                  <th className="text-center p-2 font-semibold" />
                  <th className="text-right p-2 font-semibold">Revenue</th>
                  <th className="text-right p-2 font-semibold">Conv Rate</th>
                </tr>
              </thead>
              <tbody>
                {attributionFlowData.map((row) => (
                  <tr key={row.source} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="p-2 font-medium">{row.source}</td>
                    <td className="p-2 text-right text-muted-foreground">{row.impressions.toLocaleString()}</td>
                    <td className="p-2 text-center"><ArrowRight className="h-3 w-3 text-primary/40 mx-auto" /></td>
                    <td className="p-2 text-right text-muted-foreground">{row.clicks.toLocaleString()}</td>
                    <td className="p-2 text-center"><ArrowRight className="h-3 w-3 text-primary/40 mx-auto" /></td>
                    <td className="p-2 text-right text-muted-foreground">{row.conversions.toLocaleString()}</td>
                    <td className="p-2 text-center"><ArrowRight className="h-3 w-3 text-[hsl(var(--cbs-green))]/60 mx-auto" /></td>
                    <td className="p-2 text-right font-semibold text-[hsl(var(--cbs-green))]">${row.revenue.toLocaleString()}</td>
                    <td className="p-2 text-right text-muted-foreground">{((row.conversions / row.clicks) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AIInsightsPanel />
    </div>
  );
}

function KeywordIntelligenceHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = keywordTable.filter((kw) =>
    kw.keyword.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Cluster Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {keywordClusters.map((cluster) => (
          <Card key={cluster.cluster} className="border border-border/60 hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">{cluster.cluster}</p>
                <Badge variant={cluster.opportunity === "high" ? "default" : "secondary"} className="text-[9px]">
                  {cluster.opportunity} opp.
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Keywords</p>
                  <p className="text-sm font-bold">{cluster.keywords}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Volume</p>
                  <p className="text-sm font-bold">{(cluster.totalVolume / 1000).toFixed(0)}K</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Avg Position</p>
                  <p className="text-sm font-bold">{cluster.avgPosition}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Revenue</p>
                  <p className="text-sm font-bold text-[hsl(var(--cbs-green))]">{cluster.revenue}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {cluster.topKeywords.map((kw) => (
                  <Badge key={kw} variant="outline" className="text-[8px] font-normal">{kw}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Keyword Table */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Keyword Revenue Intelligence</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="h-8 pl-8 text-xs w-52"
                  placeholder="Filter keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Download className="h-3 w-3" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Keyword", "Volume", "Position", "CTR", "Clicks", "Conv.", "Revenue", "Trend"].map((h) => (
                    <th key={h} className="text-left p-2 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((kw) => (
                  <tr key={kw.keyword} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="p-2 font-medium max-w-[200px] truncate">{kw.keyword}</td>
                    <td className="p-2 text-muted-foreground">{kw.volume.toLocaleString()}</td>
                    <td className="p-2">
                      <Badge variant={kw.position <= 3 ? "default" : kw.position <= 5 ? "secondary" : "outline"} className="text-[9px]">
                        #{kw.position}
                      </Badge>
                    </td>
                    <td className="p-2 text-muted-foreground">{kw.ctr}%</td>
                    <td className="p-2 text-muted-foreground">{kw.clicks.toLocaleString()}</td>
                    <td className="p-2 text-muted-foreground">{kw.conversions}</td>
                    <td className="p-2 font-semibold text-[hsl(var(--cbs-green))]">${kw.revenue.toLocaleString()}</td>
                    <td className="p-2">
                      {kw.trend === "up" ? (
                        <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--cbs-green))]" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ContentPerformanceMatrix() {
  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Content Pieces", value: contentPieces.length.toString(), sub: "Tracked" },
          { label: "Avg Revenue Score", value: "73.3", sub: "/100" },
          { label: "Total Content Revenue", value: "$199,600", sub: "+14.2% MoM" },
          { label: "Best Performer ROI", value: "640%", sub: "Pricing page" },
        ].map((stat) => (
          <Card key={stat.label} className="border border-border/60">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-xl font-bold">{stat.value}</p>
                <span className="text-[10px] text-muted-foreground">{stat.sub}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Content Performance Matrix</CardTitle>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pillar">Pillar</SelectItem>
                  <SelectItem value="landing">Landing</SelectItem>
                  <SelectItem value="blog">Blog</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="revenue">
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">By Revenue</SelectItem>
                  <SelectItem value="roi">By ROI</SelectItem>
                  <SelectItem value="score">By Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {contentPieces.map((piece) => {
              const statusColors: Record<string, string> = {
                active: "text-[hsl(var(--cbs-green))]",
                optimizing: "text-[hsl(var(--cbs-amber))]",
                declining: "text-destructive",
                draft: "text-muted-foreground",
              };
              const statusIcons: Record<string, typeof CheckCircle2> = {
                active: CheckCircle2,
                optimizing: RefreshCw,
                declining: AlertTriangle,
                draft: Clock,
              };
              const StatusIcon = statusIcons[piece.status] || CheckCircle2;

              return (
                <div key={piece.title} className="flex items-center gap-4 p-3 rounded-lg border border-border/40 hover:border-primary/30 transition-colors">
                  {/* Revenue Score */}
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-primary">{piece.revenueScore}</span>
                    <span className="text-[7px] text-muted-foreground">SCORE</span>
                  </div>

                  {/* Title & Meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{piece.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[8px]">{piece.type}</Badge>
                      <Badge variant="secondary" className="text-[8px]">{piece.stage}</Badge>
                      <span className="text-[10px] text-muted-foreground">Updated {piece.updated}</span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="hidden md:flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Views</p>
                      <p className="text-xs font-semibold">{(piece.views / 1000).toFixed(1)}K</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Conv.</p>
                      <p className="text-xs font-semibold">{piece.conversions}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Revenue</p>
                      <p className="text-xs font-semibold text-[hsl(var(--cbs-green))]">${(piece.revenue / 1000).toFixed(1)}K</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">ROI</p>
                      <p className="text-xs font-semibold">{piece.roi}%</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className={`flex items-center gap-1 shrink-0 ${statusColors[piece.status]}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium capitalize">{piece.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PredictiveRevenueForecast() {
  return (
    <div className="space-y-6">
      {/* Forecast Chart */}
      <Card className="border border-border/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Revenue Forecast (6-Month)</CardTitle>
              <Badge variant="secondary" className="text-[9px]">AI Prediction</Badge>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1"><div className="h-2 w-4 rounded bg-[hsl(var(--cbs-green))]" /> Actual</div>
              <div className="flex items-center gap-1"><div className="h-2 w-4 rounded bg-primary" /> Predicted</div>
              <div className="flex items-center gap-1"><div className="h-2 w-4 rounded bg-primary/20" /> Range</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => v ? [`$${v.toLocaleString()}`, ""] : ["-", ""]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="optimistic" fill="hsl(var(--primary))" stroke="none" fillOpacity={0.08} name="Optimistic" />
              <Area type="monotone" dataKey="pessimistic" fill="none" stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeOpacity={0.3} name="Pessimistic" />
              <Line type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} name="Predicted" />
              <Line type="monotone" dataKey="actual" stroke="hsl(var(--cbs-green))" strokeWidth={2.5} dot={{ r: 5, fill: "hsl(var(--cbs-green))" }} name="Actual" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Content Pipeline */}
        <Card className="border border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Content Pipeline Opportunities</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipelineOpportunities.map((opp) => (
              <div key={opp.content} className="p-3 rounded-lg border border-border/40 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold">{opp.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{opp.keywords} keywords</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">{(opp.estVolume / 1000).toFixed(0)}K volume</span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[hsl(var(--cbs-green))]">{opp.estRevenue}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-medium">{opp.confidence}%</span>
                    </div>
                    <Progress value={opp.confidence} className="h-1.5" />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    <span>{opp.timeline}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Forecast Summary */}
        <div className="space-y-4">
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Revenue Targets</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Q1 2026 Target", target: 200000, current: 180200, deadline: "Mar 31" },
                { label: "Q2 2026 Target", target: 260000, current: 0, deadline: "Jun 30" },
                { label: "Annual Target ($60K ARR)", target: 720000, current: 284500, deadline: "Dec 31" },
              ].map((goal) => (
                <div key={goal.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{goal.label}</span>
                    <span className="text-muted-foreground">Due {goal.deadline}</span>
                  </div>
                  <Progress value={goal.target > 0 ? (goal.current / goal.target) * 100 : 0} className="h-2 mb-1" />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>${(goal.current / 1000).toFixed(0)}K of ${(goal.target / 1000).toFixed(0)}K</span>
                    <span className="font-medium">{goal.target > 0 ? ((goal.current / goal.target) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <AIInsightsPanel />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

const RevPathIntelligence = () => {
  const [activeTab, setActiveTab] = useState("attribution");

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">RevPath Intelligence</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Strategic Revenue Attribution</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Transform marketing data into actionable revenue intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="30d">
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1">
            <Download className="h-3 w-3" /> Export Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-10 w-full justify-start">
          <TabsTrigger value="attribution" className="text-xs gap-1.5">
            <GitBranch className="h-3.5 w-3.5" /> Revenue Attribution
          </TabsTrigger>
          <TabsTrigger value="keywords" className="text-xs gap-1.5">
            <Search className="h-3.5 w-3.5" /> Keyword Intelligence
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Content Performance
          </TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Predictive Forecast
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attribution" className="mt-6">
          <RevenueAttributionMap />
        </TabsContent>
        <TabsContent value="keywords" className="mt-6">
          <KeywordIntelligenceHub />
        </TabsContent>
        <TabsContent value="content" className="mt-6">
          <ContentPerformanceMatrix />
        </TabsContent>
        <TabsContent value="forecast" className="mt-6">
          <PredictiveRevenueForecast />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RevPathIntelligence;
