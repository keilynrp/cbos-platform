import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  FileText, Plus, DollarSign, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, Send, Trash2, CreditCard, ChevronRight, Loader2,
  MoreHorizontal, Eye, X, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { translateApiError } from "@/lib/errors";
import { todayInputValue } from "@/i18n/format";
import { useFormat } from "@/i18n/useFormat";
import { useEnumLabel } from "@/i18n/enumLabel";
import { useT } from "@/i18n/useT";
import {
  accountingService,
  type InvoiceListItem,
  type Invoice,
  type CreateInvoiceLineDto,
} from "@/services/accounting";

// ── Helpers ─────────────────────────────────────────────────────────────────

// El texto del estado sale del catalogo (common:invoiceStatus); aqui solo el aspecto.
const STATUS_META: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.FC<{ className?: string }> }> = {
  draft:      { variant: "secondary",    icon: FileText },
  sent:       { variant: "outline",      icon: Send },
  paid:       { variant: "default",      icon: CheckCircle2 },
  partial:    { variant: "outline",      icon: CreditCard },
  overdue:    { variant: "destructive",  icon: AlertTriangle },
  cancelled:  { variant: "secondary",    icon: X },
  void:       { variant: "secondary",    icon: X },
};

function StatusBadge({ status }: { status: string }) {
  const label = useEnumLabel();
  const meta = STATUS_META[status] ?? { variant: "secondary" as const, icon: FileText };
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className="gap-1 text-[10px]">
      <Icon className="h-2.5 w-2.5" /> {label("common:invoiceStatus", status)}
    </Badge>
  );
}

