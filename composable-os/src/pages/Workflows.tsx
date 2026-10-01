import { useState } from "react";
import { useT } from "@/i18n/useT";
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
import { useEnumLabel } from "@/i18n/enumLabel";
import { useFormat } from "@/i18n/useFormat";
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
  const t = useT();
  const { formatDate } = useFormat();
  const label = useEnumLabel();
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
            aria-label={t("workflows:card.toggle", { name: wf.name })}
            className="shrink-0"
          />
        </div>

        {/* Trigger */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px] capitalize">
            {label("workflows:triggerType", wf.trigger_type)}
          </Badge>
          {wf.trigger_config?.event_type && (
            <Badge variant="secondary" className="text-[10px]">
              {String(wf.trigger_config.event_type)}
            </Badge>
          )}
          {wf.conditions?.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {t("workflows:card.conditions", { count: wf.conditions.length })}
            </Badge>
          )}
        </div>

        {/* Actions preview */}
        <div className="space-y-1">
          {wf.actions.slice(0, 2).map((action, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <ChevronRight className="h-3 w-3 text-primary/40" />
              <span className="font-medium capitalize">{label("workflows:actionType", action.type)}</span>
              {action.config?.message && (
                <span className="truncate opacity-70">— {String(action.config.message).slice(0, 40)}</span>
              )}
            </div>
          ))}
          {wf.actions.length > 2 && (
            <p className="text-[11px] text-muted-foreground pl-5">
              {t("workflows:card.moreActions", { count: wf.actions.length - 2 })}
            </p>
          )}
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> {t("workflows:card.runs", { count: wf.run_count })}
            </span>
            {wf.last_triggered_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(wf.last_triggered_at, "short")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={t("workflows:card.viewRuns")}
              onClick={() => onViewRuns(wf.id)}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              aria-label={t("workflows:card.delete")}
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
/** Eventos que el backend publica y un workflow puede escuchar. */
const AVAILABLE_EVENTS = [
  "LeadCaptured",
  "OpportunityCreated",
  "QuoteAccepted",
  "SalesOrderCreated",
  "InventoryLowThresholdDetected",
];

// `actions` se reemplaza al enviar (ver handleSubmit): el mensaje de la accion
// vive en `actionMsg`, que depende del idioma.
const DEFAULT_FORM: CreateWorkflowDto = {
  name: "",
  description: "",
  trigger_type: "event",
  trigger_config: { event_type: "" },
  conditions: [],
  actions: [],
  enabled: true,
};

function CreateWorkflowDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateWorkflowDto>(DEFAULT_FORM);
  const [eventType, setEventType] = useState("");
  // `null` = no lo ha tocado: se muestra el texto por defecto del idioma activo.
  const [editedMsg, setEditedMsg] = useState<string | null>(null);
  const actionMsg = editedMsg ?? t("workflows:create.defaultMessage");

  const create = useMutation({
    mutationFn: workflowsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      toast.success(t("workflows:create.created"));
      onClose();
      setForm(DEFAULT_FORM);
      setEventType("");
      setEditedMsg(null);
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
          <DialogTitle>{t("workflows:create.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("workflows:create.name")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t("workflows:create.namePlaceholder")}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("workflows:create.description")}</Label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={t("workflows:create.descriptionPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("workflows:create.event")}</Label>
            <Input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder={t("workflows:create.eventPlaceholder")}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              {t("workflows:create.availableEvents", { events: AVAILABLE_EVENTS.join(", ") })}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("workflows:create.actionMessage")}</Label>
            <Textarea
              value={actionMsg}
              onChange={(e) => setEditedMsg(e.target.value)}
              placeholder={t("workflows:create.actionMessagePlaceholder")}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("workflows:create.cancel")}</Button>
            <Button type="submit" disabled={create.isPending} className="gap-2">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("workflows:create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Runs Dialog ────────────────────────────────────────────────────────────
function RunsDialog({ workflowId, onClose }: { workflowId: string | null; onClose: () => void }) {
  const t = useT();
  const { formatDateTime, formatMilliseconds } = useFormat();
  const label = useEnumLabel();
  const { data: runs, isLoading } = useQuery({
    queryKey: ["workflow-runs", workflowId],
    queryFn: () => workflowsService.getRuns(workflowId!),
    enabled: !!workflowId,
  });

  return (
    <Dialog open={!!workflowId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("workflows:runs.title")}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : !runs?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t("workflows:runs.empty")}</p>
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
                    {label("workflows:runStatus", run.status)}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDateTime(run.created_at)}
                  </span>
                </div>
                {run.trigger_event_type && (
                  <p className="text-xs text-muted-foreground">
                    {t("workflows:runs.event", { type: run.trigger_event_type })}
                  </p>
                )}
                {run.steps_result?.map((step, i) => (
                  <div key={i} className="text-xs flex items-center gap-2 pl-2">
                    <ChevronRight className="h-3 w-3 text-primary/40" />
                    <span className="font-medium">{label("workflows:actionType", step.action_type)}</span>
                    <span className="text-muted-foreground">{label("workflows:runStatus", step.status)}</span>
                    <span className="text-muted-foreground ml-auto">{formatMilliseconds(step.duration_ms)}</span>
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
  const t = useT();
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflows"] }); toast.success(t("workflows:deleted")); },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const active = workflows?.filter((w) => w.enabled).length ?? 0;
  const totalRuns = workflows?.reduce((s, w) => s + w.run_count, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("workflows:title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("workflows:subtitle")}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> {t("workflows:new")}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t("workflows:kpi.total"), value: workflows?.length ?? 0, icon: Zap },
          { label: t("workflows:kpi.active"), value: active, icon: CheckCircle2 },
          { label: t("workflows:kpi.runs"), value: totalRuns, icon: BarChart3 },
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
            <p className="text-sm font-medium text-muted-foreground">{t("workflows:empty.title")}</p>
            <Button variant="outline" onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> {t("workflows:empty.createFirst")}
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
