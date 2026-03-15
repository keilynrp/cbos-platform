import { create } from "zustand";

export interface CRMDeal {
  id: string;
  name: string;
  value: string;
  contact: string;
  org: string;
  initials: string;
  daysInStage: number;
  probability: number;
  source?: "prospecting" | "manual";
}

export interface PipelineStage {
  id: string;
  title: string;
  color: string;
  total: string;
  deals: CRMDeal[];
}

export interface CRMActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
}

function calcTotal(deals: CRMDeal[]): string {
  const sum = deals.reduce((acc, d) => {
    const num = Number(d.value.replace(/[^0-9]/g, ""));
    return acc + num;
  }, 0);
  return `$${sum.toLocaleString()}`;
}

/** Determine CRM stage from lead score */
function stageFromScore(score: number): string {
  if (score >= 85) return "qualified";
  if (score >= 70) return "lead";
  return "lead";
}

function probabilityFromScore(score: number): number {
  if (score >= 85) return 45;
  if (score >= 70) return 25;
  return 15;
}

const initialStages: PipelineStage[] = [
  {
    id: "lead", title: "New Leads", color: "bg-muted-foreground/20", total: "$42,000",
    deals: [
      { id: "d1", name: "Acme Corp — Enterprise License", value: "$24,000", contact: "Sarah Chen", org: "Acme Corp", initials: "SC", daysInStage: 3, probability: 20 },
      { id: "d2", name: "TechStart — Starter Plan", value: "$4,800", contact: "Mike Ross", org: "TechStart Inc", initials: "MR", daysInStage: 1, probability: 15 },
      { id: "d3", name: "DataFlow — API Access", value: "$13,200", contact: "Lena Zhao", org: "DataFlow Labs", initials: "LZ", daysInStage: 5, probability: 10 },
    ],
  },
  {
    id: "qualified", title: "Qualified", color: "bg-accent/20", total: "$67,500",
    deals: [
      { id: "d4", name: "Globex — Platform Migration", value: "$45,000", contact: "Tom Baker", org: "Globex Corp", initials: "TB", daysInStage: 7, probability: 40 },
      { id: "d5", name: "NovaTech — Knowledge Graph", value: "$22,500", contact: "Amy Liu", org: "NovaTech", initials: "AL", daysInStage: 4, probability: 35 },
    ],
  },
  {
    id: "proposal", title: "Proposal", color: "bg-primary/20", total: "$89,000",
    deals: [
      { id: "d6", name: "MegaCorp — Full Suite", value: "$72,000", contact: "James Park", org: "MegaCorp", initials: "JP", daysInStage: 12, probability: 60 },
      { id: "d7", name: "Bright AI — Analytics Add-on", value: "$17,000", contact: "Nina Patel", org: "Bright AI", initials: "NP", daysInStage: 6, probability: 55 },
    ],
  },
  {
    id: "negotiation", title: "Negotiation", color: "bg-[hsl(var(--cbs-amber))]/20", total: "$52,000",
    deals: [
      { id: "d8", name: "Vertex Solutions — Annual Contract", value: "$52,000", contact: "Rachel Kim", org: "Vertex Solutions", initials: "RK", daysInStage: 9, probability: 80 },
    ],
  },
  {
    id: "closed", title: "Closed Won", color: "bg-[hsl(var(--cbs-green))]/20", total: "$96,000",
    deals: [
      { id: "d9", name: "Horizon Media — Enterprise", value: "$60,000", contact: "David Lin", org: "Horizon Media", initials: "DL", daysInStage: 0, probability: 100 },
      { id: "d10", name: "CloudBase — Team Plan", value: "$36,000", contact: "Emma Scott", org: "CloudBase", initials: "ES", daysInStage: 0, probability: 100 },
    ],
  },
];

interface CRMState {
  stages: PipelineStage[];
  recentPushes: CRMActivity[];
  pushProspectToCRM: (prospect: {
    id: string;
    name: string;
    title: string;
    company: string;
    initials: string;
    score: number;
    revenue: string;
  }) => string; // returns stage title
}

export const useCRMStore = create<CRMState>((set, get) => ({
  stages: initialStages,
  recentPushes: [],

  pushProspectToCRM: (prospect) => {
    const targetStageId = stageFromScore(prospect.score);
    const dealId = `d-prospect-${prospect.id}-${Date.now()}`;
    const deal: CRMDeal = {
      id: dealId,
      name: `${prospect.company} — ${prospect.title}`,
      value: prospect.revenue,
      contact: prospect.name,
      org: prospect.company,
      initials: prospect.initials,
      daysInStage: 0,
      probability: probabilityFromScore(prospect.score),
      source: "prospecting",
    };

    const stages = get().stages.map((stage) => {
      if (stage.id === targetStageId) {
        const newDeals = [...stage.deals, deal];
        return { ...stage, deals: newDeals, total: calcTotal(newDeals) };
      }
      return stage;
    });

    const targetStage = stages.find((s) => s.id === targetStageId);
    const activity: CRMActivity = {
      id: `act-${Date.now()}`,
      type: "prospecting-push",
      title: `Prospect pushed — ${prospect.name} (${prospect.company})`,
      description: `Auto-assigned to "${targetStage?.title}" stage with ${deal.probability}% probability based on lead score of ${prospect.score}`,
      time: "Just now",
    };

    set({ stages, recentPushes: [activity, ...get().recentPushes] });
    return targetStage?.title ?? "New Leads";
  },
}));
