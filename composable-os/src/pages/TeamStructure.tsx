import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Crown, Code2, Palette, Server, Brain, Globe, ChevronDown, ChevronRight,
  ArrowRight, Users, Lightbulb, Database, Shield, BarChart3, BookOpen, Cpu
} from "lucide-react";

type Role = {
  title: string;
  responsibilities: string[];
  skills: string[];
};

type Level = {
  id: string;
  label: string;
  title: string;
  icon: React.ElementType;
  colorClass: string;
  badgeClass: string;
  borderClass: string;
  roles: Role[];
};

const levels: Level[] = [
  {
    id: "leadership",
    label: "Level 1",
    title: "Strategic Leadership",
    icon: Crown,
    colorClass: "bg-green-500/10 dark:bg-green-500/20",
    badgeClass: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
    borderClass: "border-green-500/30",
    roles: [
      {
        title: "Platform Architect / System Architect",
        responsibilities: [
          "Define global platform architecture",
          "Maintain modular boundaries",
          "Design capability model",
          "Guide system evolution",
          "Prevent architectural drift",
        ],
        skills: [
          "Distributed Systems Architecture",
          "Platform Engineering",
          "Domain-Driven Design",
          "Event-Driven Architecture",
          "Systems Thinking",
        ],
      },
      {
        title: "Head of Product / Product Strategy",
        responsibilities: [
          "Define product roadmap",
          "Identify market wedge",
          "Validate customer problems",
          "Prioritize features",
          "Align engineering and business strategy",
        ],
        skills: [
          "SaaS Product Strategy",
          "Customer Discovery",
          "Product Lifecycle Management",
          "Growth Strategy",
        ],
      },
      {
        title: "Technical Program Manager",
        responsibilities: [
          "Coordinate engineering teams",
          "Manage delivery roadmap",
          "Track technical dependencies",
          "Ensure cross-team communication",
        ],
        skills: [
          "Agile Project Management",
          "Software Delivery Management",
          "Engineering Coordination",
        ],
      },
    ],
  },
  {
    id: "platform-eng",
    label: "Level 2",
    title: "Platform Engineering",
    icon: Code2,
    colorClass: "bg-blue-500/10 dark:bg-blue-500/20",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    borderClass: "border-blue-500/30",
    roles: [
      {
        title: "Backend Platform Engineers",
        responsibilities: [
          "Build APIs",
          "Implement business capabilities",
          "Implement workflows",
          "Develop module logic",
          "Integrate system components",
        ],
        skills: [
          "Python / Go / TypeScript",
          "FastAPI / NestJS",
          "Distributed Systems",
          "API Design",
          "Event-Driven Systems",
          "Database Design",
        ],
      },
      {
        title: "Distributed Systems Engineer",
        responsibilities: [
          "Design event architecture",
          "Ensure reliability and scalability",
          "Implement messaging systems",
          "Design data consistency strategies",
        ],
        skills: [
          "Kafka / NATS / RabbitMQ",
          "CQRS",
          "Event Sourcing",
          "Distributed Architecture",
        ],
      },
      {
        title: "Data Engineer / AI Engineer",
        responsibilities: [
          "Build data pipelines",
          "Implement decision intelligence layer",
          "Integrate LLM APIs",
          "Develop predictive models",
        ],
        skills: ["Python", "Machine Learning", "Vector Databases", "Data Engineering", "Feature Engineering"],
      },
      {
        title: "Data Architect",
        responsibilities: [
          "Define global data model",
          "Manage knowledge graph",
          "Design data governance",
          "Ensure consistency across modules",
        ],
        skills: ["SQL", "Graph Databases", "Data Modeling", "Semantic Architecture"],
      },
    ],
  },
  {
    id: "experience",
    label: "Level 3",
    title: "Experience Engineering",
    icon: Palette,
    colorClass: "bg-yellow-500/10 dark:bg-yellow-500/20",
    badgeClass: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    borderClass: "border-yellow-500/30",
    roles: [
      {
        title: "Frontend Platform Engineer",
        responsibilities: [
          "Build portal builder interfaces",
          "Develop dashboards",
          "Implement dynamic UI components",
          "Connect UI with APIs",
        ],
        skills: ["React", "Next.js", "TypeScript", "Component Architecture"],
      },
      {
        title: "UX / Product Designer",
        responsibilities: [
          "Design platform UX",
          "Create onboarding experiences",
          "Design low-code interfaces",
          "Ensure usability of complex systems",
        ],
        skills: ["Product Design", "SaaS UX", "Design Systems", "Interaction Design"],
      },
    ],
  },
  {
    id: "infra",
    label: "Level 4",
    title: "Infrastructure & Operations",
    icon: Server,
    colorClass: "bg-teal-500/10 dark:bg-teal-500/20",
    badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
    borderClass: "border-teal-500/30",
    roles: [
      {
        title: "DevOps / Infrastructure Engineer",
        responsibilities: [
          "Manage deployment infrastructure",
          "Implement CI/CD pipelines",
          "Monitor system health",
          "Maintain cloud infrastructure",
        ],
        skills: ["Docker", "Kubernetes", "Terraform", "Cloud Architecture", "Observability Tools"],
      },
      {
        title: "Security Engineer",
        responsibilities: [
          "Authentication and authorization systems",
          "Platform security",
          "Compliance and audit",
          "Identity management",
        ],
        skills: ["OAuth / OpenID", "IAM Systems", "Secure Architecture", "Cloud Security"],
      },
    ],
  },
  {
    id: "intelligence",
    label: "Level 5",
    title: "Advanced Intelligence",
    icon: Brain,
    colorClass: "bg-orange-500/10 dark:bg-orange-500/20",
    badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
    borderClass: "border-orange-500/30",
    roles: [
      {
        title: "Decision Science / Simulation Engineer",
        responsibilities: [
          "Monte Carlo simulations",
          "Forecasting models",
          "Scenario analysis",
          "Probabilistic decision support",
        ],
        skills: ["Statistics", "Python", "Simulation Modeling", "Risk Analysis"],
      },
      {
        title: "Knowledge Graph Engineer",
        responsibilities: [
          "Design graph-based knowledge model",
          "Manage entity relationships",
          "Enable contextual reasoning",
        ],
        skills: ["Graph Databases", "Ontology Design", "Semantic Modeling"],
      },
    ],
  },
  {
    id: "ecosystem",
    label: "Level 6",
    title: "Platform Ecosystem",
    icon: Globe,
    colorClass: "bg-gray-500/10 dark:bg-gray-500/20",
    badgeClass: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
    borderClass: "border-gray-500/30",
    roles: [
      {
        title: "Developer Experience Engineer",
        responsibilities: ["SDKs", "Developer APIs", "Developer documentation", "Ecosystem tooling"],
        skills: ["API Design", "Developer Platforms", "Documentation Systems"],
      },
      {
        title: "Technical Writer",
        responsibilities: [
          "Architecture documentation",
          "API documentation",
          "Developer guides",
          "Onboarding materials",
        ],
        skills: ["Technical Writing", "Developer Documentation", "System Explanation"],
      },
    ],
  },
];

