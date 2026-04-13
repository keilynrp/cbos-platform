import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Search,
  TrendingUp,
  FolderKanban,
  BarChart3,
  Send,
  Bot,
  User,
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Sparkles,
  FileText,
  Target,
  Database,
} from "lucide-react";

// --- Types & Data ---

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: typeof Brain;
  color: string;
  bg: string;
  status: "active" | "idle" | "learning";
  capabilities: string[];
  lastAction: string;
  lastActionTime: string;
  tasksCompleted: number;
  accuracy: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const agents: Agent[] = [
  {
    id: "research",
    name: "Research Agent",
    role: "Knowledge Discovery",
    description: "Scans academic papers, datasets, and internal documents to surface relevant insights and connections in the knowledge graph.",
    icon: Search,
    color: "text-primary",
    bg: "bg-primary/10",
    status: "active",
    capabilities: ["Paper analysis", "Entity extraction", "Citation mapping", "Trend detection"],
    lastAction: "Indexed 12 new papers from arXiv",
    lastActionTime: "14 min ago",
    tasksCompleted: 847,
    accuracy: 94,
  },
  {
    id: "marketing",
    name: "Marketing Agent",
    role: "Campaign Optimization",
    description: "Analyzes marketing funnels, A/B test results, and audience data to recommend campaign optimizations and content strategies.",
    icon: Target,
    color: "text-accent",
    bg: "bg-accent/10",
    status: "active",
    capabilities: ["Funnel analysis", "Content suggestions", "A/B test insights", "Audience segmentation"],
    lastAction: "Generated Q2 content calendar draft",
    lastActionTime: "42 min ago",
    tasksCompleted: 312,
    accuracy: 89,
  },
  {
    id: "project",
    name: "Project Assistant",
    role: "Sprint & Task Management",
    description: "Monitors project health, predicts delays, suggests task assignments based on team capacity and skill matching.",
    icon: FolderKanban,
    color: "text-[hsl(var(--cbs-green))]",
    bg: "bg-[hsl(var(--cbs-green))]/10",
    status: "idle",
    capabilities: ["Sprint planning", "Risk detection", "Workload balancing", "Dependency analysis"],
    lastAction: "Flagged AI Agents project as at-risk",
    lastActionTime: "2 hours ago",
    tasksCompleted: 523,
    accuracy: 91,
  },
  {
    id: "analyst",
    name: "Data Analyst Agent",
    role: "Business Intelligence",
    description: "Processes revenue data, CRM metrics, and operational KPIs to generate executive summaries and forecast models.",
    icon: BarChart3,
    color: "text-[hsl(var(--cbs-amber))]",
    bg: "bg-[hsl(var(--cbs-amber))]/10",
    status: "learning",
    capabilities: ["Revenue forecasting", "Anomaly detection", "KPI tracking", "Executive reports"],
    lastAction: "Training on Q1 financial data",
    lastActionTime: "1 hour ago",
    tasksCompleted: 198,
    accuracy: 87,
  },
];

const statusConfig: Record<string, { label: string; class: string; dotClass: string }> = {
  active: { label: "Active", class: "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))] border-[hsl(var(--cbs-green))]/20", dotClass: "bg-[hsl(var(--cbs-green))]" },
  idle: { label: "Idle", class: "bg-muted text-muted-foreground border-border", dotClass: "bg-muted-foreground" },
  learning: { label: "Learning", class: "bg-[hsl(var(--cbs-amber))]/15 text-[hsl(var(--cbs-amber))] border-[hsl(var(--cbs-amber))]/20", dotClass: "bg-[hsl(var(--cbs-amber))]" },
};

