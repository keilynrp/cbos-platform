import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crmService, type Lead, type Contact, type Organization, type Opportunity, type Activity, type CreateActivityDto } from "@/services/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus, MoreHorizontal, Building2, Users, DollarSign, TrendingUp,
  Phone, Mail, Calendar, ChevronRight, ArrowRight, FolderKanban,
  MessageSquare, FileText, CheckCircle2, Clock, AlertCircle,
  Briefcase, Send, Loader2,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// Pipeline stages config — IDs match backend VALID_STAGES
const STAGES = [
  { id: "new",         title: "New",         color: "bg-gray-400" },
  { id: "qualified",   title: "Qualified",   color: "bg-blue-500" },
  { id: "proposal",    title: "Proposal",    color: "bg-purple-500" },
  { id: "negotiation", title: "Negotiation", color: "bg-amber-500" },
  { id: "won",         title: "Won",         color: "bg-emerald-500" },
  { id: "lost",        title: "Lost",        color: "bg-red-400" },
];

const LEAD_STATUS_COLORS: Record<string, string> = {
  new:          "bg-gray-100 text-gray-700",
  contacted:    "bg-blue-100 text-blue-700",
  qualified:    "bg-green-100 text-green-700",
  disqualified: "bg-red-100 text-red-700",
  converted:    "bg-purple-100 text-purple-700",
};

const activityIcons: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Calendar, note: MessageSquare,
  task: CheckCircle2, deal: CheckCircle2, document: FileText, default: Clock,
};

type ActivityCtx = { entity_type: "lead" | "opportunity"; entity_id: string; name: string };

// ── Sub-Components ─────────────────────────────────────────────────────────

