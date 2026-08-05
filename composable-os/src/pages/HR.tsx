import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Users, UserCheck, UserX, Clock, MoreHorizontal, Trash2,
  ChevronRight, Building2, Briefcase, DollarSign, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { hrService, Employee, Department } from "@/services/hr";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:     { label: "Activo",       variant: "default" },
  on_leave:   { label: "De permiso",   variant: "outline" },
  terminated: { label: "Terminado",    variant: "destructive" },
};

const TYPE_LABEL: Record<string, string> = {
  full_time:  "Tiempo completo",
  part_time:  "Medio tiempo",
  contractor: "Contratista",
  intern:     "Pasante",
};

function fmt(val: number | null | undefined, currency = "USD") {
  if (val == null) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(val);
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

// ── Create Employee Dialog ────────────────────────────────────────────────────

function CreateEmployeeDialog({
  open, onOpenChange, departments,
}: { open: boolean; onOpenChange: (v: boolean) => void; departments: Department[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", position: "",
    employment_type: "full_time", department_id: "",
    start_date: "", salary: "", currency: "USD", notes: "",
  });

  const createMutation = useMutation({
    mutationFn: () => hrService.create({
      full_name: form.full_name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      position: form.position || undefined,
      employment_type: form.employment_type,
      department_id: form.department_id || undefined,
      start_date: form.start_date || undefined,
      salary: form.salary ? parseFloat(form.salary) : undefined,
      currency: form.currency || "USD",
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Empleado registrado" });
      onOpenChange(false);
      setForm({ full_name: "", email: "", phone: "", position: "", employment_type: "full_time", department_id: "", start_date: "", salary: "", currency: "USD", notes: "" });
    },
    onError: () => toast({ title: "Error al registrar empleado", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo empleado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nombre completo *</Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Ej. Ana Torres"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="correo@empresa.com"
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+52 55 1234 5678"
              />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input
                value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                placeholder="Ej. Software Engineer"
              />
            </div>
            <div>
              <Label>Tipo de empleo</Label>
              <Select
                value={form.employment_type}
                onValueChange={v => setForm(f => ({ ...f, employment_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Tiempo completo</SelectItem>
                  <SelectItem value="part_time">Medio tiempo</SelectItem>
                  <SelectItem value="contractor">Contratista</SelectItem>
                  <SelectItem value="intern">Pasante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Departamento</Label>
              <Select
                value={form.department_id}
                onValueChange={v => setForm(f => ({ ...f, department_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Sin departamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin departamento</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de inicio</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Salario</Label>
              <Input
                type="number"
                value={form.salary}
                onChange={e => setForm(f => ({ ...f, salary: e.target.value }))}
                placeholder="0"
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
          <div>
            <Label>Notas</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!form.full_name || createMutation.isPending}
          >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Department Dialog ──────────────────────────────────────────────────

function CreateDepartmentDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", description: "" });

  const createMutation = useMutation({
    mutationFn: () => hrService.createDepartment({ name: form.name, description: form.description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({ title: "Departamento creado" });
      onOpenChange(false);
      setForm({ name: "", description: "" });
    },
    onError: () => toast({ title: "Error al crear departamento", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo departamento</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Nombre *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Ingeniería"
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}>
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Employee Detail Panel ─────────────────────────────────────────────────────

function EmployeeDetail({
  employeeId, departments, onClose,
}: { employeeId: string; departments: Department[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: emp, isLoading } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: () => hrService.get(employeeId),
  });

  const transitionMutation = useMutation({
    mutationFn: (status: string) => hrService.update(employeeId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
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

  if (isLoading || !emp) return <div className="p-6 text-sm text-muted-foreground">Cargando...</div>;

  const dept = departments.find(d => d.id === emp.department_id);
  const { label: statusLabel } = STATUS_BADGE[emp.status] ?? { label: emp.status };
  const terminal = emp.status === "terminated";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between p-6 border-b">
        <div>
          <p className="text-xs font-mono text-muted-foreground">{emp.employee_number}</p>
          <h2 className="text-lg font-semibold mt-0.5">{emp.full_name}</h2>
          {emp.position && <p className="text-sm text-muted-foreground">{emp.position}</p>}
          <Badge variant={STATUS_BADGE[emp.status]?.variant ?? "outline"} className="mt-1">
            {statusLabel}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="font-medium">{TYPE_LABEL[emp.employment_type] ?? emp.employment_type}</p>
            </div>
          </div>
          {dept && (
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Departamento</p>
                <p className="font-medium">{dept.name}</p>
              </div>
            </div>
          )}
          {emp.salary != null && (
            <div className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Salario</p>
                <p className="font-medium">{fmt(emp.salary, emp.currency)}</p>
              </div>
            </div>
          )}
          {emp.start_date && (
            <div className="flex items-start gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Ingreso</p>
                <p className="font-medium">{emp.start_date}</p>
              </div>
            </div>
          )}
        </div>

        {(emp.email || emp.phone) && (
          <div className="text-sm space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contacto</p>
            {emp.email && <p>{emp.email}</p>}
            {emp.phone && <p>{emp.phone}</p>}
          </div>
        )}

        {/* Actions */}
        {!terminal && (
          <div className="flex flex-wrap gap-2">
            {emp.status === "active" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => transitionMutation.mutate("on_leave")}
                  disabled={transitionMutation.isPending}
                >
                  <Clock className="h-3.5 w-3.5 mr-1" /> Poner en permiso
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => transitionMutation.mutate("terminated")}
                  disabled={transitionMutation.isPending}
                >
                  <UserX className="h-3.5 w-3.5 mr-1" /> Dar de baja
                </Button>
              </>
            )}
            {emp.status === "on_leave" && (
              <>
                <Button
                  size="sm"
                  onClick={() => transitionMutation.mutate("active")}
                  disabled={transitionMutation.isPending}
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" /> Reincorporar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => transitionMutation.mutate("terminated")}
                  disabled={transitionMutation.isPending}
                >
                  <UserX className="h-3.5 w-3.5 mr-1" /> Dar de baja
                </Button>
              </>
            )}
          </div>
        )}

        {emp.terminated_at && (
          <p className="text-xs text-muted-foreground">
            Dado de baja: {new Date(emp.terminated_at).toLocaleDateString("es-MX")}
          </p>
        )}

        {emp.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notas</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{emp.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Departments Tab ───────────────────────────────────────────────────────────

function DepartmentsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => hrService.getDepartments(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => hrService.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrService.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Departamento eliminado" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo departamento
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground p-4">Cargando...</p>
      ) : departments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Sin departamentos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => {
            const count = employees.filter(e => e.department_id === dept.id).length;
            return (
              <Card key={dept.id}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{dept.name}</p>
                      {dept.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{dept.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{count} empleado{count !== 1 ? "s" : ""}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(dept.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <CreateDepartmentDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HR() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => hrService.getAll(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => hrService.getDepartments(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      if (selectedId === id) setSelectedId(null);
      toast({ title: "Empleado eliminado" });
    },
    onError: () => toast({ title: "No se puede eliminar este registro", variant: "destructive" }),
  });

  // KPIs
  const total = employees.length;
  const active = employees.filter(e => e.status === "active").length;
  const onLeave = employees.filter(e => e.status === "on_leave").length;
  const terminated = employees.filter(e => e.status === "terminated").length;

  const deptName = (id: string | null) =>
    id ? (departments.find(d => d.id === id)?.name ?? "—") : "—";

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className={`flex flex-col flex-1 overflow-hidden transition-all ${selectedId ? "max-w-[60%]" : "w-full"}`}>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Equipo</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Gestión de empleados y departamentos</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo empleado
            </Button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total equipo"   value={total}      icon={Users}     color="bg-blue-50 text-blue-600" />
            <KpiCard title="Activos"         value={active}     icon={UserCheck} color="bg-green-50 text-green-600" />
            <KpiCard title="De permiso"      value={onLeave}    icon={Clock}     color="bg-amber-50 text-amber-600" />
            <KpiCard title="Bajas"           value={terminated} icon={UserX}     color="bg-red-50 text-red-600" />
          </div>

          <Tabs defaultValue="employees">
            <TabsList>
              <TabsTrigger value="employees">Empleados</TabsTrigger>
              <TabsTrigger value="departments">Departamentos</TabsTrigger>
            </TabsList>

            <TabsContent value="employees" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-6 text-sm text-muted-foreground">Cargando...</div>
                  ) : employees.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>Sin empleados registrados</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
                        Registrar primer empleado
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No.</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Departamento</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map(emp => {
                          const { label, variant } = STATUS_BADGE[emp.status] ?? { label: emp.status, variant: "outline" as const };
                          return (
                            <TableRow
                              key={emp.id}
                              className={`cursor-pointer ${selectedId === emp.id ? "bg-muted/50" : ""}`}
                              onClick={() => setSelectedId(emp.id === selectedId ? null : emp.id)}
                            >
                              <TableCell className="font-mono text-xs">{emp.employee_number}</TableCell>
                              <TableCell className="font-medium">{emp.full_name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{emp.position ?? "—"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{deptName(emp.department_id)}</TableCell>
                              <TableCell className="text-sm">{TYPE_LABEL[emp.employment_type] ?? emp.employment_type}</TableCell>
                              <TableCell>
                                <Badge variant={variant}>{label}</Badge>
                              </TableCell>
                              <TableCell onClick={e => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setSelectedId(emp.id)}>
                                      Ver detalle
                                    </DropdownMenuItem>
                                    {emp.status !== "terminated" && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => deleteMutation.mutate(emp.id)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                        </DropdownMenuItem>
                                      </>
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
            </TabsContent>

            <TabsContent value="departments" className="mt-4">
              <DepartmentsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right detail panel */}
      {selectedId && (
        <div className="w-[40%] min-w-[360px] border-l bg-background flex flex-col">
          <EmployeeDetail
            employeeId={selectedId}
            departments={departments}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}

      <CreateEmployeeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        departments={departments}
      />
    </div>
  );
}