const mockResponses: Record<string, string[]> = {
  research: [
    "I found 3 new papers related to knowledge graph embeddings published this week. The most relevant is *\"Scalable Graph Transformers for Enterprise KGs\"* by Chen et al. — it directly applies to our traversal optimization work.\n\nKey findings:\n- 40% improvement in query latency using hierarchical partitioning\n- Compatible with our Neo4j backend\n- Dataset available for benchmarking\n\nShall I add these to the knowledge graph and link them to the Platform Architecture document?",
    "Based on my analysis of recent dataset uploads, I've identified 4 potential duplicate entities in the knowledge graph:\n\n1. \"MIT CSAIL\" and \"MIT CS & AI Lab\" → same institution\n2. \"Dr. S. Chen\" and \"Sarah Chen\" → same author\n\nI recommend merging these to improve graph density. Want me to proceed?",
    "I've completed a citation network analysis across 87 indexed papers. The most-cited work in our graph is *\"Knowledge Graphs at Scale\"* with 234 citations. I've also identified 12 papers that cite our internal research but aren't yet indexed.\n\nWould you like me to import them?",
  ],
  marketing: [
    "I've analyzed your marketing funnel for the past 30 days. Here's what stands out:\n\n📊 **Email** is your top-converting channel at **15% conversion rate** — 2x better than organic search.\n\n**Recommendation:** Increase email nurture sequence from 3 to 5 touchpoints. Based on similar SaaS benchmarks, this could lift conversion by 20-25%.\n\nI've drafted a revised email sequence — want me to share it with the team?",
    "Your LinkedIn Enterprise ad campaign is underperforming. CTR dropped 18% this week.\n\n**Root cause:** Ad fatigue — the same creative has been running for 3 weeks.\n\n**Suggestions:**\n1. Rotate to the knowledge graph demo video (tested well organically)\n2. Narrow targeting to Director+ titles in tech companies\n3. Test a new headline: \"Your ERP, but composable\"\n\nShall I create the A/B test variants?",
  ],
  project: [
    "**Sprint 14 Health Check:**\n\n✅ Knowledge Graph module — ahead of schedule (85% complete)\n✅ CRM Module — on track (58% complete)\n⚠️ AI Agents Framework — **at risk** (34% complete)\n\n**Risk factors for AI Agents:**\n- Sprint velocity declined 2 consecutive sprints\n- Maria has 92% capacity utilization (potential burnout)\n- 3 blocked tasks waiting on API Gateway review\n\n**Recommendation:** Move 2 tasks from Alex to Jordan (DevOps has bandwidth). Unblock API Gateway review by scheduling a 30-min sync tomorrow.",
    "I've analyzed team workload for Sprint 15 planning:\n\n| Member | Current Load | Capacity | Suggested |\n|--------|-------------|----------|-----------|\n| Alex Kim | 70% | Available | +2 frontend tasks |\n| Maria Lopez | 92% | Overloaded | -1 task |\n| Sam Rivera | 55% | Available | +3 tasks |\n| Jordan Davis | 78% | Moderate | +1 task |\n\nWant me to draft the Sprint 15 task assignments?",
  ],
  analyst: [
    "**Weekly Revenue Summary:**\n\nMRR grew to **$62,000** (+12.7% MoM) — strongest growth in 6 months.\n\n**Breakdown:**\n- Enterprise: $38,000 (61%) — 2 new contracts\n- Team: $16,000 (26%) — steady\n- Starter: $8,000 (13%) — slight decline\n\n**Forecast:** At current trajectory, Q2 ARR will reach **$820K** (±$40K). Main risk: starter plan churn accelerating.\n\n**Anomaly detected:** Unusually high API usage from Globex Corp (+340%). May indicate expansion opportunity — flagged for CRM follow-up.",
    "I've generated the executive KPI dashboard for this week:\n\n📈 **Revenue:** $74K (+10.4%)\n📊 **Pipeline:** $346K (+12%)\n👥 **Team Utilization:** 74% (target: 80%)\n🧠 **Knowledge Graph:** 1,284 entities (+124)\n\nNotable: Win rate improved to 34% from 29% last quarter. The CRM automation (deal → project creation) saved an estimated 8 hours of manual work this month.",
  ],
};

// --- Components ---