// ── Invoice Detail Sheet ─────────────────────────────────────────────────────
function InvoiceDetail({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const t = useT();
  const label = useEnumLabel();
  const { formatCurrency: fmt, formatDate: fmtDate } = useFormat();
  const [payForm, setPayForm] = useState({ amount: String(invoice.amount_due), method: "transfer", reference: "", date: todayInputValue() });
  const [payOpen, setPayOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: (status: string) => accountingService.updateInvoice(invoice.id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["accounting-summary"] });
      toast({ title: t("invoicing:toast.statusUpdated") });
    },
    onError: (e: Error) => toast({ title: t("common:error.title"), description: translateApiError(e), variant: "destructive" }),
  });

  const recordPayment = useMutation({
    mutationFn: () => accountingService.recordPayment(invoice.id, {
      amount: parseFloat(payForm.amount),
      method: payForm.method,
      reference: payForm.reference || undefined,
      payment_date: payForm.date,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["accounting-summary"] });
      setPayOpen(false);
      toast({
        title: t("invoicing:toast.paymentRecorded"),
        description: t("invoicing:toast.paymentRecordedBody", { amount: fmt(parseFloat(payForm.amount)) }),
      });
    },
    onError: (e: Error) => toast({ title: t("common:error.title"), description: translateApiError(e), variant: "destructive" }),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between p-4 border-b">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-bold">{invoice.invoice_number}</span>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("invoicing:detail.issuedDue", { issued: fmtDate(invoice.issue_date), due: invoice.due_date ? fmtDate(invoice.due_date) : "—" })}
          </p>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={t("common:close")} onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Amounts */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">{t("invoicing:detail.total")}</p>
            <p className="text-sm font-bold">{fmt(invoice.total, invoice.currency)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">{t("invoicing:detail.paid")}</p>
            <p className="text-sm font-bold text-green-700">{fmt(invoice.amount_paid, invoice.currency)}</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${invoice.amount_due > 0 ? "bg-red-50" : "bg-muted/50"}`}>
            <p className="text-[10px] text-muted-foreground mb-0.5">{t("invoicing:detail.due")}</p>
            <p className={`text-sm font-bold ${invoice.amount_due > 0 ? "text-red-700" : ""}`}>{fmt(invoice.amount_due, invoice.currency)}</p>
          </div>
        </div>

        {/* Lines */}
        {invoice.lines.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("invoicing:detail.lines")}</p>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t("invoicing:detail.description")}</TableHead>
                    <TableHead className="text-xs text-right">{t("invoicing:detail.quantity")}</TableHead>
                    <TableHead className="text-xs text-right">{t("invoicing:detail.unitPrice")}</TableHead>
                    <TableHead className="text-xs text-right">{t("invoicing:detail.subtotal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.description}</TableCell>
                      <TableCell className="text-xs text-right">{l.quantity}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(l.unit_price, invoice.currency)}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{fmt(l.subtotal, invoice.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-2 space-y-1 text-xs text-right">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("invoicing:detail.subtotal")}</span><span>{fmt(invoice.subtotal, invoice.currency)}</span></div>
              {invoice.discount_amount > 0 && <div className="flex justify-between text-green-600"><span>{t("invoicing:detail.discount")}</span><span>-{fmt(invoice.discount_amount, invoice.currency)}</span></div>}
              {invoice.tax_rate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t("invoicing:detail.tax", { rate: invoice.tax_rate })}</span><span>{fmt(invoice.tax_amount, invoice.currency)}</span></div>}
              <Separator />
              <div className="flex justify-between font-bold text-sm"><span>{t("invoicing:detail.grandTotal")}</span><span>{fmt(invoice.total, invoice.currency)}</span></div>
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{t("invoicing:detail.notes")}</p>
            <p className="text-xs bg-muted/50 rounded-lg p-3">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t flex gap-2 flex-wrap">
        {invoice.status === "draft" && (
          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate("sent")} disabled={updateStatus.isPending}>
            <Send className="h-3.5 w-3.5 mr-1" /> {t("invoicing:detail.markSent")}
          </Button>
        )}
        {["sent", "partial", "overdue"].includes(invoice.status) && invoice.amount_due > 0 && (
          <Button size="sm" onClick={() => setPayOpen(true)}>
            <CreditCard className="h-3.5 w-3.5 mr-1" /> {t("invoicing:detail.recordPayment")}
          </Button>
        )}
        {["draft", "sent"].includes(invoice.status) && (
          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate("cancelled")} disabled={updateStatus.isPending}>
            <X className="h-3.5 w-3.5 mr-1" /> {t("invoicing:cancel")}
          </Button>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("invoicing:payment.title")}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("invoicing:payment.amount")}</label>
              <Input type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("invoicing:payment.method")}</label>
              <Select value={payForm.method} onValueChange={(v) => setPayForm((f) => ({ ...f, method: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["transfer", "cash", "card", "check", "crypto", "other"].map((m) => (
                    <SelectItem key={m} value={m}>{label("invoicing:paymentMethod", m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("invoicing:payment.reference")}</label>
              <Input placeholder={t("invoicing:payment.referencePlaceholder")} value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("invoicing:payment.date")}</label>
              <Input type="date" value={payForm.date} onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>{t("invoicing:cancel")}</Button>
            <Button onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending || !payForm.amount}>
              {recordPayment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("invoicing:payment.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── New Invoice Dialog ────────────────────────────────────────────────────────
function NewInvoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT();
  const { formatCurrency: fmt } = useFormat();
  const today = todayInputValue();
  const [form, setForm] = useState({
    issue_date: today,
    due_date: "",
    currency: "USD",
    tax_rate: "0",
    discount_amount: "0",
    notes: "",
  });
  const [lines, setLines] = useState<Array<{ description: string; quantity: string; unit_price: string; discount_pct: string }>>([
    { description: "", quantity: "1", unit_price: "0", discount_pct: "0" },
  ]);
  const { toast } = useToast();
  const qc = useQueryClient();

  const createInvoice = useMutation({
    mutationFn: () => accountingService.createInvoice({
      issue_date: form.issue_date,
      due_date: form.due_date || undefined,
      currency: form.currency,
      tax_rate: parseFloat(form.tax_rate) || 0,
      discount_amount: parseFloat(form.discount_amount) || 0,
      notes: form.notes || undefined,
      lines: lines
        .filter((l) => l.description.trim())
        .map((l, i): CreateInvoiceLineDto => ({
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          discount_pct: parseFloat(l.discount_pct) || 0,
          line_order: i,
        })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["accounting-summary"] });
      onOpenChange(false);
      toast({ title: t("invoicing:toast.created") });
    },
    onError: (e: Error) => toast({ title: t("common:error.title"), description: translateApiError(e), variant: "destructive" }),
  });

  const lineTotal = lines.reduce((sum, l) => {
    const q = parseFloat(l.quantity) || 0;
    const p = parseFloat(l.unit_price) || 0;
    const d = parseFloat(l.discount_pct) || 0;
    return sum + q * p * (1 - d / 100);
  }, 0);
  const taxAmt = lineTotal * (parseFloat(form.tax_rate) / 100 || 0);
  const grandTotal = lineTotal - (parseFloat(form.discount_amount) || 0) + taxAmt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> {t("invoicing:newDialog.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("invoicing:newDialog.issueDate")}</label>
              <Input type="date" value={form.issue_date} onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("invoicing:newDialog.dueDate")}</label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("invoicing:newDialog.currency")}</label>
              <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USD", "MXN", "EUR", "COP", "BRL"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t("invoicing:newDialog.tax")}</label>
              <Input type="number" step="0.1" min="0" max="100" value={form.tax_rate} onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))} />
            </div>
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{t("invoicing:newDialog.lines")}</p>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setLines((l) => [...l, { description: "", quantity: "1", unit_price: "0", discount_pct: "0" }])}>
                <Plus className="h-3 w-3 mr-1" /> {t("invoicing:newDialog.add")}
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_90px_60px_28px] gap-1.5 items-center">
                  <Input
                    placeholder={t("invoicing:newDialog.linePlaceholder")}
                    value={line.description}
                    onChange={(e) => setLines((ls) => ls.map((l, j) => j === i ? { ...l, description: e.target.value } : l))}
                    className="text-xs h-8"
                  />
                  <Input
                    type="number" min="0.01" step="0.01"
                    value={line.quantity}
                    onChange={(e) => setLines((ls) => ls.map((l, j) => j === i ? { ...l, quantity: e.target.value } : l))}
                    className="text-xs h-8 text-center"
                  />
                  <Input
                    type="number" min="0" step="0.01"
                    value={line.unit_price}
                    onChange={(e) => setLines((ls) => ls.map((l, j) => j === i ? { ...l, unit_price: e.target.value } : l))}
                    className="text-xs h-8"
                  />
                  <Input
                    type="number" min="0" max="100" step="1"
                    value={line.discount_pct}
                    onChange={(e) => setLines((ls) => ls.map((l, j) => j === i ? { ...l, discount_pct: e.target.value } : l))}
                    className="text-xs h-8 text-center"
                  />
                  <Button
                    size="icon" variant="ghost" className="h-8 w-7"
                    aria-label={t("invoicing:newDialog.removeLine")}
                    disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_60px_90px_60px_28px] gap-1.5 text-[10px] text-muted-foreground px-1">
                <span>{t("invoicing:newDialog.colDescription")}</span><span className="text-center">{t("invoicing:newDialog.colQuantity")}</span><span>{t("invoicing:newDialog.colUnitPrice")}</span><span className="text-center">{t("invoicing:newDialog.colDiscount")}</span><span />
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("invoicing:newDialog.subtotal")}</span><span>{fmt(lineTotal, form.currency)}</span></div>
            {parseFloat(form.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600"><span>{t("invoicing:newDialog.discount")}</span><span>-{fmt(parseFloat(form.discount_amount), form.currency)}</span></div>
            )}
            {parseFloat(form.tax_rate) > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">{t("invoicing:newDialog.taxLine", { rate: form.tax_rate })}</span><span>{fmt(taxAmt, form.currency)}</span></div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-sm"><span>{t("invoicing:newDialog.total")}</span><span>{fmt(grandTotal, form.currency)}</span></div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t("invoicing:newDialog.notes")}</label>
            <Textarea placeholder={t("invoicing:newDialog.notesPlaceholder")} rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("invoicing:cancel")}</Button>
          <Button onClick={() => createInvoice.mutate()} disabled={createInvoice.isPending || !form.issue_date}>
            {createInvoice.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-2" />}
            {t("invoicing:newDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Invoicing() {
  const t = useT();
  const label = useEnumLabel();
  const { formatCurrency: fmt, formatDate: fmtDate } = useFormat();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["accounting-summary"],
    queryFn: accountingService.getSummary,
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices", statusFilter],
    queryFn: () => accountingService.listInvoices(statusFilter === "all" ? undefined : statusFilter),
  });

  const { data: invoiceDetail } = useQuery({
    queryKey: ["invoice", selectedId],
    queryFn: () => accountingService.getInvoice(selectedId!),
    enabled: !!selectedId,
  });

  const deleteInvoice = useMutation({
    mutationFn: (id: string) => accountingService.deleteInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["accounting-summary"] });
      if (selectedId) setSelectedId(null);
      toast({ title: t("invoicing:toast.deleted") });
    },
    onError: (e: Error) => toast({ title: t("invoicing:toast.cannotDelete"), description: translateApiError(e), variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("invoicing:title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("invoicing:subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/settings/company">
              <Building2 className="h-4 w-4 mr-2" /> {t("invoicing:companyData")}
            </Link>
          </Button>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> {t("invoicing:newInvoice")}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loadingSummary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-8 w-24 mb-2" /><Skeleton className="h-4 w-16" /></CardContent></Card>
          ))
        ) : summary ? (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{t("invoicing:kpi.invoiced")}</span>
                </div>
                <p className="text-xl font-bold">{fmt(summary.total_invoiced)}</p>
                <p className="text-xs text-muted-foreground">{t("invoicing:kpi.paidCount", { count: summary.paid_count })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">{t("invoicing:kpi.collected")}</span>
                </div>
                <p className="text-xl font-bold text-green-700">{fmt(summary.total_paid)}</p>
                <p className="text-xs text-muted-foreground">{t("invoicing:kpi.inProgress", { count: summary.sent_count })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">{t("invoicing:kpi.outstanding")}</span>
                </div>
                <p className="text-xl font-bold">{fmt(summary.total_outstanding)}</p>
                <p className="text-xs text-muted-foreground">{t("invoicing:kpi.drafts", { count: summary.draft_count })}</p>
              </CardContent>
            </Card>
            <Card className={summary.overdue_count > 0 ? "border-red-200" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`h-4 w-4 ${summary.overdue_count > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                  <span className="text-xs text-muted-foreground">{t("invoicing:kpi.overdue")}</span>
                </div>
                <p className={`text-xl font-bold ${summary.overdue_count > 0 ? "text-red-600" : ""}`}>{fmt(summary.overdue_amount)}</p>
                <p className="text-xs text-muted-foreground">{t("invoicing:kpi.overdueCount", { count: summary.overdue_count })}</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Invoice Table + Detail */}
      <div className={`grid gap-4 ${selectedId ? "grid-cols-[1fr_420px]" : "grid-cols-1"}`}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("invoicing:list.title")}</CardTitle>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="h-7">
                  {["all", "draft", "sent", "partial", "paid", "overdue"].map((s) => (
                    <TabsTrigger key={s} value={s} className="text-[10px] h-6 px-2">
                      {s === "all" ? t("invoicing:list.filterAll") : label("common:invoiceStatus", s)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t("invoicing:list.number")}</TableHead>
                  <TableHead className="text-xs">{t("invoicing:list.status")}</TableHead>
                  <TableHead className="text-xs">{t("invoicing:list.issued")}</TableHead>
                  <TableHead className="text-xs">{t("invoicing:list.due")}</TableHead>
                  <TableHead className="text-xs text-right">{t("invoicing:list.total")}</TableHead>
                  <TableHead className="text-xs text-right">{t("invoicing:list.outstanding")}</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingInvoices ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-12">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      {t("invoicing:list.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className={`cursor-pointer hover:bg-muted/50 ${selectedId === inv.id ? "bg-primary/5" : ""}`}
                      onClick={() => setSelectedId(inv.id === selectedId ? null : inv.id)}
                    >
                      <TableCell className="text-xs font-mono font-medium">{inv.invoice_number}</TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                      <TableCell className="text-xs">{fmtDate(inv.issue_date)}</TableCell>
                      <TableCell className="text-xs">{inv.due_date ? fmtDate(inv.due_date) : "—"}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{fmt(inv.total, inv.currency)}</TableCell>
                      <TableCell className={`text-xs text-right font-medium ${inv.amount_due > 0 ? "text-orange-600" : "text-green-600"}`}>
                        {fmt(inv.amount_due, inv.currency)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={t("invoicing:list.actions")} onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedId(inv.id)}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> {t("invoicing:list.viewDetail")}
                            </DropdownMenuItem>
                            {["draft", "void", "cancelled"].includes(inv.status) && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); deleteInvoice.mutate(inv.id); }}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> {t("invoicing:list.delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail panel */}
        {selectedId && invoiceDetail && (
          <Card className="overflow-hidden">
            <InvoiceDetail invoice={invoiceDetail} onClose={() => setSelectedId(null)} />
          </Card>
        )}
      </div>

      <NewInvoiceDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
