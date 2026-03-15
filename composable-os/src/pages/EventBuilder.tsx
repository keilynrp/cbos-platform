import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  Users,
  TrendingUp,
  Sparkles,
  Plus,
  Video,
  BookOpen,
  Presentation,
  GraduationCap,
  Coffee,
  Rocket,
  ArrowRight,
  MapPin,
  Clock,
  DollarSign,
  Target,
  Zap,
  BarChart3,
  CheckCircle2,
  User,
  Building,
  Mail,
  MessageSquare,
  Eye,
  UserCheck,
  Award,
  FileText,
  Download,
  Settings,
  ChevronRight,
  TrendingDown,
  Send,
  AlertCircle,
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Mock data for upcoming events
const upcomingEvents = [
  {
    id: 1,
    title: "SaaS Revenue Operations Summit",
    date: "2024-03-25",
    time: "10:00 AM EST",
    type: "Virtual summit",
    registrations: 342,
    capacity: 500,
    revenue: "$51,300",
    status: "live",
  },
  {
    id: 2,
    title: "Growth Marketing Workshop",
    date: "2024-03-28",
    time: "2:00 PM EST",
    type: "Workshop",
    registrations: 87,
    capacity: 100,
    revenue: "$8,700",
    status: "upcoming",
  },
  {
    id: 3,
    title: "Data-Driven Decision Making",
    date: "2024-04-02",
    time: "11:00 AM EST",
    type: "Webinar",
    registrations: 234,
    capacity: 300,
    revenue: "$0",
    status: "upcoming",
  },
];

// Mock data for analytics
const registrationTrends = [
  { date: "Mar 1", registrations: 45, attended: 38 },
  { date: "Mar 5", registrations: 72, attended: 65 },
  { date: "Mar 10", registrations: 120, attended: 98 },
  { date: "Mar 15", registrations: 185, attended: 156 },
  { date: "Mar 20", registrations: 256, attended: 218 },
  { date: "Mar 25", registrations: 342, attended: 289 },
];