function AgentCard({ agent, onSelect, isSelected }: { agent: Agent; onSelect: () => void; isSelected: boolean }) {
  const Icon = agent.icon;
  const status = statusConfig[agent.status];

  return (
    <Card
      className={`border cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "border-primary/40 shadow-md bg-primary/[0.02]" : "border-border/60 hover:border-primary/20"
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${agent.bg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${agent.color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold">{agent.name}</p>
              <p className="text-[11px] text-muted-foreground">{agent.role}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${status.class}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass} ${agent.status === "active" ? "animate-pulse" : ""}`} />
            {status.label}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{agent.description}</p>

        <div className="flex flex-wrap gap-1.5">
          {agent.capabilities.map(cap => (
            <span key={cap} className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {cap}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {agent.lastActionTime}
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" /> {agent.tasksCompleted}
            </span>
            <span className="flex items-center gap-1 text-[hsl(var(--cbs-green))]">
              <Zap className="h-3 w-3" /> {agent.accuracy}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChatPanel({ agent, onBack }: { agent: Agent; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content: `Hi! I'm the **${agent.name}**. ${agent.description}\n\nMy last action: *${agent.lastAction}* (${agent.lastActionTime}).\n\nHow can I help you today?`,
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseIndex = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: input, timestamp: "Just now" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const responses = mockResponses[agent.id] || ["I'm processing your request. Let me analyze the data and get back to you."];
    const response = responses[responseIndex.current % responses.length];
    responseIndex.current++;

    setTimeout(() => {
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: response, timestamp: "Just now" }]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  };

  const Icon = agent.icon;

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/60">
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className={`h-9 w-9 rounded-xl ${agent.bg} flex items-center justify-center`}>
          <Icon className={`h-4.5 w-4.5 ${agent.color}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{agent.name}</p>
          <p className="text-[11px] text-muted-foreground">{agent.role}</p>
        </div>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 gap-1 ${statusConfig[agent.status].class}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[agent.status].dotClass} ${agent.status === "active" ? "animate-pulse" : ""}`} />
          {statusConfig[agent.status].label}
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className={msg.role === "assistant" ? `${agent.bg} ${agent.color} text-[10px]` : "bg-muted text-muted-foreground text-[10px]"}>
                {msg.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              </AvatarFallback>
            </Avatar>
            <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-foreground"
            }`}>
              {msg.content.split("\n").map((line, i) => {
                let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
                return <p key={i} className={`${i > 0 ? "mt-1.5" : ""} ${line.trim() === "" ? "h-2" : ""}`} dangerouslySetInnerHTML={{ __html: processed || "&nbsp;" }} />;
              })}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className={`${agent.bg} ${agent.color} text-[10px]`}>
                <Bot className="h-3.5 w-3.5" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted/60 rounded-xl px-4 py-3 flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/60">
        <div className="flex gap-2">
          <Input
            placeholder={`Ask ${agent.name}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            className="h-10"
          />
          <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleSend} disabled={!input.trim() || isTyping}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          {(agent.id === "research" ? ["Find recent papers", "Identify duplicates", "Citation analysis"] :
            agent.id === "marketing" ? ["Analyze funnel", "Campaign performance", "Content ideas"] :
            agent.id === "project" ? ["Sprint health check", "Team workload", "Risk assessment"] :
            ["Revenue summary", "KPI dashboard", "Forecast Q2"]).map(suggestion => (
            <Button
              key={suggestion}
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1"
              onClick={() => { setInput(suggestion); }}
            >
              <Sparkles className="h-3 w-3" /> {suggestion}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Recommendations Feed ---

const recommendations = [
  { agent: "Research Agent", icon: Search, color: "text-primary", bg: "bg-primary/10", text: "12 new papers indexed from arXiv — 3 directly relevant to knowledge graph module.", time: "14 min ago" },
  { agent: "Data Analyst", icon: BarChart3, color: "text-[hsl(var(--cbs-amber))]", bg: "bg-[hsl(var(--cbs-amber))]/10", text: "MRR grew 12.7% MoM — strongest month in 6 months. Enterprise tier driving growth.", time: "1 hour ago" },
  { agent: "Project Assistant", icon: FolderKanban, color: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/10", text: "AI Agents Framework flagged at-risk. Recommend redistributing 2 tasks from Maria to Jordan.", time: "2 hours ago" },
  { agent: "Marketing Agent", icon: Target, color: "text-accent", bg: "bg-accent/10", text: "Email channel outperforming at 15% conversion. Suggest increasing nurture frequency.", time: "3 hours ago" },
];

// --- Main ---

const AIAgents = () => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const selected = agents.find(a => a.id === selectedAgent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Intelligent assistants that analyze your data and produce actionable recommendations.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(var(--cbs-green))] animate-pulse" /> 2 active</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground" /> 1 idle</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(var(--cbs-amber))]" /> 1 learning</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Cards / List */}
        <div className={`space-y-4 ${selected ? "hidden lg:block" : ""}`}>
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgent === agent.id}
              onSelect={() => setSelectedAgent(agent.id)}
            />
          ))}
        </div>

        {/* Chat Panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <Card className="border border-border/60 overflow-hidden">
              <ChatPanel agent={selected} onBack={() => setSelectedAgent(null)} />
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="border border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> Recent Agent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recommendations.map((rec, i) => {
                    const Icon = rec.icon;
                    return (
                      <div key={i} className="flex gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className={`h-8 w-8 rounded-lg ${rec.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`h-4 w-4 ${rec.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{rec.agent}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rec.text}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{rec.time}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Total Tasks Completed", value: "1,880", icon: CheckCircle2 },
                  { label: "Avg Accuracy", value: "90.3%", icon: Zap },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <Card key={s.label} className="border border-border/60">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-lg font-bold">{s.value}</p>
                          <p className="text-[11px] text-muted-foreground">{s.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">← Select an agent to start a conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAgents;
