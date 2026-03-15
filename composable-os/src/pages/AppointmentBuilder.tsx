import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarClock, BarChart3, Users, Clock, Video, Phone, MapPin,
  Plus, Settings, ChevronRight, ArrowRight, Check, X, Sparkles,
  Globe, Shield, Mail, Bell, Zap, Target, TrendingUp, Activity,
  UserCheck, CalendarDays, Timer, AlertCircle, Eye, Palette,
  Link2, GitBranch, Bot, Workflow, Play, CheckCircle2, XCircle,
  RefreshCw, Send, Brain, Lightbulb, BarChart2, PieChart as PieChartIcon,
  Calendar, Building2, Star, MessageSquare, FileText, ExternalLink,
  Layers, GripVertical, Copy, Trash2, Edit3
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, FunnelChart
} from "recharts";

// ── Types ────────────────────────────────────────────
interface AppointmentType {
  id: string;
  name: string;
  duration: number;
  buffer: number;
  color: string;
  icon: string;
  host: string;
  team: string;
  location: string;
  questions: string[];
  active: boolean;
}

interface WorkflowStep {
  id: string;
  trigger: string;
  action: string;
  delay?: string;
  active: boolean;
}

// ── Mock Data ────────────────────────────────────────
const appointmentTypes: AppointmentType[] = [
  { id: "1", name: "Discovery Call", duration: 30, buffer: 10, color: "hsl(var(--chart-1))", icon: "🔍", host: "Sarah Johnson", team: "Sales", location: "Zoom", questions: ["What's your biggest challenge?", "Team size?"], active: true },
  { id: "2", name: "Sales Demo", duration: 45, buffer: 15, color: "hsl(var(--chart-2))", icon: "🎯", host: "Mike Chen", team: "Sales", location: "Google Meet", questions: ["Current solution?", "Budget range?", "Timeline?"], active: true },
  { id: "3", name: "Strategy Session", duration: 60, buffer: 15, color: "hsl(var(--chart-3))", icon: "💡", host: "Alex Rivera", team: "Consulting", location: "In-Person", questions: ["Goals for Q1?", "Key stakeholders?"], active: true },
  { id: "4", name: "Consultation", duration: 30, buffer: 10, color: "hsl(var(--chart-4))", icon: "📋", host: "Emily Park", team: "Support", location: "Phone", questions: ["Account ID?"], active: true },
  { id: "5", name: "Technical Support", duration: 20, buffer: 5, color: "hsl(var(--chart-5))", icon: "🔧", host: "David Kim", team: "Engineering", location: "Zoom", questions: ["Issue description?", "Environment?"], active: false },
];

const upcomingMeetings = [
  { id: "m1", title: "Discovery Call", contact: "James Wilson", company: "Acme Corp", time: "Today, 2:00 PM", type: "discovery", status: "confirmed", avatar: "JW" },
  { id: "m2", title: "Sales Demo", contact: "Lisa Zhang", company: "TechStart Inc", time: "Today, 3:30 PM", type: "demo", status: "confirmed", avatar: "LZ" },
  { id: "m3", title: "Strategy Session", contact: "Robert Brown", company: "Growth Labs", time: "Tomorrow, 10:00 AM", type: "strategy", status: "pending", avatar: "RB" },
  { id: "m4", title: "Consultation", contact: "Maria Garcia", company: "Innovate Co", time: "Tomorrow, 1:00 PM", type: "consultation", status: "confirmed", avatar: "MG" },
  { id: "m5", title: "Discovery Call", contact: "Tom Anderson", company: "Scale Systems", time: "Wed, 11:00 AM", type: "discovery", status: "confirmed", avatar: "TA" },
];

const weeklyData = [
  { day: "Mon", booked: 8, completed: 7, noshow: 1 },
  { day: "Tue", booked: 12, completed: 11, noshow: 1 },
  { day: "Wed", booked: 10, completed: 9, noshow: 1 },
  { day: "Thu", booked: 14, completed: 12, noshow: 2 },
  { day: "Fri", booked: 9, completed: 8, noshow: 1 },
];

