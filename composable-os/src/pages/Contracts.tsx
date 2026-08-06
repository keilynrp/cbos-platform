import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileSignature, Plus, DollarSign, Clock, CheckCircle2, AlertTriangle,
  Send, Trash2, ChevronRight, Loader2, X, FileText, Shield,
  MoreHorizontal, Edit, PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { translateApiError } from "@/lib/errors";
import {
  contractsService,
  type ContractListItem,
  type Contract,
  type CreateContractDto,
} from "@/services/contracts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number | null, currency = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency, minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const STATUS_META: Record<string, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.FC<{ className?: string }>;
}> = {
  draft:      { label: "Borrador",   variant: "secondary",   icon: FileText },
  sent:       { label: "Enviado",    variant: "outline",     icon: Send },
  signed:     { label: "Firmado",    variant: "outline",     icon: PenLine },
  executed:   { label: "Ejecutado",  variant: "default",     icon: CheckCircle2 },
  expired:    { label: "Vencido",    variant: "destructive", icon: Clock },
  terminated: { label: "Terminado",  variant: "secondary",   icon: X },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, variant: "secondary" as const, icon: FileText };
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className="gap-1 text-[10px]">
      <Icon className="h-2.5 w-2.5" /> {meta.label}
    </Badge>
  );
}

// ── Create dialog ─────────────────────────────────────────────────────────────

function CreateContractDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<CreateContractDto>({
    title: "",
    value: undefined,
    currency: "USD",
    notes: "",
  });

  const create = useMutation({
    mutationFn: (dto: CreateContractDto) => contractsService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contrato creado" });
      onClose();
      setForm({ title: "", value: undefined, currency: "USD", notes: "" });
    },
    onError: (e: Error) => toast({ title: "Error", description: translateApiError(e), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Nuevo contrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Título *</label>
            <Input
              className="mt-1"
              placeholder="Ej: Acuerdo de servicios Q4 2026"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor</label>
              <Input
                className="mt-1"
                type="number"
                placeholder="0.00"
                value={form.value ?? ""}
                onChange={e => setForm(f => ({
                  ...f, value: e.target.value ? parseFloat(e.target.value) : undefined,
                }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Moneda</label>
              <Input
                className="mt-1"
                placeholder="USD"
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fecha inicio</label>
              <Input
                className="mt-1"
                type="date"
                value={form.start_date ?? ""}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value || undefined }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fecha fin</label>
              <Input
                className="mt-1"
                type="date"
                value={form.end_date ?? ""}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value || undefined }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notas</label>
            <Textarea
              className="mt-1"
              placeholder="Descripción u observaciones..."
              rows={3}
              value={form.notes ?? ""}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!form.title.trim() || create.isPending}
            onClick={() => create.mutate(form)}
          >
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crear contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function ContractDetail({
  contractId, onClose,
}: { contractId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addingClause, setAddingClause] = useState(false);
  const [newClause, setNewClause] = useState({ title: "", body: "" });

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => contractsService.get(contractId),
  });

  const transition = useMutation({
    mutationFn: (status: string) => contractsService.update(contractId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["contract", contractId] });
      toast({ title: "Estado actualizado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: translateApiError(e), variant: "destructive" }),
  });

  const addClause = useMutation({
    mutationFn: () => contractsService.addClause(contractId, {
      title: newClause.title,
      body: newClause.body,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract", contractId] });
      setNewClause({ title: "", body: "" });
      setAddingClause(false);
      toast({ title: "Cláusula agregada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: translateApiError(e), variant: "destructive" }),
  });

  const deleteClause = useMutation({
    mutationFn: (clauseId: string) =>
      contractsService.deleteClause(contractId, clauseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract", contractId] });
      toast({ title: "Cláusula eliminada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: translateApiError(e), variant: "destructive" }),
  });

  if (isLoading || !contract) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const NEXT_ACTIONS: Record<string, { label: string; status: string; variant?: "destructive" | "outline" | "default" }[]> = {
    draft:  [{ label: "Enviar a cliente", status: "sent" }, { label: "Terminar", status: "terminated", variant: "destructive" }],
    sent:   [{ label: "Marcar firmado", status: "signed" }, { label: "Terminar", status: "terminated", variant: "destructive" }],
    signed: [{ label: "Ejecutar contrato", status: "executed" }, { label: "Terminar", status: "terminated", variant: "destructive" }],
    executed: [{ label: "Marcar vencido", status: "expired", variant: "outline" }, { label: "Terminar", status: "terminated", variant: "destructive" }],
    expired: [],
    terminated: [],
  };

  const actions = NEXT_ACTIONS[contract.status] ?? [];
  const isTerminal = ["executed", "expired", "terminated"].includes(contract.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground font-mono">{contract.contract_number}</span>
            <StatusBadge status={contract.status} />
          </div>
          <h2 className="text-lg font-bold leading-snug">{contract.title}</h2>
          {contract.description && (
            <p className="text-sm text-muted-foreground mt-1">{contract.description}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Valor</p>
          <p className="font-semibold">{fmt(contract.value, contract.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Inicio</p>
          <p className="font-semibold">{fmtDate(contract.start_date)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vencimiento</p>
          <p className="font-semibold">{fmtDate(contract.end_date)}</p>
        </div>
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map(action => (
            <Button
              key={action.status}
              size="sm"
              variant={action.variant ?? "default"}
              disabled={transition.isPending}
              onClick={() => transition.mutate(action.status)}
            >
              {transition.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {action.label}
            </Button>
          ))}
        </div>
      )}

      <Separator />

      {/* Clauses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Cláusulas ({contract.clauses.length})
          </h3>
          {!isTerminal && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setAddingClause(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          )}
        </div>

        {addingClause && (
          <Card className="mb-4 border-primary/30">
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Título de la cláusula"
                value={newClause.title}
                onChange={e => setNewClause(c => ({ ...c, title: e.target.value }))}
              />
              <Textarea
                placeholder="Texto de la cláusula..."
                rows={4}
                value={newClause.body}
                onChange={e => setNewClause(c => ({ ...c, body: e.target.value }))}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setAddingClause(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={!newClause.title.trim() || addClause.isPending}
                  onClick={() => addClause.mutate()}
                >
                  {addClause.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {contract.clauses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Sin cláusulas. Agrega la primera.</p>
        ) : (
          <div className="space-y-3">
            {contract.clauses.map((clause, i) => (
              <Card key={clause.id} className="border border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Cláusula {i + 1}
                      </p>
                      <p className="font-semibold text-sm">{clause.title}</p>
                      {clause.body && (
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {clause.body}
                        </p>
                      )}
                    </div>
                    {!isTerminal && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteClause.mutate(clause.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {contract.notes && (
        <>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Notas</p>
            <p className="text-sm leading-relaxed">{contract.notes}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const Contracts = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => contractsService.getAll(),
    staleTime: 30_000,
  });

  const deleteContract = useMutation({
    mutationFn: (id: string) => contractsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      if (selectedId) setSelectedId(null);
      toast({ title: "Contrato eliminado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: translateApiError(e), variant: "destructive" }),
  });

  // KPIs
  const total = contracts.length;
  const active = contracts.filter(c => ["draft", "sent", "signed"].includes(c.status)).length;
  const executed = contracts.filter(c => c.status === "executed").length;
  const totalValue = contracts
    .filter(c => c.status !== "terminated")
    .reduce((s, c) => s + (c.value ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestión del ciclo de vida de contratos con clientes.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo contrato
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total contratos", value: String(total), icon: FileSignature, color: "bg-primary/10 text-primary" },
          { label: "En proceso", value: String(active), icon: Clock, color: "bg-blue-100 text-blue-600" },
          { label: "Ejecutados", value: String(executed), icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
          { label: "Valor total", value: fmt(totalValue), icon: DollarSign, color: "bg-violet-100 text-violet-600" },
        ].map(k => (
          <Card key={k.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold mt-1">{isLoading ? "—" : k.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${k.color}`}>
                  <k.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content */}
      <div className={`grid gap-6 ${selectedId ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Todos los contratos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : contracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <FileSignature className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Sin contratos aún.</p>
                <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                  Crear el primero
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Número</TableHead>
                    <TableHead className="text-xs">Título</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs">Vence</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map(c => (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer ${selectedId === c.id ? "bg-muted/50" : ""}`}
                      onClick={() => setSelectedId(id => id === c.id ? null : c.id)}
                    >
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {c.contract_number}
                      </TableCell>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">
                        {c.title}
                      </TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {fmt(c.value, c.currency)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(c.end_date)}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedId(c.id)}>
                              <ChevronRight className="h-3.5 w-3.5 mr-2" /> Ver detalle
                            </DropdownMenuItem>
                            {c.status === "draft" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => deleteContract.mutate(c.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        {selectedId && (
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <ContractDetail
                contractId={selectedId}
                onClose={() => setSelectedId(null)}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <CreateContractDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
};

export default Contracts;