function DealCard({ opp, onStageClick }: { opp: Opportunity; onStageClick: (opp: Opportunity) => void }) {
  return (
    <Card
      className="group cursor-pointer border border-border/60 shadow-sm hover:shadow-md transition-all hover:border-primary/30 bg-card"
      onClick={() => onStageClick(opp)}
    >
      <CardContent className="p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{opp.title}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
            onClick={(e) => { e.stopPropagation(); onStageClick(opp); }}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">{fmtCurrency(opp.value ?? 0)}</span>
          <div className="flex items-center gap-2">
            {opp.close_date && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-3 w-3" /> {new Date(opp.close_date).toLocaleDateString()}
              </span>
            )}
            {opp.probability != null && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                {opp.probability}%
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Pipeline({ opportunities, onStageClick }: { opportunities: Opportunity[]; onStageClick: (opp: Opportunity) => void }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
      {STAGES.map((stage) => {
        const deals = opportunities.filter((o) => o.stage === stage.id);
        const total = deals.reduce((s, d) => s + (d.value ?? 0), 0);
        return (
          <div key={stage.id} className="min-w-[264px] w-[264px] shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                <span className="text-sm font-semibold">{stage.title}</span>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{deals.length}</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{fmtCurrency(total)}</span>
            </div>
            <div className="space-y-2.5">
              {deals.map((deal) => <DealCard key={deal.id} opp={deal} onStageClick={onStageClick} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadsList({
  leads,
  onConvert,
  onLogActivity,
}: {
  leads: Lead[];
  onConvert: (lead: Lead) => void;
  onLogActivity: (ctx: ActivityCtx) => void;
}) {
  if (leads.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Sin leads registrados</p>;
  }
  return (
    <div className="grid gap-3">
      {leads.map((lead) => {
        const name = `${lead.first_name} ${lead.last_name ?? ""}`.trim();
        return (
          <Card key={lead.id} className="border border-border/60 hover:border-primary/20 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials(name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate">{name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${LEAD_STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {lead.status}
                  </span>
                  {lead.source && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{lead.source}</Badge>
                  )}
                </div>
                {lead.company_name && (
                  <p className="text-xs text-muted-foreground truncate">{lead.company_name}</p>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => onLogActivity({ entity_type: "lead", entity_id: lead.id, name })}
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Log
                </Button>
                {lead.status !== "converted" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => onConvert(lead)}
                  >
                    <ArrowRight className="h-3.5 w-3.5" /> Convertir
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ContactsList({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="grid gap-3">
      {contacts.map((c) => {
        const name = `${c.first_name} ${c.last_name ?? ""}`.trim();
        return (
          <Card key={c.id} className="border border-border/60 hover:border-primary/20 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials(name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{name}</p>
                  {c.title && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{c.title}</Badge>}
                </div>
                {c.organization_name && <p className="text-xs text-muted-foreground truncate">{c.organization_name}</p>}
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>}
                {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function OrganizationsList({ organizations }: { organizations: Organization[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {organizations.map((org) => (
        <Card key={org.id} className="border border-border/60 hover:border-primary/20 transition-colors cursor-pointer">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{org.name}</p>
                {org.industry && <p className="text-xs text-muted-foreground">{org.industry}</p>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {org.website && <Badge variant="outline" className="text-[10px]">{org.website}</Badge>}
              {org.phone && <Badge variant="outline" className="text-[10px]">{org.phone}</Badge>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivityList({ activities }: { activities: Activity[] }) {
  return (
    <div className="space-y-1">
      {activities.map((a, i) => {
        const Icon = activityIcons[a.activity_type] ?? activityIcons.default;
        return (
          <div key={a.id} className="flex gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
            <div className="relative">
              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              {i < activities.length - 1 && (
                <div className="absolute left-1/2 top-8 w-px h-[calc(100%+4px)] bg-border -translate-x-1/2" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{a.activity_type} · {a.entity_type}</p>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Change Stage Dialog ─────────────────────────────────────────────────────
function ChangeStageDialog({ opp, onClose }: { opp: Opportunity | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [stage, setStage] = useState(opp?.stage ?? "new");
  const [lostReason, setLostReason] = useState("");

  useEffect(() => {
    setStage(opp?.stage ?? "new");
    setLostReason("");
  }, [opp]);

  const change = useMutation({
    mutationFn: () => crmService.changeStage(opp!.id, {
      stage,
      ...(stage === "lost" ? { lost_reason: lostReason } : {}),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-opportunities"] });
      toast.success("Etapa actualizada");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!opp} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Cambiar etapa — {opp?.title}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); change.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nueva etapa</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {stage === "lost" && (
            <div className="space-y-1.5">
              <Label>Motivo de pérdida *</Label>
              <Textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="¿Por qué se perdió esta oportunidad?"
                required
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={change.isPending} className="gap-2">
              {change.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Convert Lead Dialog ─────────────────────────────────────────────────────
function ConvertLeadDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", value: "", close_date: "" });

  useEffect(() => {
    if (lead) {
      setForm({
        title: `${lead.first_name} ${lead.last_name ?? ""}`.trim(),
        value: "",
        close_date: "",
      });
    }
  }, [lead]);

  const convert = useMutation({
    mutationFn: () => crmService.convertLead(lead!.id, {
      title: form.title,
      value: form.value ? Number(form.value) : undefined,
      close_date: form.close_date || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      qc.invalidateQueries({ queryKey: ["crm-opportunities"] });
      toast.success("Lead convertido a oportunidad");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!lead} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Convertir lead — {lead?.first_name}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); convert.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Título de la oportunidad *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor ($)</Label>
              <Input
                type="number"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de cierre</Label>
              <Input
                type="date"
                value={form.close_date}
                onChange={(e) => setForm((f) => ({ ...f, close_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={convert.isPending} className="gap-2">
              {convert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Convertir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Log Activity Dialog ─────────────────────────────────────────────────────
function LogActivityDialog({ context, onClose }: { context: ActivityCtx | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ activity_type: CreateActivityDto["activity_type"]; title: string; description: string }>({
    activity_type: "call",
    title: "",
    description: "",
  });

  useEffect(() => {
    setForm({ activity_type: "call", title: "", description: "" });
  }, [context]);

  const log = useMutation({
    mutationFn: () => crmService.logActivity({
      activity_type: form.activity_type,
      title: form.title,
      description: form.description || undefined,
      entity_type: context!.entity_type,
      entity_id: context!.entity_id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-activities"] });
      toast.success("Actividad registrada");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!context} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Registrar actividad — {context?.name}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); log.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={form.activity_type}
              onValueChange={(v) => setForm((f) => ({ ...f, activity_type: v as typeof f.activity_type }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["call", "email", "meeting", "note", "task"] as const).map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={log.isPending} className="gap-2">
              {log.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── New Lead Dialog ────────────────────────────────────────────────────────
function NewLeadDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company_name: "", source: "web" });

  const create = useMutation({
    mutationFn: () => crmService.createLead(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      toast.success("Lead creado");
      onClose();
      onCreated?.();
      setForm({ first_name: "", last_name: "", email: "", phone: "", company_name: "", source: "web" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo Lead</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Apellido</Label>
              <Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Input value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Fuente</Label>
            <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["web", "email", "referral", "social", "cold_outreach", "event", "other"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending} className="gap-2">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── New Opportunity Dialog ─────────────────────────────────────────────────
function NewOpportunityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", stage: "new", value: "", probability: "50", close_date: "" });

  const create = useMutation({
    mutationFn: () => crmService.createOpportunity({
      title: form.title,
      stage: form.stage,
      value: form.value ? Number(form.value) : undefined,
      probability: form.probability ? Number(form.probability) : undefined,
      close_date: form.close_date || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-opportunities"] });
      toast.success("Oportunidad creada");
      onClose();
      setForm({ title: "", stage: "new", value: "", probability: "50", close_date: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nueva Oportunidad</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor ($)</Label>
              <Input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Probabilidad (%)</Label>
              <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Etapa</Label>
            <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de cierre</Label>
            <Input type="date" value={form.close_date} onChange={(e) => setForm((f) => ({ ...f, close_date: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending} className="gap-2">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
const CRM = () => {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newOppOpen, setNewOppOpen] = useState(false);
  const [stageOpp, setStageOpp] = useState<Opportunity | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [activityCtx, setActivityCtx] = useState<ActivityCtx | null>(null);

  const { data: opportunities = [], isLoading: loadingOpps, error: oppsError } = useQuery({
    queryKey: ["crm-opportunities"],
    queryFn: crmService.getOpportunities,
    retry: 1,
  });

  const { data: leads = [], isLoading: loadingLeads, error: leadsError } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: crmService.getLeads,
    retry: 1,
  });

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["crm-contacts"],
    queryFn: crmService.getContacts,
    retry: 1,
  });

  const { data: organizations = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ["crm-organizations"],
    queryFn: crmService.getOrganizations,
    retry: 1,
  });

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["crm-activities"],
    queryFn: () => crmService.getActivities(),
    retry: 1,
  });

  // Surface silent API failures as visible toasts
  useEffect(() => {
    if (oppsError) toast.error("Error cargando oportunidades: " + (oppsError as Error)?.message);
  }, [oppsError]);
  useEffect(() => {
    if (leadsError) toast.error("Error cargando leads: " + (leadsError as Error)?.message);
  }, [leadsError]);

  // KPI calculations
  const totalPipeline = opportunities.reduce((s, o) => s + (o.value ?? 0), 0);
  const openDeals = opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost").length;
  const won = opportunities.filter((o) => o.stage === "won");
  const winRate = opportunities.length ? Math.round((won.length / opportunities.length) * 100) : 0;
  const avgDealSize = opportunities.length ? totalPipeline / opportunities.length : 0;

  const kpiStats = [
    { label: "Total Pipeline", value: fmtCurrency(totalPipeline), icon: DollarSign },
    { label: "Open Deals", value: String(openDeals), icon: Briefcase },
    { label: "Win Rate", value: `${winRate}%`, icon: TrendingUp },
    { label: "Avg Deal Size", value: fmtCurrency(avgDealSize), icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona leads, deals y relaciones — conectado al backend en tiempo real.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setNewLeadOpen(true)}>
            <Send className="h-4 w-4" /> Nuevo Lead
          </Button>
          <Button className="gap-2" onClick={() => setNewOppOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva Oportunidad
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border border-border/60">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pipeline" className="gap-1.5"><FolderKanban className="h-3.5 w-3.5" /> Pipeline</TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5"><Send className="h-3.5 w-3.5" /> Leads</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Contacts</TabsTrigger>
          <TabsTrigger value="organizations" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Organizations</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          {loadingOpps ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="min-w-[264px] h-48 rounded-xl" />)}
            </div>
          ) : (
            <Pipeline opportunities={opportunities} onStageClick={setStageOpp} />
          )}
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          {loadingLeads ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : (
            <LeadsList leads={leads} onConvert={setConvertLead} onLogActivity={setActivityCtx} />
          )}
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          {loadingContacts ? <Skeleton className="h-48 rounded-xl" /> : <ContactsList contacts={contacts} />}
        </TabsContent>

        <TabsContent value="organizations" className="mt-4">
          {loadingOrgs ? <Skeleton className="h-48 rounded-xl" /> : <OrganizationsList organizations={organizations} />}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Activity Timeline
                <Badge variant="secondary" className="text-[10px]">Recientes</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingActivities ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin actividad registrada</p>
              ) : (
                <ActivityList activities={activities} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NewLeadDialog open={newLeadOpen} onClose={() => setNewLeadOpen(false)} onCreated={() => setActiveTab("leads")} />
      <NewOpportunityDialog open={newOppOpen} onClose={() => setNewOppOpen(false)} />
      <ChangeStageDialog opp={stageOpp} onClose={() => setStageOpp(null)} />
      <ConvertLeadDialog lead={convertLead} onClose={() => setConvertLead(null)} />
      <LogActivityDialog context={activityCtx} onClose={() => setActivityCtx(null)} />
    </div>
  );
};

export default CRM;