const monthlyTrend = [
  { month: "Jan", appointments: 120, conversions: 36, revenue: 54000 },
  { month: "Feb", appointments: 145, conversions: 48, revenue: 72000 },
  { month: "Mar", appointments: 168, conversions: 55, revenue: 82500 },
  { month: "Apr", appointments: 192, conversions: 67, revenue: 100500 },
  { month: "May", appointments: 210, conversions: 76, revenue: 114000 },
  { month: "Jun", appointments: 235, conversions: 89, revenue: 133500 },
];

const typeDistribution = [
  { name: "Discovery", value: 35 },
  { name: "Demo", value: 28 },
  { name: "Strategy", value: 18 },
  { name: "Consultation", value: 12 },
  { name: "Support", value: 7 },
];

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const funnelData = [
  { stage: "Lead", value: 1200, fill: "hsl(var(--chart-1))" },
  { stage: "Booked Meeting", value: 480, fill: "hsl(var(--chart-2))" },
  { stage: "Qualified Lead", value: 312, fill: "hsl(var(--chart-3))" },
  { stage: "Opportunity", value: 156, fill: "hsl(var(--chart-4))" },
  { stage: "Customer", value: 89, fill: "hsl(var(--chart-5))" },
];

const crmContacts = [
  { name: "James Wilson", company: "Acme Corp", email: "james@acme.com", score: 92, stage: "Opportunity", meetings: 4, lastMeeting: "2 days ago" },
  { name: "Lisa Zhang", company: "TechStart Inc", email: "lisa@techstart.com", score: 85, stage: "Qualified", meetings: 3, lastMeeting: "1 week ago" },
  { name: "Robert Brown", company: "Growth Labs", email: "robert@growthlabs.com", score: 78, stage: "Engaged", meetings: 2, lastMeeting: "3 days ago" },
  { name: "Maria Garcia", company: "Innovate Co", email: "maria@innovate.co", score: 67, stage: "Lead", meetings: 1, lastMeeting: "Today" },
];

const workflows: WorkflowStep[] = [
  { id: "w1", trigger: "Booking confirmed", action: "Send confirmation email with calendar invite", delay: "Immediate", active: true },
  { id: "w2", trigger: "24 hours before meeting", action: "Send reminder email with agenda", delay: "24h before", active: true },
  { id: "w3", trigger: "1 hour before meeting", action: "Send SMS reminder", delay: "1h before", active: true },
  { id: "w4", trigger: "Meeting completed", action: "Update CRM lifecycle stage", delay: "Immediate", active: true },
  { id: "w5", trigger: "No-show detected", action: "Send reschedule link & notify host", delay: "15min after", active: true },
  { id: "w6", trigger: "Meeting completed", action: "Create follow-up task in CRM", delay: "1h after", active: false },
];

const aiSuggestions = [
  { icon: Clock, title: "Optimize meeting times", description: "Tuesday 10-11 AM has 94% attendance rate. Consider prioritizing this slot for high-value leads.", priority: "high" },
  { icon: Timer, title: "Shorten Discovery Calls", description: "Average Discovery Call runs 22 min. Consider reducing from 30 to 25 minutes to improve throughput.", priority: "medium" },
  { icon: AlertCircle, title: "No-show risk alert", description: "3 meetings tomorrow have contacts with <50% historical attendance. Send extra reminders.", priority: "high" },
  { icon: Target, title: "Follow-up opportunity", description: "James Wilson (Acme Corp) hasn't been contacted in 5 days post-demo. Schedule a follow-up.", priority: "high" },
  { icon: TrendingUp, title: "Conversion insight", description: "Strategy Sessions convert 2.4x better than Discovery Calls. Route high-score leads directly.", priority: "medium" },
];

type ViewType = "dashboard" | "types" | "availability" | "booking" | "crm" | "revpath" | "ai" | "automations" | "analytics";

