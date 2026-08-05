import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, FolderKanban, Clock, CheckCircle2, XCircle, PauseCircle,
  MoreHorizontal, Trash2, Play, Pause, Check, ChevronRight,
  CalendarDays, DollarSign, ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { projectsService, Project, ProjectTask } from "@/services/projects";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  planning:  { label: "Planificación", variant: "secondary" },
  active:    { label: "Activo",        variant: "default" },
  on_hold:   { label: "En pausa",      variant: "outline" },
  completed: { label: "Completado",    variant: "default" },
  cancelled: { label: "Cancelado",     variant: "destructive" },
};

const TASK_STATUS_BADGE: Record<string, { label: string; color: string }> = {
  todo:        { label: "Pendiente",   color: "bg-gray-100 text-gray-700" },
  in_progress: { label: "En progreso", color: "bg-blue-100 text-blue-700" },
  done:        { label: "Completado",  color: "bg-green-100 text-green-700" },
  cancelled:   { label: "Cancelado",   color: "bg-red-100 text-red-700" },
};

function fmt(val: number | null | undefined, currency = "USD") {
  if (val == null) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(val);
}

// ── KPI Cards ─────────────────────────────────────────────────────────────────

function KpiCard({ title, value, icon: Icon, color }: {
  title: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Create Dialog ─────────────────────────────────────────────────────────────

function CreateProjectDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "", description: "", budget: "", currency: "USD",
    start_date: "", end_date: "", notes: "",
  });

  const createMutation = useMutation({
    mutationFn: () => projectsService.create({
      title: form.title,
      description: form.description || undefined,
      budget: form.budget ? parseFloat(form.budget) : undefined,
      currency: form.currency || "USD",
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Proyecto creado" });
      onOpenChange(false);
      setForm({ title: "", description: "", budget: "", currency: "USD", start_date: "", end_date: "", notes: "" });
    },
    onError: (e: Error) => toast({ title: "Error al crear proyecto", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Nombre del proyecto"
            />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descripción del alcance"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Presupuesto</Label>
              <Input
                type="number"
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Moneda</Label>
              <Input
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                placeholder="USD"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha inicio</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Fecha fin</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Observaciones adicionales"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!form.title || createMutation.isPending}
          >
            Crear proyecto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Task Dialog ────────────────────────────────────────────────────────────

function AddTaskDialog({
  projectId, open, onOpenChange,
}: { projectId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", description: "", due_date: "" });

  const addMutation = useMutation({
    mutationFn: () => projectsService.addTask(projectId, {
      title: form.title,
      description: form.description || undefined,
      due_date: form.due_date || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: "Tarea añadida" });
      onOpenChange(false);
      setForm({ title: "", description: "", due_date: "" });
    },
    onError: (e: Error) => toast({ title: "Error al añadir tarea", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Descripción de la tarea"
            />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div>
            <Label>Fecha límite</Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!form.title || addMutation.isPending}
          >
            Añadir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Project Detail Panel ──────────────────────────────────────────────────────

function ProjectDetail({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsService.get(projectId),
  });

  const transitionMutation = useMutation({
    mutationFn: (status: string) => projectsService.update(projectId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: "Estado actualizado" });
    },
    // api.ts lanza Error con el detail del backend ya dentro del mensaje. Antes
    // se leia e.response.data.detail, forma de axios que este cliente no usa:
    // siempre daba undefined y el usuario solo veia el texto generico.
    onError: (e: Error) => toast({
      title: e.message || "Transición no permitida",
      variant: "destructive",
    }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => projectsService.deleteTask(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: "Tarea eliminada" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      projectsService.updateTask(projectId, taskId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  if (isLoading || !project) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando...</div>;
  }

  const { label: statusLabel } = STATUS_BADGE[project.status] ?? { label: project.status };
  const terminal = project.status === "completed" || project.status === "cancelled";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b">
        <div>
          <p className="text-xs font-mono text-muted-foreground">{project.project_number}</p>
          <h2 className="text-lg font-semibold mt-0.5">{project.title}</h2>
          <Badge variant={STATUS_BADGE[project.status]?.variant ?? "outline"} className="mt-1">
            {statusLabel}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {project.budget != null && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Presupuesto</p>
                <p className="font-medium">{fmt(project.budget, project.currency)}</p>
              </div>
            </div>
          )}
          {(project.start_date || project.end_date) && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Período</p>
                <p className="font-medium">
                  {project.start_date ?? "—"} → {project.end_date ?? "—"}
                </p>
              </div>
            </div>
          )}
        </div>

        {project.description && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Descripción
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{project.description}</p>
          </div>
        )}

        {/* Action buttons */}
        {!terminal && (
          <div className="flex flex-wrap gap-2">
            {project.status === "planning" && (
              <Button
                size="sm"
                onClick={() => transitionMutation.mutate("active")}
                disabled={transitionMutation.isPending}
              >
                <Play className="h-3.5 w-3.5 mr-1" /> Activar
              </Button>
            )}
            {project.status === "active" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => transitionMutation.mutate("on_hold")}
                  disabled={transitionMutation.isPending}
                >
                  <Pause className="h-3.5 w-3.5 mr-1" /> Pausar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => transitionMutation.mutate("completed")}
                  disabled={transitionMutation.isPending}
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Completar
                </Button>
              </>
            )}
            {project.status === "on_hold" && (
              <Button
                size="sm"
                onClick={() => transitionMutation.mutate("active")}
                disabled={transitionMutation.isPending}
              >
                <Play className="h-3.5 w-3.5 mr-1" /> Reanudar
              </Button>
            )}
            {project.status !== "cancelled" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => transitionMutation.mutate("cancelled")}
                disabled={transitionMutation.isPending}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>
            )}
          </div>
        )}

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <ListTodo className="h-3.5 w-3.5" /> Tareas ({project.tasks.length})
            </p>
            {!terminal && (
              <Button size="sm" variant="outline" onClick={() => setAddTaskOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Añadir
              </Button>
            )}
          </div>
          {project.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Sin tareas</p>
          ) : (
            <div className="space-y-2">
              {project.tasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50 dark:bg-white/5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">{task.due_date}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      TASK_STATUS_BADGE[task.status]?.color ?? "bg-gray-100 text-gray-700"
                    }`}>
                      {TASK_STATUS_BADGE[task.status]?.label ?? task.status}
                    </span>
                    {!terminal && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {task.status === "todo" && (
                            <DropdownMenuItem
                              onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: "in_progress" })}
                            >
                              Iniciar
                            </DropdownMenuItem>
                          )}
                          {task.status === "in_progress" && (
                            <DropdownMenuItem
                              onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: "done" })}
                            >
                              Marcar completada
                            </DropdownMenuItem>
                          )}
                          {task.status === "done" && (
                            <DropdownMenuItem
                              onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: "todo" })}
                            >
                              Reabrir
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {project.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notas</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}
      </div>

      <AddTaskDialog
        projectId={projectId}
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Projects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsService.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (selectedId === id) setSelectedId(null);
      toast({ title: "Proyecto eliminado" });
    },
    onError: (e: Error) => toast({ title: "No se puede eliminar este proyecto", description: e.message, variant: "destructive" }),
  });

  // KPIs
  const total = projects.length;
  const active = projects.filter(p => p.status === "active").length;
  const completed = projects.filter(p => p.status === "completed").length;
  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0);

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className={`flex flex-col flex-1 overflow-hidden transition-all ${selectedId ? "max-w-[60%]" : "w-full"}`}>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Proyectos</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Gestión del ciclo de vida de proyectos
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo proyecto
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total proyectos"  value={total}     icon={FolderKanban} color="bg-blue-50 text-blue-600" />
            <KpiCard title="Activos"           value={active}    icon={Play}         color="bg-green-50 text-green-600" />
            <KpiCard title="Completados"       value={completed} icon={CheckCircle2} color="bg-purple-50 text-purple-600" />
            <KpiCard title="Presupuesto total" value={fmt(totalBudget)} icon={DollarSign} color="bg-amber-50 text-amber-600" />
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lista de proyectos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">Cargando...</div>
              ) : projects.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Sin proyectos aún</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
                    Crear primer proyecto
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Presupuesto</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map(project => {
                      const { label, variant } = STATUS_BADGE[project.status] ?? { label: project.status, variant: "outline" as const };
                      return (
                        <TableRow
                          key={project.id}
                          className={`cursor-pointer ${selectedId === project.id ? "bg-muted/50" : ""}`}
                          onClick={() => setSelectedId(project.id === selectedId ? null : project.id)}
                        >
                          <TableCell className="font-mono text-xs">{project.project_number}</TableCell>
                          <TableCell className="font-medium">{project.title}</TableCell>
                          <TableCell>
                            <Badge variant={variant}>{label}</Badge>
                          </TableCell>
                          <TableCell>{fmt(project.budget, project.currency)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{project.start_date ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{project.end_date ?? "—"}</TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedId(project.id)}>
                                  Ver detalle
                                </DropdownMenuItem>
                                {project.status === "planning" && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => deleteMutation.mutate(project.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right detail panel */}
      {selectedId && (
        <div className="w-[40%] min-w-[360px] border-l bg-background flex flex-col">
          <ProjectDetail projectId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      )}

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