const eventTypeDistribution = [
  { name: "Webinar", value: 35, color: "hsl(var(--primary))" },
  { name: "Workshop", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Conference", value: 20, color: "hsl(var(--chart-3))" },
  { name: "Training", value: 12, color: "hsl(var(--chart-4))" },
  { name: "Meetup", value: 8, color: "hsl(var(--chart-5))" },
];

const revenueAttribution = [
  { stage: "Traffic", value: 5000, conversion: 100 },
  { stage: "Registration", value: 850, conversion: 17 },
  { stage: "Attendee", value: 680, conversion: 80 },
  { stage: "Opportunity", value: 245, conversion: 36 },
  { stage: "Customer", value: 89, conversion: 36 },
];

const personaEngagement = [
  { persona: "Founder", events: 45, avgScore: 92 },
  { persona: "CMO", events: 38, avgScore: 88 },
  { persona: "Growth Marketer", events: 67, avgScore: 85 },
  { persona: "Data Analyst", events: 29, avgScore: 79 },
  { persona: "Product Manager", events: 41, avgScore: 83 },
];

// Event creation wizard steps
const eventTypes = [
  { id: "webinar", icon: Video, label: "Webinar", desc: "Live online presentation" },
  { id: "workshop", icon: BookOpen, label: "Workshop", desc: "Interactive training session" },
  { id: "conference", icon: Presentation, label: "Conference", desc: "Multi-day event" },
  { id: "training", icon: GraduationCap, label: "Training", desc: "Educational course" },
  { id: "meetup", icon: Coffee, label: "Community Meetup", desc: "Casual networking" },
  { id: "summit", icon: Rocket, label: "Virtual Summit", desc: "Large-scale virtual event" },
];

const personas = [
  { id: "founder", name: "Founder", goals: "Scale business", pain: "Limited resources", industry: "SaaS" },
  { id: "cmo", name: "CMO", goals: "Drive growth", pain: "Attribution complexity", industry: "Enterprise" },
  { id: "growth", name: "Growth Marketer", goals: "Optimize funnel", pain: "Data silos", industry: "Tech" },
  { id: "analyst", name: "Data Analyst", goals: "Insights generation", pain: "Tool fragmentation", industry: "Analytics" },
  { id: "pm", name: "Product Manager", goals: "Product adoption", pain: "User feedback gaps", industry: "Software" },
];

const revPathStages = [
  { id: "tofu", label: "TOFU", desc: "Top of Funnel - Awareness", example: "Free webinar" },
  { id: "mofu", label: "MOFU", desc: "Middle of Funnel - Consideration", example: "Product workshop" },
  { id: "bofu", label: "BOFU", desc: "Bottom of Funnel - Decision", example: "Executive demo" },
];

const aiSuggestions = [
  { id: 1, icon: Sparkles, title: "Create webinar for SaaS founders", desc: "Topic: Revenue operations strategies for scaling startups", confidence: 95 },
  { id: 2, icon: Target, title: "Host data science workshop", desc: "Agenda: ML model deployment best practices", confidence: 88 },
  { id: 3, icon: Users, title: "Virtual summit for CMOs", desc: "Theme: Marketing attribution in multi-channel campaigns", confidence: 92 },
  { id: 4, icon: Rocket, title: "Growth hacking training", desc: "Focus: Conversion rate optimization techniques", confidence: 85 },
];

const automationWorkflows = [
  {
    id: 1,
    trigger: "Event Registration",
    actions: ["Create CRM Contact", "Send Welcome Email", "Tag Persona"],
    status: "active",
  },
  {
    id: 2,
    trigger: "Session Attendance",
    actions: ["Increase Lead Score +10", "Add to Nurture Campaign"],
    status: "active",
  },
  {
    id: 3,
    trigger: "High Engagement (3+ sessions)",
    actions: ["Notify Sales Team", "Schedule Follow-up Call"],
    status: "active",
  },
  {
    id: 4,
    trigger: "Missed Session",
    actions: ["Send Replay Link", "Offer Rescheduling"],
    status: "paused",
  },
];

const mockSpeakers = [
  { id: 1, name: "Sarah Chen", title: "VP of Marketing", company: "TechCorp", bio: "10+ years in SaaS growth" },
  { id: 2, name: "Michael Rodriguez", title: "Chief Revenue Officer", company: "DataScale", bio: "Revenue operations expert" },
  { id: 3, name: "Emily Watson", title: "Head of Growth", company: "StartupHub", bio: "Growth hacking specialist" },
];

const mockSessions = [
  { id: 1, time: "10:00 AM", title: "Keynote: Future of Revenue Operations", speaker: "Sarah Chen", duration: "45 min" },
  { id: 2, time: "11:00 AM", title: "Workshop: Data-Driven Decision Making", speaker: "Michael Rodriguez", duration: "60 min" },
  { id: 3, time: "1:00 PM", title: "Panel: Scaling Marketing Teams", speaker: "Emily Watson", duration: "45 min" },
  { id: 4, time: "2:30 PM", title: "Q&A: Best Practices", speaker: "All Speakers", duration: "30 min" },
];

const mockAttendees = [
  { id: 1, name: "John Smith", email: "john@company.com", company: "Acme Corp", score: 85, persona: "Founder" },
  { id: 2, name: "Lisa Johnson", email: "lisa@startup.io", company: "Startup.io", score: 92, persona: "CMO" },
  { id: 3, name: "David Lee", email: "david@techco.com", company: "TechCo", score: 78, persona: "Growth Marketer" },
];

export default function EventBuilder() {
  const [view, setView] = useState<"dashboard" | "create" | "manage" | "analytics">("dashboard");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [eventFormData, setEventFormData] = useState({
    type: "",
    persona: "",
    revPath: "",
    title: "",
    description: "",
    date: "",
    time: "",
    capacity: "",
  });

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Event Intelligence Center</h1>
          <p className="text-muted-foreground mt-1">Design, manage and optimize events that drive revenue</p>
        </div>
        <Button onClick={() => setView("create")} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">24</div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500 font-medium">+18%</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">663</div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500 font-medium">+24%</span>
              <span className="text-muted-foreground">this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Attributed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">$60K</div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500 font-medium">+32%</span>
              <span className="text-muted-foreground">pipeline value</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">84%</div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500 font-medium">+5%</span>
              <span className="text-muted-foreground">vs target</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedEvent(event);
                    setView("manage");
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-foreground">{event.title}</h4>
                        <Badge variant={event.status === "live" ? "default" : "secondary"}>
                          {event.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {event.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {event.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          {event.type}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Registrations</div>
                      <div className="font-semibold text-foreground">
                        {event.registrations}/{event.capacity}
                      </div>
                      <Progress value={(event.registrations / event.capacity) * 100} className="h-1 mt-2" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Revenue</div>
                      <div className="font-semibold text-green-600">{event.revenue}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Capacity</div>
                      <div className="font-semibold text-foreground">
                        {Math.round((event.registrations / event.capacity) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Recommendations
            </CardTitle>
            <CardDescription>Suggested events based on your data</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {aiSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <suggestion.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm text-foreground mb-1">{suggestion.title}</h5>
                        <p className="text-xs text-muted-foreground mb-2">{suggestion.desc}</p>
                        <div className="flex items-center gap-2">
                          <Progress value={suggestion.confidence} className="h-1" />
                          <span className="text-xs font-medium text-muted-foreground">{suggestion.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Registration & Attendance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={registrationTrends}>
                <defs>
                  <linearGradient id="registrations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="attended" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="registrations" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#registrations)" />
                <Area type="monotone" dataKey="attended" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#attended)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Event Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={eventTypeDistribution} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={(entry) => entry.name}>
                  {eventTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Attribution Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Path Funnel</CardTitle>
            <CardDescription>Traffic → Registration → Attendee → Opportunity → Customer</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueAttribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="stage" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Persona Engagement */}
        <Card>
          <CardHeader>
            <CardTitle>Persona Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={personaEngagement}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="persona" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="events" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Events Attended" />
                <Bar dataKey="avgScore" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Avg Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Automation Workflows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Automation Workflows
          </CardTitle>
          <CardDescription>Connected to CRM and marketing systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automationWorkflows.map((workflow) => (
              <div key={workflow.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
                    {workflow.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Trigger</div>
                      <div className="font-medium text-sm text-foreground">{workflow.trigger}</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Actions</div>
                    {workflow.actions.map((action, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-foreground">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCreateWizard = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => setView("dashboard")} className="mb-4">
          ← Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Create New Event</h1>
        <p className="text-muted-foreground mt-1">Design events that drive revenue and engagement</p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step <= wizardStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step}
                </div>
                {step < 6 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      step < wizardStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-foreground">
              {wizardStep === 1 && "Select Event Type"}
              {wizardStep === 2 && "Choose Audience Persona"}
              {wizardStep === 3 && "Map Revenue Path"}
              {wizardStep === 4 && "Define Event Content"}
              {wizardStep === 5 && "Configure Portal Experience"}
              {wizardStep === 6 && "Launch & Registration"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {wizardStep === 1 && "What type of event would you like to create?"}
              {wizardStep === 2 && "Select the target persona for this event"}
              {wizardStep === 3 && "Position this event in your revenue funnel"}
              {wizardStep === 4 && "Set up agenda, speakers, and sessions"}
              {wizardStep === 5 && "Design the event portal experience"}
              {wizardStep === 6 && "Review and launch your event"}
            </p>
          </div>

          {/* Step Content */}
          {wizardStep === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {eventTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-6 border-2 rounded-lg cursor-pointer transition-all hover:border-primary ${
                    eventFormData.type === type.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => setEventFormData({ ...eventFormData, type: type.id })}
                >
                  <type.icon className="h-8 w-8 mb-3 text-primary" />
                  <h4 className="font-semibold text-foreground mb-1">{type.label}</h4>
                  <p className="text-xs text-muted-foreground">{type.desc}</p>
                </div>
              ))}
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              {personas.map((persona) => (
                <div
                  key={persona.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary ${
                    eventFormData.persona === persona.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => setEventFormData({ ...eventFormData, persona: persona.id })}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-2">{persona.name}</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Goals:</span>
                          <p className="text-foreground font-medium">{persona.goals}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pain Points:</span>
                          <p className="text-foreground font-medium">{persona.pain}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Industry:</span>
                          <p className="text-foreground font-medium">{persona.industry}</p>
                        </div>
                      </div>
                    </div>
                    {eventFormData.persona === persona.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4 mb-8">
                {["Traffic", "Registration", "Attendee", "Opportunity", "Customer"].map((stage, idx) => (
                  <div key={stage} className="flex items-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <span className="text-sm font-semibold text-primary">{stage}</span>
                      </div>
                    </div>
                    {idx < 4 && <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {revPathStages.map((stage) => (
                  <div
                    key={stage.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary ${
                      eventFormData.revPath === stage.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => setEventFormData({ ...eventFormData, revPath: stage.id })}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge className="mb-2">{stage.label}</Badge>
                        <h4 className="font-semibold text-foreground">{stage.desc}</h4>
                        <p className="text-sm text-muted-foreground mt-1">Example: {stage.example}</p>
                      </div>
                      {eventFormData.revPath === stage.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    placeholder="SaaS Revenue Operations Summit"
                    value={eventFormData.title}
                    onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[100px] p-3 border rounded-lg bg-background text-foreground"
                    placeholder="Describe your event..."
                    value={eventFormData.description}
                    onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Event Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={eventFormData.date}
                      onChange={(e) => setEventFormData({ ...eventFormData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">Start Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={eventFormData.time}
                      onChange={(e) => setEventFormData({ ...eventFormData, time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="capacity">Max Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="500"
                    value={eventFormData.capacity}
                    onChange={(e) => setEventFormData({ ...eventFormData, capacity: e.target.value })}
                  />
                </div>
              </div>

              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI-Generated Agenda Suggestion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="font-medium text-foreground">10:00 AM</span> - Opening Keynote: The Future of Revenue Operations
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="font-medium text-foreground">11:00 AM</span> - Workshop: Building Your RevOps Stack
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="font-medium text-foreground">1:00 PM</span> - Panel: Scaling Revenue Teams
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {wizardStep === 5 && (
            <div className="space-y-6">
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm">Portal Preview</CardTitle>
                  <CardDescription>Automatically generated using Portal Builder</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 rounded-lg overflow-hidden bg-background">
                    {/* Mock Portal Preview */}
                    <div className="bg-gradient-to-r from-primary/20 to-chart-2/20 p-8 text-center">
                      <h2 className="text-2xl font-bold text-foreground mb-2">{eventFormData.title || "Your Event Title"}</h2>
                      <p className="text-muted-foreground mb-4">{eventFormData.description || "Event description will appear here"}</p>
                      <div className="flex items-center justify-center gap-6 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {eventFormData.date || "Select date"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {eventFormData.time || "Select time"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {eventFormData.capacity || "0"} seats
                        </span>
                      </div>
                      <Button className="mt-6">Register Now</Button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Event Features</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-foreground">Event landing page</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-foreground">Registration form</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-foreground">Agenda page</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-foreground">Speaker profiles</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-foreground">Session rooms</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-foreground">Resource downloads</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {wizardStep === 6 && (
            <div className="space-y-6">
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2">Event Ready to Launch!</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Your event portal is configured and ready. Review the details below and launch when ready.
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-medium text-foreground capitalize">{eventFormData.type || "Not selected"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Persona:</span>
                          <p className="font-medium text-foreground capitalize">{eventFormData.persona || "Not selected"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Revenue Stage:</span>
                          <p className="font-medium text-foreground uppercase">{eventFormData.revPath || "Not selected"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Capacity:</span>
                          <p className="font-medium text-foreground">{eventFormData.capacity || "0"} attendees</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Automated Workflows Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                      <Zap className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Registration → CRM Integration</p>
                        <p className="text-xs text-muted-foreground">New attendees automatically added to CRM</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <Zap className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Lead Scoring Active</p>
                        <p className="text-xs text-muted-foreground">Engagement tracked and scored automatically</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <Zap className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">Sales Notifications</p>
                        <p className="text-xs text-muted-foreground">High-value leads trigger sales alerts</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
              disabled={wizardStep === 1}
            >
              Previous
            </Button>
            {wizardStep < 6 ? (
              <Button
                onClick={() => setWizardStep(Math.min(6, wizardStep + 1))}
              >
                Next Step
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => {
                setView("dashboard");
                setWizardStep(1);
              }}>
                Launch Event
                <Rocket className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderEventManagement = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => setView("dashboard")} className="mb-4">
          ← Back to Dashboard
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{selectedEvent?.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {selectedEvent?.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {selectedEvent?.time}
              </span>
              <Badge variant={selectedEvent?.status === "live" ? "default" : "secondary"}>
                {selectedEvent?.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button>
              <Eye className="h-4 w-4 mr-2" />
              View Portal
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="speakers">Speakers</TabsTrigger>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
          <TabsTrigger value="portal">Portal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{selectedEvent?.registrations}</div>
                <Progress value={(selectedEvent?.registrations / selectedEvent?.capacity) * 100} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedEvent?.capacity - selectedEvent?.registrations} seats remaining
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Expected Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{selectedEvent?.revenue}</div>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500 font-medium">+15%</span>
                  <span className="text-muted-foreground">vs forecast</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">CRM Leads Generated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">289</div>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <UserCheck className="h-3 w-3 text-primary" />
                  <span className="text-foreground">84% qualified</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Lead Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">87</div>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <Award className="h-3 w-3 text-primary" />
                  <span className="text-foreground">High engagement</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CRM Integration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                CRM Integration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Lead Classification</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Hot Leads</span>
                      <span className="font-medium text-foreground">42</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Warm Leads</span>
                      <span className="font-medium text-foreground">156</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cold Leads</span>
                      <span className="font-medium text-foreground">91</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-3">Persona Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Founders</span>
                      <span className="font-medium text-foreground">98</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">CMOs</span>
                      <span className="font-medium text-foreground">76</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Growth Marketers</span>
                      <span className="font-medium text-foreground">115</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-3">Automation Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-foreground">Auto-sync enabled</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-foreground">Lead scoring active</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-foreground">Sales alerts enabled</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RevPath Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Revenue Path Performance
              </CardTitle>
              <CardDescription>Traffic → Registration → Attendee → Opportunity → Customer</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueAttribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="stage" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-5 gap-4 mt-6">
                {revenueAttribution.map((stage) => (
                  <div key={stage.stage} className="text-center">
                    <div className="text-2xl font-bold text-foreground">{stage.conversion}%</div>
                    <div className="text-xs text-muted-foreground">{stage.stage} Conv.</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Event Schedule</CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Session
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockSessions.map((session) => (
                  <div key={session.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="text-center min-w-[80px]">
                      <div className="font-semibold text-foreground">{session.time}</div>
                      <div className="text-xs text-muted-foreground">{session.duration}</div>
                    </div>
                    <Separator orientation="vertical" className="h-12" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{session.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">Speaker: {session.speaker}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="speakers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Event Speakers</CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Speaker
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockSpeakers.map((speaker) => (
                  <div key={speaker.id} className="p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {speaker.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground">{speaker.name}</h4>
                        <p className="text-sm text-muted-foreground">{speaker.title}</p>
                        <p className="text-sm text-muted-foreground">{speaker.company}</p>
                        <p className="text-xs text-muted-foreground mt-2">{speaker.bio}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendees" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Event Attendees</CardTitle>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search attendees..." className="w-64" />
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAttendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {attendee.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-foreground">{attendee.name}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {attendee.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {attendee.company}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">Lead Score: {attendee.score}</div>
                        <Badge variant="secondary" className="mt-1">{attendee.persona}</Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portal" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Event Portal</CardTitle>
                  <CardDescription>Powered by Portal Builder integration</CardDescription>
                </div>
                <Button>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Portal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border-2 rounded-lg overflow-hidden">
                {/* Mock Portal Preview */}
                <div className="bg-gradient-to-r from-primary/20 to-chart-2/20 p-12 text-center">
                  <h2 className="text-3xl font-bold text-foreground mb-3">{selectedEvent?.title}</h2>
                  <div className="flex items-center justify-center gap-8 text-sm mb-6">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {selectedEvent?.date}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {selectedEvent?.time}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Virtual Event
                    </span>
                  </div>
                  <Button size="lg">Register Now</Button>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Registration Form</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      Capture attendee details with custom fields
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Agenda & Sessions</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      Interactive schedule with session details
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Speaker Profiles</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      Professional bios and social links
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium text-foreground text-sm">Portal Live</p>
                        <p className="text-xs text-muted-foreground">Accepting registrations</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground text-sm">CRM Sync Active</p>
                        <p className="text-xs text-muted-foreground">Real-time lead capture</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {view === "dashboard" && renderDashboard()}
      {view === "create" && renderCreateWizard()}
      {view === "manage" && renderEventManagement()}
    </div>
  );
}