const AppointmentBuilder = () => {
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);

  const tabs: { id: ViewType; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Intelligence Center", icon: BarChart3 },
    { id: "types", label: "Appointment Types", icon: CalendarClock },
    { id: "availability", label: "Availability", icon: Clock },
    { id: "booking", label: "Booking Pages", icon: Palette },
    { id: "crm", label: "CRM Integration", icon: Users },
    { id: "revpath", label: "RevPath", icon: GitBranch },
    { id: "ai", label: "AI Assistant", icon: Brain },
    { id: "automations", label: "Automations", icon: Workflow },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
  ];

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                Intelligent Appointment Builder
              </h1>
              <p className="text-muted-foreground mt-1">
                Schedule, track and convert meetings into revenue
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowAIPanel(!showAIPanel)}>
                <Sparkles className="mr-2 h-4 w-4" /> AI Assistant
              </Button>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Appointment Type
              </Button>
            </div>
          </div>
          <div className="flex gap-2 mt-6 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeView === tab.id ? "default" : "ghost"}
                onClick={() => setActiveView(tab.id)}
                className="whitespace-nowrap"
                size="sm"
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">

            {/* ═══════════════ DASHBOARD ═══════════════ */}
            {activeView === "dashboard" && (
              <div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { label: "Upcoming Meetings", value: "24", sub: "Next 7 days", icon: CalendarDays, accent: "border-l-violet-500" },
                    { label: "Booked This Month", value: "235", sub: "+18% vs last month", icon: CalendarClock, accent: "border-l-blue-500" },
                    { label: "Show Rate", value: "91%", sub: "↑ 3% improvement", icon: UserCheck, accent: "border-l-emerald-500" },
                    { label: "Conversion Rate", value: "38%", sub: "Meeting → Opportunity", icon: Target, accent: "border-l-amber-500" },
                    { label: "Pipeline Generated", value: "$133.5K", sub: "This month", icon: TrendingUp, accent: "border-l-rose-500" },
                  ].map((kpi) => (
                    <Card key={kpi.label} className={`border-l-4 ${kpi.accent}`}>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                          <kpi.icon className="h-4 w-4 text-muted-foreground/60" />
                        </div>
                        <p className="text-2xl font-bold">{kpi.value}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{kpi.sub}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Weekly Appointment Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={weeklyData} barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                          <Bar dataKey="completed" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Completed" />
                          <Bar dataKey="noshow" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="No-show" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">By Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={typeDistribution} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {typeDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Upcoming + AI */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Upcoming Meetings</CardTitle>
                        <Button variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /></Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {upcomingMeetings.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{m.avatar}</div>
                            <div>
                              <p className="text-sm font-medium">{m.title}</p>
                              <p className="text-xs text-muted-foreground">{m.contact} · {m.company}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{m.time}</span>
                            <Badge variant={m.status === "confirmed" ? "default" : "secondary"} className="text-[10px]">{m.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-violet-200 dark:border-violet-900/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                        <CardTitle className="text-base">AI Recommendations</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {aiSuggestions.slice(0, 3).map((s, i) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/50 border space-y-1">
                          <div className="flex items-center gap-2">
                            <s.icon className="h-3.5 w-3.5 text-violet-500" />
                            <p className="text-xs font-semibold">{s.title}</p>
                            {s.priority === "high" && <Badge variant="destructive" className="text-[9px] h-4 px-1">High</Badge>}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{s.description}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ═══════════════ APPOINTMENT TYPES ═══════════════ */}
            {activeView === "types" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Type list */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Appointment Types</h2>
                      <Button size="sm"><Plus className="mr-2 h-3.5 w-3.5" /> New Type</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {appointmentTypes.map((type) => (
                        <Card
                          key={type.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${selectedType === type.id ? "ring-2 ring-primary" : ""}`}
                          onClick={() => setSelectedType(type.id)}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="text-xl">{type.icon}</div>
                                <div>
                                  <p className="font-semibold text-sm">{type.name}</p>
                                  <p className="text-xs text-muted-foreground">{type.team} · {type.host}</p>
                                </div>
                              </div>
                              <Badge variant={type.active ? "default" : "secondary"} className="text-[10px]">
                                {type.active ? "Active" : "Draft"}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              {[
                                { label: "Duration", value: `${type.duration}m` },
                                { label: "Buffer", value: `${type.buffer}m` },
                                { label: "Location", value: type.location },
                              ].map((s) => (
                                <div key={s.label} className="bg-muted/50 rounded-md p-2">
                                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                                  <p className="text-xs font-medium">{s.value}</p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MessageSquare className="h-3 w-3" />
                              {type.questions.length} pre-meeting question{type.questions.length !== 1 ? "s" : ""}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Type config panel */}
                  <Card className="h-fit">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {selectedType ? appointmentTypes.find(t => t.id === selectedType)?.name : "Type Configuration"}
                      </CardTitle>
                      <CardDescription>Define meeting settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Duration (minutes)</Label>
                        <Select defaultValue="30"><SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[15, 20, 25, 30, 45, 60, 90].map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Buffer Time</Label>
                        <Select defaultValue="10"><SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[0, 5, 10, 15, 30].map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Meeting Location</Label>
                        <Select defaultValue="zoom"><SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="zoom"><div className="flex items-center gap-2"><Video className="h-3 w-3" />Zoom</div></SelectItem>
                            <SelectItem value="meet"><div className="flex items-center gap-2"><Video className="h-3 w-3" />Google Meet</div></SelectItem>
                            <SelectItem value="phone"><div className="flex items-center gap-2"><Phone className="h-3 w-3" />Phone</div></SelectItem>
                            <SelectItem value="inperson"><div className="flex items-center gap-2"><MapPin className="h-3 w-3" />In-Person</div></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Host</Label>
                        <Input placeholder="Team member name" defaultValue="Sarah Johnson" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Team Assignment</Label>
                        <Select defaultValue="sales"><SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="consulting">Consulting</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                            <SelectItem value="engineering">Engineering</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-xs">Pre-Meeting Questions</Label>
                        <div className="space-y-1.5">
                          {["What's your biggest challenge?", "Team size?"].map((q, i) => (
                            <div key={i} className="flex items-center gap-1.5 group">
                              <Input value={q} className="h-7 text-xs flex-1" readOnly />
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></Button>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" className="w-full text-xs h-7"><Plus className="mr-1 h-3 w-3" /> Add Question</Button>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Send Confirmation Email</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Require Approval</Label>
                        <Switch />
                      </div>
                      <Button className="w-full" size="sm">Save Configuration</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ═══════════════ AVAILABILITY ═══════════════ */}
            {activeView === "availability" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    {/* Working Hours */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Working Hours</CardTitle>
                        <CardDescription>Define when you're available for meetings</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                          <div key={day} className="flex items-center gap-4 p-3 rounded-lg border">
                            <div className="w-24">
                              <p className="text-sm font-medium">{day}</p>
                            </div>
                            <Switch defaultChecked />
                            <div className="flex items-center gap-2 flex-1">
                              <Input type="time" defaultValue="09:00" className="h-8 text-xs w-28" />
                              <span className="text-xs text-muted-foreground">to</span>
                              <Input type="time" defaultValue="17:00" className="h-8 text-xs w-28" />
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs"><Plus className="h-3 w-3 mr-1" /> Add slot</Button>
                          </div>
                        ))}
                        {["Saturday", "Sunday"].map((day) => (
                          <div key={day} className="flex items-center gap-4 p-3 rounded-lg border opacity-60">
                            <div className="w-24"><p className="text-sm font-medium">{day}</p></div>
                            <Switch />
                            <p className="text-xs text-muted-foreground">Unavailable</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Team Round-Robin */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Team Round-Robin</CardTitle>
                        <CardDescription>Distribute meetings across team members</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { name: "Sarah Johnson", role: "Senior AE", load: 35, max: 40 },
                          { name: "Mike Chen", role: "Account Executive", load: 28, max: 35 },
                          { name: "Alex Rivera", role: "Consultant", load: 22, max: 30 },
                          { name: "Emily Park", role: "Support Lead", load: 18, max: 25 },
                        ].map((member) => (
                          <div key={member.name} className="flex items-center gap-4 p-3 rounded-lg border">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {member.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{member.name}</p>
                              <p className="text-[11px] text-muted-foreground">{member.role}</p>
                            </div>
                            <div className="w-32">
                              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                <span>{member.load} / {member.max} meetings</span>
                                <span>{Math.round(member.load / member.max * 100)}%</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(member.load / member.max) * 100}%` }} />
                              </div>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right column */}
                  <div className="space-y-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Time Zone</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Select defaultValue="est"><SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="est">Eastern Time (ET)</SelectItem>
                            <SelectItem value="cst">Central Time (CT)</SelectItem>
                            <SelectItem value="mst">Mountain Time (MT)</SelectItem>
                            <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                            <SelectItem value="utc">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Auto-detect attendee timezone</Label>
                          <Switch defaultChecked />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Daily Limits</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Max meetings per day</Label>
                          <Input type="number" defaultValue="8" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Min notice (hours)</Label>
                          <Input type="number" defaultValue="4" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Max advance booking (days)</Label>
                          <Input type="number" defaultValue="30" className="h-8 text-sm" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Vacation / Blocked Days</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {[
                          { label: "Spring Break", dates: "Mar 15 - 22" },
                          { label: "Company Retreat", dates: "Apr 5 - 7" },
                        ].map((v) => (
                          <div key={v.label} className="flex items-center justify-between p-2 rounded border text-xs">
                            <div><p className="font-medium">{v.label}</p><p className="text-muted-foreground">{v.dates}</p></div>
                            <Button variant="ghost" size="icon" className="h-6 w-6"><X className="h-3 w-3" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full text-xs"><Plus className="mr-1 h-3 w-3" /> Block Days</Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Priority Routing</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Route by lead score</Label>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">VIP auto-assign to senior AE</Label>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Existing customers → CSM</Label>
                          <Switch />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ BOOKING PAGES ═══════════════ */}
            {activeView === "booking" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Builder */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Booking Page Builder</h2>
                    <Card>
                      <CardContent className="p-5 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Page Title</Label>
                          <Input defaultValue="Schedule a Discovery Call" className="h-9" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Description</Label>
                          <Textarea defaultValue="Let's explore how we can help your team grow. Pick a time that works for you." className="text-sm" rows={3} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Host Profile</Label>
                          <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">SJ</div>
                            <div>
                              <p className="text-sm font-medium">Sarah Johnson</p>
                              <p className="text-xs text-muted-foreground">Senior Account Executive</p>
                            </div>
                            <Button variant="ghost" size="sm" className="ml-auto"><Edit3 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-xs">Form Fields</Label>
                          <div className="space-y-2">
                            {["Full Name", "Email Address", "Company", "Phone (optional)"].map((f, i) => (
                              <div key={i} className="flex items-center gap-2 p-2 border rounded group">
                                <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                                <span className="text-xs flex-1">{f}</span>
                                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></Button>
                              </div>
                            ))}
                            <Button variant="outline" size="sm" className="w-full text-xs"><Plus className="mr-1 h-3 w-3" /> Add Field</Button>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-xs">Branding</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Primary Color</Label>
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded border bg-violet-600" />
                                <Input defaultValue="#7C3AED" className="h-7 text-xs flex-1" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Background</Label>
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded border bg-background" />
                                <Input defaultValue="#FFFFFF" className="h-7 text-xs flex-1" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-xs">Embed Options</Label>
                          <div className="flex flex-wrap gap-2">
                            {["Portal", "Website", "Landing Page"].map((opt) => (
                              <Badge key={opt} variant="secondary" className="cursor-pointer hover:bg-primary/10 text-xs">{opt}</Badge>
                            ))}
                          </div>
                        </div>
                        <Button className="w-full" size="sm">Publish Booking Page</Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Live Preview */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Live Preview</h2>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm"><Copy className="mr-1 h-3 w-3" /> Copy Link</Button>
                        <Button variant="outline" size="sm"><ExternalLink className="mr-1 h-3 w-3" /> Open</Button>
                      </div>
                    </div>
                    <Card className="overflow-hidden">
                      <div className="bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-950/20 dark:to-blue-950/20 p-8">
                        <div className="max-w-sm mx-auto bg-background rounded-xl shadow-lg border overflow-hidden">
                          {/* Header */}
                          <div className="p-6 border-b">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">SJ</div>
                              <div>
                                <p className="font-semibold">Sarah Johnson</p>
                                <p className="text-xs text-muted-foreground">Senior Account Executive</p>
                              </div>
                            </div>
                            <h3 className="font-bold text-lg mb-1">Schedule a Discovery Call</h3>
                            <p className="text-sm text-muted-foreground">Let's explore how we can help your team grow.</p>
                            <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 30 min</span>
                              <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Zoom</span>
                            </div>
                          </div>
                          {/* Calendar mock */}
                          <div className="p-4">
                            <p className="text-xs font-medium mb-3">Select a date & time</p>
                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-2">
                              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                                <div key={i} className="text-muted-foreground font-medium p-1">{d}</div>
                              ))}
                              {Array.from({ length: 31 }, (_, i) => (
                                <div key={i} className={`p-1.5 rounded cursor-pointer transition-colors ${i === 8 ? "bg-primary text-primary-foreground font-bold" : i < 3 ? "text-muted-foreground/40" : "hover:bg-muted"}`}>
                                  {i + 1}
                                </div>
                              ))}
                            </div>
                            <div className="space-y-1.5 mt-3">
                              {["9:00 AM", "10:30 AM", "2:00 PM", "3:30 PM"].map((time) => (
                                <Button key={time} variant={time === "10:30 AM" ? "default" : "outline"} size="sm" className="w-full text-xs justify-start">
                                  <Clock className="mr-2 h-3 w-3" />{time}
                                </Button>
                              ))}
                            </div>
                          </div>
                          {/* Confirmation */}
                          <div className="p-4 border-t bg-muted/30">
                            <Button className="w-full" size="sm">Confirm Booking</Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ CRM INTEGRATION ═══════════════ */}
            {activeView === "crm" && (
              <div className="space-y-6">
                {/* Automation rules */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {[
                    { trigger: "New booking", action: "Create CRM contact", icon: UserCheck, active: true },
                    { trigger: "Meeting completed", action: "Update lifecycle stage", icon: RefreshCw, active: true },
                    { trigger: "No-show detected", action: "Flag contact in CRM", icon: AlertCircle, active: true },
                  ].map((rule, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <rule.icon className="h-5 w-5 text-primary" />
                          <Switch defaultChecked={rule.active} />
                        </div>
                        <p className="text-sm font-medium">{rule.trigger}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><ArrowRight className="h-3 w-3" /> {rule.action}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Contact table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Connected CRM Contacts</CardTitle>
                    <CardDescription>Contacts with appointment history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {crmContacts.map((c) => (
                        <div key={c.name} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {c.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.email} · {c.company}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-xs font-bold">{c.score}</p>
                              <p className="text-[10px] text-muted-foreground">Score</p>
                            </div>
                            <Badge variant={c.stage === "Opportunity" ? "default" : "secondary"} className="text-[10px]">{c.stage}</Badge>
                            <div className="text-center">
                              <p className="text-xs font-bold">{c.meetings}</p>
                              <p className="text-[10px] text-muted-foreground">Meetings</p>
                            </div>
                            <span className="text-[11px] text-muted-foreground">{c.lastMeeting}</span>
                            <Button variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═══════════════ REVPATH INTEGRATION ═══════════════ */}
            {activeView === "revpath" && (
              <div className="space-y-6">
                {/* Funnel */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Revenue Path — Meeting Impact</CardTitle>
                    <CardDescription>How appointments drive pipeline progression</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {funnelData.map((stage, i) => (
                        <div key={stage.stage} className="flex items-center gap-2">
                          <div className="text-center min-w-[140px]">
                            <div className="rounded-xl border p-4 bg-muted/30 hover:bg-muted/50 transition-colors" style={{ borderLeftWidth: 4, borderLeftColor: stage.fill }}>
                              <p className="text-2xl font-bold">{stage.value.toLocaleString()}</p>
                              <p className="text-xs font-medium mt-1">{stage.stage}</p>
                              {i > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {((stage.value / funnelData[i - 1].value) * 100).toFixed(0)}% conversion
                                </p>
                              )}
                            </div>
                          </div>
                          {i < funnelData.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {[
                    { label: "Meeting → Opportunity", value: "32.5%", change: "+4.2%", icon: Target },
                    { label: "Pipeline Generated", value: "$487K", change: "+$62K this month", icon: TrendingUp },
                    { label: "Revenue Attributed", value: "$133.5K", change: "From booked meetings", icon: Activity },
                  ].map((m) => (
                    <Card key={m.label}>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-muted-foreground font-medium">{m.label}</p>
                          <m.icon className="h-4 w-4 text-muted-foreground/60" />
                        </div>
                        <p className="text-2xl font-bold">{m.value}</p>
                        <p className="text-[11px] text-emerald-600 mt-1">{m.change}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Revenue trend */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Revenue Attribution Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v / 1000}K`} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1) / 0.15)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═══════════════ AI ASSISTANT ═══════════════ */}
            {activeView === "ai" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><Brain className="h-5 w-5 text-violet-500" /> AI Scheduling Intelligence</h2>
                    <div className="space-y-3">
                      {aiSuggestions.map((s, i) => (
                        <Card key={i} className={s.priority === "high" ? "border-violet-200 dark:border-violet-900/50" : ""}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${s.priority === "high" ? "bg-violet-100 dark:bg-violet-900/30" : "bg-muted"}`}>
                                <s.icon className={`h-4 w-4 ${s.priority === "high" ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold">{s.title}</p>
                                  <Badge variant={s.priority === "high" ? "destructive" : "secondary"} className="text-[9px] h-4">{s.priority}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                                <div className="flex gap-2 mt-3">
                                  <Button size="sm" variant="default" className="h-7 text-xs"><Check className="mr-1 h-3 w-3" /> Apply</Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs">Dismiss</Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* AI Stats */}
                  <div className="space-y-4">
                    <Card className="bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-950/20 dark:to-blue-950/20 border-violet-200 dark:border-violet-900/50">
                      <CardContent className="pt-5 pb-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-violet-500" />
                          <p className="font-semibold text-sm">AI Performance</p>
                        </div>
                        {[
                          { label: "No-shows predicted", value: "94% accuracy" },
                          { label: "Optimal times suggested", value: "156 this month" },
                          { label: "Follow-ups generated", value: "89 recommendations" },
                          { label: "Time saved", value: "12 hrs/week" },
                        ].map((stat) => (
                          <div key={stat.label} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{stat.label}</span>
                            <span className="font-medium">{stat.value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Ask AI</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Textarea placeholder="Ask anything about your scheduling data…" rows={3} className="text-sm" />
                        <Button className="w-full" size="sm"><Sparkles className="mr-2 h-3.5 w-3.5" /> Get Insights</Button>
                        <div className="space-y-1.5">
                          {["What's my best day for demos?", "Which leads are most likely to no-show?", "Optimize my calendar for next week"].map((q) => (
                            <Button key={q} variant="ghost" size="sm" className="w-full justify-start text-xs h-7 text-muted-foreground"><Lightbulb className="mr-2 h-3 w-3" />{q}</Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ AUTOMATIONS ═══════════════ */}
            {activeView === "automations" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Automation Workflows</h2>
                  <Button size="sm"><Plus className="mr-2 h-3.5 w-3.5" /> New Workflow</Button>
                </div>

                <div className="space-y-3">
                  {workflows.map((w) => (
                    <Card key={w.id} className={!w.active ? "opacity-60" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Zap className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs font-mono">{w.trigger}</Badge>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{w.action}</span>
                              </div>
                              {w.delay && <p className="text-[11px] text-muted-foreground mt-1"><Clock className="inline h-3 w-3 mr-1" />{w.delay}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Edit3 className="h-3 w-3" /></Button>
                            <Switch defaultChecked={w.active} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Visual flow */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Booking Lifecycle Flow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 overflow-x-auto pb-2">
                      {[
                        { label: "Booking Created", icon: CalendarClock, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
                        { label: "Confirmation Sent", icon: Mail, color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
                        { label: "Reminder (24h)", icon: Bell, color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
                        { label: "Reminder (1h)", icon: Bell, color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
                        { label: "Meeting Starts", icon: Play, color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" },
                        { label: "Post-Meeting", icon: CheckCircle2, color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
                        { label: "CRM Updated", icon: RefreshCw, color: "bg-primary/10 text-primary" },
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-3 shrink-0">
                          <div className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border min-w-[100px] ${step.color}`}>
                            <step.icon className="h-5 w-5" />
                            <p className="text-[10px] font-medium text-center leading-tight">{step.label}</p>
                          </div>
                          {i < 6 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═══════════════ ANALYTICS ═══════════════ */}
            {activeView === "analytics" && (
              <div className="space-y-6">
                {/* Top metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { label: "Total Booked", value: "1,285", icon: CalendarClock },
                    { label: "Attendance Rate", value: "91%", icon: UserCheck },
                    { label: "Conversion Rate", value: "38%", icon: Target },
                    { label: "Pipeline Impact", value: "$487K", icon: TrendingUp },
                    { label: "Revenue Generated", value: "$133.5K", icon: Activity },
                  ].map((m) => (
                    <Card key={m.label}>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] text-muted-foreground font-medium">{m.label}</p>
                          <m.icon className="h-4 w-4 text-muted-foreground/60" />
                        </div>
                        <p className="text-2xl font-bold">{m.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Monthly Appointments & Conversions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                          <Line type="monotone" dataKey="appointments" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Appointments" />
                          <Line type="monotone" dataKey="conversions" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Conversions" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Revenue from Meetings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v / 1000}K`} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                          <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3) / 0.15)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Type breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Performance by Appointment Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { type: "Discovery Call", booked: 450, attended: 412, converted: 165, revenue: "$49.5K", rate: "91.5%" },
                        { type: "Sales Demo", booked: 360, attended: 335, converted: 154, revenue: "$46.2K", rate: "93.1%" },
                        { type: "Strategy Session", booked: 231, attended: 210, converted: 109, revenue: "$32.7K", rate: "90.9%" },
                        { type: "Consultation", booked: 154, attended: 137, converted: 41, revenue: "$12.3K", rate: "89.0%" },
                        { type: "Technical Support", booked: 90, attended: 76, converted: 16, revenue: "$4.8K", rate: "84.4%" },
                      ].map((row) => (
                        <div key={row.type} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                          <p className="text-sm font-medium w-40">{row.type}</p>
                          <div className="flex-1 grid grid-cols-5 gap-4 text-center text-xs">
                            <div><p className="font-bold">{row.booked}</p><p className="text-muted-foreground text-[10px]">Booked</p></div>
                            <div><p className="font-bold">{row.attended}</p><p className="text-muted-foreground text-[10px]">Attended</p></div>
                            <div><p className="font-bold">{row.converted}</p><p className="text-muted-foreground text-[10px]">Converted</p></div>
                            <div><p className="font-bold">{row.revenue}</p><p className="text-muted-foreground text-[10px]">Revenue</p></div>
                            <div><Badge variant="secondary" className="text-[10px]">{row.rate}</Badge></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default AppointmentBuilder;
