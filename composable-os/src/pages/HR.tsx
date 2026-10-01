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
import { translateApiError } from "@/lib/errors";
import { useEnumLabel } from "@/i18n/enumLabel";
import { useFormat } from "@/i18n/useFormat";
import { useT } from "@/i18n/useT";
import { hrService, Employee, Department } from "@/services/hr";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:     { variant: "default" },
  on_leave:   { variant: "outline" },
  terminated: { variant: "destructive" },
};

/** Radix no admite un `SelectItem` con valor vacio: abrir el dialogo lo hacia fallar. */
const NO_DEPARTMENT = "none";

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
  const t = useT();
  const label = useEnumLabel();
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
      toast({ title: t("hr:toast.created") });
      onOpenChange(false);
      setForm({ full_name: "", email: "", phone: "", position: "", employment_type: "full_time", department_id: "", start_date: "", salary: "", currency: "USD", notes: "" });
    },
    onError: (e: Error) => toast({ title: t("hr:toast.createFailed"), description: translateApiError(e), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("hr:createEmployee.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>{t("hr:createEmployee.fullName")}</Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder={t("hr:createEmployee.fullNamePlaceholder")}
              />
            </div>
            <div>
              <Label>{t("hr:createEmployee.email")}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder={t("hr:createEmployee.emailPlaceholder")}
              />
            </div>
            <div>
              <Label>{t("hr:createEmployee.phone")}</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+52 55 1234 5678"
              />
            </div>
            <div>
              <Label>{t("hr:createEmployee.position")}</Label>
              <Input
                value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                placeholder={t("hr:createEmployee.positionPlaceholder")}
              />
            </div>
            <div>
              <Label>{t("hr:createEmployee.employmentType")}</Label>
              <Select
                value={form.employment_type}
                onValueChange={v => setForm(f => ({ ...f, employment_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["full_time", "part_time", "contractor", "intern"] as const).map(type => (
                    <SelectItem key={type} value={type}>{label("common:employmentType", type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("hr:createEmployee.department")}</Label>
              <Select
                value={form.department_id}
                onValueChange={v => setForm(f => ({ ...f, department_id: v === NO_DEPARTMENT ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder={t("hr:createEmployee.noDepartment")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEPARTMENT}>{t("hr:createEmployee.noDepartment")}</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("hr:createEmployee.startDate")}</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t("hr:createEmployee.salary")}</Label>
              <Input
                type="number"
                value={form.salary}
                onChange={e => setForm(f => ({ ...f, salary: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label>{t("hr:createEmployee.currency")}</Label>
              <Input
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                placeholder="USD" // i18n-ok: codigo de moneda
              />
            </div>
          </div>
          <div>
            <Label>{t("hr:createEmployee.notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("hr:createEmployee.cancel")}</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!form.full_name || createMutation.isPending}
          >
            {t("hr:createEmployee.submit")}
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
  const t = useT();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", description: "" });

  const createMutation = useMutation({
    mutationFn: () => hrService.createDepartment({ name: form.name, description: form.description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({ title: t("hr:toast.departmentCreated") });
      onOpenChange(false);
      setForm({ name: "", description: "" });
    },
    onError: (e: Error) => toast({ title: t("hr:toast.departmentCreateFailed"), description: translateApiError(e), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("hr:createDepartment.title")}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>{t("hr:createDepartment.name")}</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={t("hr:createDepartment.namePlaceholder")}
            />
          </div>
          <div>
            <Label>{t("hr:createDepartment.description")}</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("hr:createDepartment.cancel")}</Button>
          <Button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}>
            {t("hr:createDepartment.submit")}
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
  const t = useT();
  const label = useEnumLabel();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatCurrency, formatDate } = useFormat();

  const { data: emp, isLoading } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: () => hrService.get(employeeId),
  });

  const transitionMutation = useMutation({
    mutationFn: (status: string) => hrService.update(employeeId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
      toast({ title: t("hr:toast.statusUpdated") });
    },
    // El texto lo decide el cliente a partir del codigo. Antes se leia
    // e.response.data.detail, forma de axios que este cliente no usa, y luego
    // e.message, que traia la prosa que escribiera el backend.
    onError: (e: Error) => toast({
      title: translateApiError(e, t("hr:toast.transitionNotAllowed")),
      variant: "destructive",
    }),
  });

  if (isLoading || !emp) return <div className="p-6 text-sm text-muted-foreground">{t("hr:detail.loading")}</div>;

  const dept = departments.find(d => d.id === emp.department_id);
  const terminal = emp.status === "terminated";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between p-6 border-b">
        <div>
          <p className="text-xs font-mono text-muted-foreground">{emp.employee_number}</p>
          <h2 className="text-lg font-semibold mt-0.5">{emp.full_name}</h2>
          {emp.position && <p className="text-sm text-muted-foreground">{emp.position}</p>}
          <Badge variant={STATUS_BADGE[emp.status]?.variant ?? "outline"} className="mt-1">
            {label("common:employeeStatus", emp.status)}
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
              <p className="text-xs text-muted-foreground">{t("hr:detail.type")}</p>
              <p className="font-medium">{label("common:employmentType", emp.employment_type)}</p>
            </div>
          </div>
          {dept && (
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{t("hr:detail.department")}</p>
                <p className="font-medium">{dept.name}</p>
              </div>
            </div>
          )}
          {emp.salary != null && (
            <div className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{t("hr:detail.salary")}</p>
                <p className="font-medium">{formatCurrency(emp.salary, emp.currency, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          )}
          {emp.start_date && (
            <div className="flex items-start gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{t("hr:detail.startDate")}</p>
                <p className="font-medium">{formatDate(emp.start_date)}</p>
              </div>
            </div>
          )}
        </div>

        {(emp.email || emp.phone) && (
          <div className="text-sm space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("hr:detail.contact")}</p>
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
                  <Clock className="h-3.5 w-3.5 mr-1" /> {t("hr:detail.putOnLeave")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => transitionMutation.mutate("terminated")}
                  disabled={transitionMutation.isPending}
                >
                  <UserX className="h-3.5 w-3.5 mr-1" /> {t("hr:detail.terminate")}
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
                  <UserCheck className="h-3.5 w-3.5 mr-1" /> {t("hr:detail.reinstate")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => transitionMutation.mutate("terminated")}
                  disabled={transitionMutation.isPending}
                >
                  <UserX className="h-3.5 w-3.5 mr-1" /> {t("hr:detail.terminate")}
                </Button>
              </>
            )}
          </div>
        )}

        {emp.terminated_at && (
          <p className="text-xs text-muted-foreground">
            {t("hr:detail.terminatedAt", { date: formatDate(emp.terminated_at, "short") })}
          </p>
        )}

        {emp.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{t("hr:detail.notes")}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{emp.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Departments Tab ───────────────────────────────────────────────────────────

function DepartmentsTab() {
  const t = useT();
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
      toast({ title: t("hr:toast.departmentDeleted") });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> {t("hr:departments.new")}
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground p-4">{t("hr:departments.loading")}</p>
      ) : departments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{t("hr:departments.empty")}</p>
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
                      <p className="text-xs text-muted-foreground mt-2">{t("hr:departments.employees", { count })}</p>
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
                          <Trash2 className="h-4 w-4 mr-2" /> {t("hr:departments.delete")}
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
  const t = useT();
  const label = useEnumLabel();
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
      toast({ title: t("hr:toast.deleted") });
    },
    onError: (e: Error) => toast({ title: t("hr:toast.deleteFailed"), description: translateApiError(e), variant: "destructive" }),
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
              <h1 className="text-2xl font-bold">{t("hr:title")}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{t("hr:subtitle")}</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> {t("hr:newEmployee")}
            </Button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title={t("hr:kpi.total")} value={total}      icon={Users}     color="bg-blue-50 text-blue-600" />
            <KpiCard title={t("hr:kpi.active")} value={active}     icon={UserCheck} color="bg-green-50 text-green-600" />
            <KpiCard title={t("hr:kpi.onLeave")} value={onLeave}    icon={Clock}     color="bg-amber-50 text-amber-600" />
            <KpiCard title={t("hr:kpi.terminated")} value={terminated} icon={UserX}     color="bg-red-50 text-red-600" />
          </div>

          <Tabs defaultValue="employees">
            <TabsList>
              <TabsTrigger value="employees">{t("hr:tabs.employees")}</TabsTrigger>
              <TabsTrigger value="departments">{t("hr:tabs.departments")}</TabsTrigger>
            </TabsList>

            <TabsContent value="employees" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-6 text-sm text-muted-foreground">{t("hr:list.loading")}</div>
                  ) : employees.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>{t("hr:list.empty")}</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
                        {t("hr:list.registerFirst")}
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("hr:list.number")}</TableHead>
                          <TableHead>{t("hr:list.name")}</TableHead>
                          <TableHead>{t("hr:list.position")}</TableHead>
                          <TableHead>{t("hr:list.department")}</TableHead>
                          <TableHead>{t("hr:list.type")}</TableHead>
                          <TableHead>{t("hr:list.status")}</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map(emp => {
                          const { variant } = STATUS_BADGE[emp.status] ?? { variant: "outline" as const };
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
                              <TableCell className="text-sm">{label("common:employmentType", emp.employment_type)}</TableCell>
                              <TableCell>
                                <Badge variant={variant}>{label("common:employeeStatus", emp.status)}</Badge>
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
                                      {t("hr:list.view")}
                                    </DropdownMenuItem>
                                    {emp.status !== "terminated" && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => deleteMutation.mutate(emp.id)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" /> {t("hr:list.delete")}
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
