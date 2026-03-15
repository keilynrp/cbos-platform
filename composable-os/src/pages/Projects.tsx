import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutGrid,
  CalendarRange,
  Clock,
  Users,
  FileText,
  Share2,
  Plus,
  MoreHorizontal,
  Timer,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Mock Data ---

const kanbanColumns = [
  {
    id: "backlog",
    title: "Backlog",
    color: "bg-muted-foreground/20",
    tasks: [
      {
        id: "t1",
        title: "Define API schema for event bus",
        priority: "medium",
        assignee: "AK",
        tags: [{ label: "API Gateway", type: "knowledge" }],
        timeEstimate: "4h",
      },
      {
        id: "t2",
        title: "Research vector DB options",
        priority: "low",
        assignee: "ML",
        tags: [{ label: "Architecture Doc", type: "document" }],
        timeEstimate: "8h",
      },
    ],
  },
  {
    id: "todo",
    title: "To Do",
    color: "bg-accent/20",
    tasks: [
      {
        id: "t3",
        title: "Design CRM pipeline view",
        priority: "high",
        assignee: "SR",
        tags: [
          { label: "CRM Spec", type: "document" },
          { label: "Sales Pipeline", type: "knowledge" },
        ],
        timeEstimate: "6h",
      },
      {
        id: "t4",
        title: "Create onboarding flow wireframes",
        priority: "medium",
        assignee: "AK",
        tags: [{ label: "UX Research", type: "knowledge" }],
        timeEstimate: "5h",
      },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    color: "bg-primary/20",
    tasks: [
      {
        id: "t5",
        title: "Implement knowledge graph traversal",
        priority: "high",
        assignee: "ML",
        tags: [
          { label: "Graph DB Spec", type: "document" },
          { label: "Neo4j", type: "knowledge" },
        ],
        timeEstimate: "12h",
        timeSpent: "7h",
      },
      {
        id: "t6",
        title: "Build analytics dashboard charts",
        priority: "medium",
        assignee: "JD",
        tags: [{ label: "Recharts", type: "knowledge" }],
        timeEstimate: "8h",
        timeSpent: "3h",
      },
    ],
  },
  {
    id: "review",
    title: "Review",
    color: "bg-[hsl(var(--cbs-amber))]/20",
    tasks: [
      {
        id: "t7",
        title: "Auth microservice integration",
        priority: "high",
        assignee: "SR",
        tags: [
          { label: "Auth Spec", type: "document" },
          { label: "OAuth2", type: "knowledge" },
        ],
        timeEstimate: "10h",
        timeSpent: "9h",
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    color: "bg-[hsl(var(--cbs-green))]/20",
    tasks: [
      {
        id: "t8",
        title: "Setup CI/CD pipeline",
        priority: "medium",
        assignee: "JD",
        tags: [{ label: "DevOps Doc", type: "document" }],
        timeEstimate: "6h",
        timeSpent: "6h",
      },
    ],
  },
];

const sprints = [
  {
    id: "s1",
    name: "Sprint 14 — Platform Core",
    startDate: "Mar 3",
    endDate: "Mar 14",
    progress: 62,
    totalTasks: 18,
    completedTasks: 11,
    status: "active" as const,
  },
  {
    id: "s2",
    name: "Sprint 15 — Integrations",
    startDate: "Mar 17",
    endDate: "Mar 28",
    progress: 0,
    totalTasks: 12,
    completedTasks: 0,
    status: "upcoming" as const,
  },
];

const teamMembers = [
  { initials: "AK", name: "Alex Kim", role: "Frontend", tasksActive: 3, hoursLogged: 28, capacity: 40 },
  { initials: "ML", name: "Maria Lopez", role: "Backend", tasksActive: 2, hoursLogged: 34, capacity: 40 },
  { initials: "SR", name: "Sam Rivera", role: "Full Stack", tasksActive: 2, hoursLogged: 22, capacity: 40 },
  { initials: "JD", name: "Jordan Davis", role: "DevOps", tasksActive: 2, hoursLogged: 31, capacity: 40 },
];

// --- Sub-components ---

const priorityColors: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/20",
  medium: "bg-[hsl(var(--cbs-amber))]/15 text-[hsl(var(--cbs-amber))] border-[hsl(var(--cbs-amber))]/20",
  low: "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))] border-[hsl(var(--cbs-green))]/20",
};

const tagIcons: Record<string, typeof FileText> = {
  document: FileText,
  knowledge: Share2,
};

function TaskCard({ task }: { task: (typeof kanbanColumns)[0]["tasks"][0] }) {
  return (
    <Card className="group cursor-pointer border border-border/60 shadow-sm hover:shadow-md transition-all hover:border-primary/30 bg-card">
      <CardContent className="p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Tags — linked docs & knowledge entities */}
        <div className="flex flex-wrap gap-1.5">
          {task.tags.map((tag) => {
            const Icon = tagIcons[tag.type] || FileText;
            return (
              <span
                key={tag.label}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                  tag.type === "document"
                    ? "bg-[hsl(var(--cbs-blue-light))] text-accent border-accent/20"
                    : "bg-[hsl(var(--cbs-purple-light))] text-primary border-primary/20"
                }`}
              >
                <Icon className="h-3 w-3" />
                {tag.label}
              </span>
            );
          })}
        </div>

        {/* Footer: priority, time, assignee */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority]}`}>
              {task.priority}
            </Badge>
            {task.timeEstimate && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <Timer className="h-3 w-3" />
                {(task as any).timeSpent ? `${(task as any).timeSpent}/${task.timeEstimate}` : task.timeEstimate}
              </span>
            )}
          </div>
          <Avatar className="h-6 w-6 text-[10px]">
            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{task.assignee}</AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanBoard() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
      {kanbanColumns.map((col) => (
        <div key={col.id} className="min-w-[272px] w-[272px] shrink-0 space-y-3">
          {/* Column header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
              <span className="text-sm font-semibold">{col.title}</span>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {col.tasks.length}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {/* Tasks */}
          <div className="space-y-2.5">
            {col.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SprintPlanning() {
  return (
    <div className="space-y-4">
      {sprints.map((sprint) => (
        <Card key={sprint.id} className="border border-border/60">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  {sprint.name}
                  <Badge
                    variant={sprint.status === "active" ? "default" : "secondary"}
                    className="text-[10px] px-2 py-0"
                  >
                    {sprint.status}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sprint.startDate} — {sprint.endDate}
                </p>
              </div>
              <span className="text-sm font-semibold text-primary">{sprint.progress}%</span>
            </div>
            <Progress value={sprint.progress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {sprint.completedTasks} of {sprint.totalTasks} tasks completed
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                View tasks <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TeamWorkload() {
  return (
    <div className="space-y-3">
      {teamMembers.map((m) => {
        const pct = Math.round((m.hoursLogged / m.capacity) * 100);
        return (
          <div key={m.initials} className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{m.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.hoursLogged}h / {m.capacity}h</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Main Page ---

const Projects = () => {
  const [activeTab, setActiveTab] = useState("kanban");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kanban boards, sprints, and task tracking — connected to your knowledge graph.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="kanban" className="gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" /> Board
          </TabsTrigger>
          <TabsTrigger value="sprints" className="gap-1.5">
            <CalendarRange className="h-3.5 w-3.5" /> Sprints
          </TabsTrigger>
          <TabsTrigger value="time" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Time Tracking
          </TabsTrigger>
          <TabsTrigger value="workload" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Workload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          <KanbanBoard />
        </TabsContent>

        <TabsContent value="sprints" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SprintPlanning />
            </div>
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Sprint Velocity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { sprint: "Sprint 12", pts: 34 },
                  { sprint: "Sprint 13", pts: 41 },
                  { sprint: "Sprint 14", pts: 28 },
                ].map((s) => (
                  <div key={s.sprint} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{s.sprint}</span>
                      <span className="font-medium">{s.pts} pts</span>
                    </div>
                    <Progress value={(s.pts / 50) * 100} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="time" className="mt-4">
          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Time Tracking Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "This Week", value: "86h", sub: "across 4 members" },
                  { label: "Billable", value: "72h", sub: "84% utilization" },
                  { label: "Avg / Person", value: "21.5h", sub: "target: 30h" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-muted/50 p-4 text-center">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.sub}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workload" className="mt-4">
          <Card className="border border-border/60">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Team Workload</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamWorkload />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Projects;