type Connection = { from: string; to: string; label: string };

const connections: Connection[] = [
  { from: "Platform Architect", to: "All Engineering Teams", label: "Architecture guidance" },
  { from: "Product Strategy", to: "Platform Architect", label: "Roadmap alignment" },
  { from: "Data / AI Engineers", to: "Decision Intelligence Layer", label: "Intelligence pipeline" },
  { from: "DevOps", to: "All Engineering Teams", label: "Infrastructure support" },
  { from: "UX Designers", to: "Frontend Engineers", label: "Design handoff" },
  { from: "Knowledge Graph Engineer", to: "Data Architect", label: "Semantic alignment" },
];

const domainLegend = [
  { label: "Platform Architecture", colorClass: "bg-primary/80" },
  { label: "Engineering", colorClass: "bg-blue-500" },
  { label: "Product & Strategy", colorClass: "bg-green-500" },
  { label: "Data / AI", colorClass: "bg-orange-500" },
  { label: "Infrastructure / DevOps", colorClass: "bg-teal-500" },
  { label: "Design & UX", colorClass: "bg-yellow-500" },
  { label: "Governance & Ops", colorClass: "bg-gray-500" },
];

function RoleCard({ role, badgeClass }: { role: Role; badgeClass: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-md border-border/60 bg-card"
      onClick={() => setOpen(!open)}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug">{role.title}</CardTitle>
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
          )}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="p-4 pt-0 space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Responsibilities
            </p>
            <ul className="space-y-1">
              {role.responsibilities.map((r) => (
                <li key={r} className="text-xs text-foreground/80 flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Key Skills
            </p>
            <div className="flex flex-wrap gap-1">
              {role.skills.map((s) => (
                <Badge key={s} variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${badgeClass}`}>
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function TeamStructure() {
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set(["leadership"]));

  const toggleLevel = (id: string) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalRoles = levels.reduce((sum, l) => sum + l.roles.length, 0);

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Composable Business OS — Core Platform Team Structure
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Roles, Skills and Responsibilities Required to Build a Composable Enterprise Platform
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Levels", value: levels.length, icon: BarChart3 },
            { label: "Roles", value: totalRoles, icon: Users },
            { label: "Domains", value: domainLegend.length, icon: Lightbulb },
            { label: "Connections", value: connections.length, icon: ArrowRight },
            { label: "Skills", value: levels.reduce((s, l) => s + l.roles.reduce((a, r) => a + r.skills.length, 0), 0), icon: Cpu },
            { label: "Capabilities", value: levels.reduce((s, l) => s + l.roles.reduce((a, r) => a + r.responsibilities.length, 0), 0), icon: BookOpen },
          ].map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="p-3 flex items-center gap-2">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Domain legend */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Domain Color Map
            </p>
            <div className="flex flex-wrap gap-3">
              {domainLegend.map((d) => (
                <div key={d.label} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${d.colorClass}`} />
                  <span className="text-xs text-foreground/80">{d.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Levels */}
        <div className="space-y-4">
          {levels.map((level, idx) => {
            const expanded = expandedLevels.has(level.id);
            const Icon = level.icon;
            return (
              <div key={level.id} className="space-y-0">
                <Card
                  className={`cursor-pointer transition-all duration-200 ${level.colorClass} ${level.borderClass} border`}
                  onClick={() => toggleLevel(level.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${level.colorClass} border ${level.borderClass}`}>
                        <Icon className="h-4.5 w-4.5 text-foreground/70" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {level.label}
                        </p>
                        <p className="text-sm font-semibold text-foreground">{level.title}</p>
                      </div>
                      <Badge variant="outline" className="ml-2 text-[10px] border-border/50">
                        {level.roles.length} {level.roles.length === 1 ? "role" : "roles"}
                      </Badge>
                    </div>
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardContent>
                </Card>

                {expanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 pl-4">
                    {level.roles.map((role) => (
                      <RoleCard key={role.title} role={role} badgeClass={level.badgeClass} />
                    ))}
                  </div>
                )}

                {/* Flow arrow between levels */}
                {idx < levels.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="h-4 w-px bg-border" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Collaboration Relationships */}
        <Card className="border-border/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Collaboration Relationships
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {connections.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-muted/30"
                >
                  <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/10 text-primary border-primary/30">
                    {c.from}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Badge variant="outline" className="text-[10px] shrink-0 bg-accent/10 text-accent border-accent/30">
                    {c.to}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottom summary */}
        <div className="text-center pb-8">
          <p className="text-xs text-muted-foreground max-w-xl mx-auto">
            This team blueprint represents the interdisciplinary capability required to build and scale a composable
            enterprise platform combining distributed systems, SaaS architecture, AI-assisted intelligence,
            modular capability design and cloud infrastructure.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
