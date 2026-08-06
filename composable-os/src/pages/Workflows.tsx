import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workflowsService, type Workflow, type CreateWorkflowDto } from "@/services/workflows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { translateApiError } from "@/lib/errors";
import {
  Zap, Plus, Play, Trash2, ToggleLeft, CheckCircle2, XCircle,
  Clock, BarChart3, ChevronRight, Loader2,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  completed: "text-emerald-600 bg-emerald-50 border-emerald-200",
  failed: "text-red-600 bg-red-50 border-red-200",
  running: "text-blue-600 bg-blue-50 border-blue-200",
  skipped: "text-gray-500 bg-gray-50 border-gray-200",
};

function WorkflowCard({
  wf,
  onToggle,
  onDelete,
  onViewRuns,
  toggling,
}: {
  wf: Workflow;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onViewRuns: (id: string) => void;
  toggling: boolean;
}) {
  return (
    <Card className="border border-border/60 hover:border-primary/20 transition-colors">
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-semibold truncate">{wf.name}</p>
            </div>
            {wf.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{wf.description}</p>
            )}
          </div>
          <Switch
            checked={wf.enabled}
            onCheckedChange={() => onToggle(wf.id)}
            disabled={toggling}
            className="shrink-0"
          />
        </div>

        {/* Trigger */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px] capitalize">
            {wf.trigger_type}
          </Badge>
          {wf.trigger_config?.event_type && (
            <Badge variant="secondary" className="text-[10px]">
              {String(wf.trigger_config.event_type)}
            </Badge>
          )}
          {wf.conditions?.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {wf.conditions.length} condition{wf.conditions.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Actions preview */}
        <div className="space-y-1">
          {wf.actions.slice(0, 2).map((action, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <ChevronRight className="h-3 w-3 text-primary/40" />
              <span className="font-medium capitalize">{action.type}</span>
              {action.config?.message && (
                <span className="truncate opacity-70">— {String(action.config.message).slice(0, 40)}</span>
              )}
            </div>
          ))}
          {wf.actions.length > 2 && (
            <p className="text-[11px] text-muted-foreground pl-5">+{wf.actions.length - 2} more</p>
          )}
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> {wf.run_count} runs
            </span>
            {wf.last_triggered_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(wf.last_triggered_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onViewRuns(wf.id)}>
              <Play className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(wf.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Create Dialog ──────────────────────────────────────────────────────────
const DEFAULT_FORM: CreateWorkflowDto = {
  name: "",
  description: "",
  trigger_type: "event",
  trigger_config: { event_type: "" },
  conditions: [],
  actions: [{ type: "log", config: { message: "Workflow triggered" } }],
  enabled: true,
};

function CreateWorkflowDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateWorkflowDto>(DEFAULT_FORM);
  const [eventType, setEventType] = useState("");
  const [actionMsg, setActionMsg] = useState("Workflow triggered");

  const create = useMutation({
    mutationFn: workflowsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow creado");
      onClose();
      setForm(DEFAULT_FORM);
      setEventType("");
      setActionMsg("Workflow triggered");
    },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({
      ...form,
      trigger_config: { event_type: eventType },
      actions: [{ type: "log", config: { message: actionMsg } }],
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Workflow</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Notificar lead nuevo"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción (opcional)</Label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Qué hace este workflow"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Evento disparador</Label>
            <Input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="Ej: LeadCaptured, QuoteAccepted"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Eventos disponibles: LeadCaptured, OpportunityCreated, QuoteAccepted, SalesOrderCreated, InventoryLowThresholdDetected
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Mensaje de acción (log)</Label>
            <Textarea
              value={actionMsg}
              onChange={(e) => setActionMsg(e.target.value)}
              placeholder="Usa {field} para valores del evento"
              rows={2}
            />
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

// ── Runs Dialog ────────────────────────────────────────────────────────────
function RunsDialog({ workflowId, onClose }: { workflowId: string | null; onClose: () => void }) {
  const { data: runs, isLoading } = useQuery({
    queryKey: ["workflow-runs", workflowId],
    queryFn: () => workflowsService.getRuns(workflowId!),
    enabled: !!workflowId,
  });

  return (
    <Dialog open={!!workflowId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Historial de ejecuciones</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : !runs?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sin ejecuciones aún</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {runs.map((run) => (
              <div key={run.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${statusColor[run.status] ?? ""}`}
                  >
                    {run.status === "completed" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    {run.status}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(run.created_at).toLocaleString()}
                  </span>
                </div>
                {run.trigger_event_type && (
                  <p className="text-xs text-muted-foreground">Evento: {run.trigger_event_type}</p>
                )}
                {run.steps_result?.map((step, i) => (
                  <div key={i} className="text-xs flex items-center gap-2 pl-2">
                    <ChevronRight className="h-3 w-3 text-primary/40" />
                    <span className="font-medium">{step.action_type}</span>
                    <span className="text-muted-foreground">{step.status}</span>
                    <span className="text-muted-foreground ml-auto">{step.duration_ms}ms</span>
                  </div>
                ))}
                {run.error && <p className="text-xs text-destructive">{run.error}</p>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Workflows() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [runsWorkflowId, setRunsWorkflowId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: workflowsService.getAll,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => workflowsService.toggle(id),
    onMutate: (id) => setTogglingId(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflows"] }); setTogglingId(null); },
    onError: (e: Error) => { toast.error(translateApiError(e)); setTogglingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: workflowsService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflows"] }); toast.success("Workflow eliminado"); },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const active = workflows?.filter((w) => w.enabled).length ?? 0;
  const totalRuns = workflows?.reduce((s, w) => s + w.run_count, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Automatización event-driven — triggers, conditions y actions.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo Workflow
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: workflows?.length ?? 0, icon: Zap },
          { label: "Activos", value: active, icon: CheckCircle2 },
          { label: "Ejecuciones", value: totalRuns, icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : !workflows?.length ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center space-y-3">
            <Zap className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">Sin workflows todavía</p>
            <Button variant="outline" onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Crear el primero
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <WorkflowCard
              key={wf.id}
              wf={wf}
              onToggle={(id) => toggleMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              onViewRuns={(id) => setRunsWorkflowId(id)}
              toggling={togglingId === wf.id}
            />
          ))}
        </div>
      )}

      <CreateWorkflowDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <RunsDialog workflowId={runsWorkflowId} onClose={() => setRunsWorkflowId(null)} />
    </div>
  );
}
