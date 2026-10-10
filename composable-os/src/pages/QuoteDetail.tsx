import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  salesService,
  type Quote,
  type QuoteLine,
  type QuoteLineUpdateDto,
  type QuoteEvent,
} from "@/services/sales";
import { portalService, type PortalSession } from "@/services/portal";
import { QuoteStatusBadge } from "@/components/sales/QuoteStatusBadge";
import { useQuoteEventText } from "@/components/sales/useQuoteEventText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { translateApiError } from "@/lib/errors";
import { ArrowLeft, Plus, Trash2, Download, Loader2, Share2, Copy, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES } from "@/i18n";
import { languageName } from "@/i18n/languageName";
import { catalogueFor } from "@/i18n/locale";
import { useFormat } from "@/i18n/useFormat";
import { useT } from "@/i18n/useT";

// ── Helpers ──────────────────────────────────────────────────────────────────


function calcLineAmount(qty: number, price: number, disc: number, tax: number): number {
  const pretax = qty * price * (1 - disc / 100);
  return pretax * (1 + tax / 100);
}

// ── Inline editable cell ──────────────────────────────────────────────────────

interface EditableCellProps {
  value: string | number;
  lineId: string;
  field: keyof QuoteLineUpdateDto;
  disabled: boolean;
  type?: "text" | "number";
  className?: string;
  onSave: (lineId: string, field: keyof QuoteLineUpdateDto, value: string | number) => void;
}

function EditableCell({ value, lineId, field, disabled, type = "text", className = "", onSave }: EditableCellProps) {
  if (disabled) {
    return <span className={`text-xs ${className}`}>{value ?? "—"}</span>;
  }
  return (
    <Input
      key={`${lineId}-${field}-${String(value)}`}
      type={type}
      defaultValue={String(value ?? "")}
      onBlur={(e) => {
        const raw = e.target.value;
        const parsed = type === "number" ? parseFloat(raw) : raw;
        if (String(parsed) !== String(value)) {
          onSave(lineId, field, parsed);
        }
      }}
      className={`h-7 text-xs px-1 min-w-0 ${className}`}
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function QuoteDetail() {
  const t = useT();
  const { formatCurrency, formatDate, formatDateTime, formatUnit } = useFormat();
  const fmtCurrency = (n: number) => formatCurrency(n, "USD");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => salesService.getQuote(id!),
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ["quote-history", id],
    queryFn: () => salesService.getQuoteHistory(id!),
    enabled: !!id,
  });
  const eventText = useQuoteEventText();

  const invalidateQuote = () => {
    qc.invalidateQueries({ queryKey: ["quote", id] });
    qc.invalidateQueries({ queryKey: ["quote-history", id] });
  };

  // ── Line mutations ─────────────────────────────────────────────────────────

  const updateLineMutation = useMutation({
    mutationFn: ({ lineId, data }: { lineId: string; data: QuoteLineUpdateDto }) =>
      salesService.updateLine(id!, lineId, data),
    onSuccess: invalidateQuote,
    onError: (e: Error) => toast.error(t("sales:detail.toast.saveFailed", { message: translateApiError(e) })),
  });

  const addLineMutation = useMutation({
    mutationFn: () =>
      salesService.addLine(id!, {
        description: t("sales:detail.lines.newLine"),
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        line_order: (quote?.lines.length ?? 0) + 1,
      }),
    onSuccess: invalidateQuote,
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const removeLineMutation = useMutation({
    mutationFn: (lineId: string) => salesService.removeLine(id!, lineId),
    onSuccess: invalidateQuote,
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  // ── Quote-level mutations ──────────────────────────────────────────────────

  const updateQuoteMutation = useMutation({
    mutationFn: (data: Parameters<typeof salesService.updateQuote>[1]) =>
      salesService.updateQuote(id!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote", id] }),
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const sendMutation = useMutation({
    mutationFn: () => salesService.sendQuote(id!),
    onSuccess: () => { invalidateQuote(); toast.success(t("sales:toast.quoteSent")); },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const acceptMutation = useMutation({
    mutationFn: () => salesService.acceptQuote(id!),
    onSuccess: () => {
      invalidateQuote();
      qc.invalidateQueries({ queryKey: ["sales-quotes"] });
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      toast.success(t("sales:toast.quoteAccepted"));
    },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => salesService.rejectQuote(id!),
    onSuccess: () => { invalidateQuote(); toast.success(t("sales:toast.quoteRejected")); },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCellSave(lineId: string, field: keyof QuoteLineUpdateDto, value: string | number) {
    updateLineMutation.mutate({ lineId, data: { [field]: value } });
  }

  const isDraft = quote?.status === "draft";

  // ── Share portal state ─────────────────────────────────────────────────────

  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareName, setShareName] = useState("");
  const [shareDays, setShareDays] = useState<7 | 14 | 30>(14);
  // `null` = no lo ha tocado: se propone el idioma de la interfaz, que es en el que el
  // vendedor suele escribirle al cliente. Se manda siempre un idioma concreto.
  const { i18n } = useTranslation();
  const [shareLocale, setShareLocale] = useState<string | null>(null);
  const clientLocale = shareLocale ?? catalogueFor(i18n.language, SUPPORTED_LOCALES);

  const { data: sessions = [] } = useQuery({
    queryKey: ["portal-sessions", id],
    queryFn: () => portalService.getSessions(id!),
    enabled: !!id,
  });

  const activeSession: PortalSession | undefined = sessions.find(
    (s) => s.action === null && new Date(s.expires_at) > new Date()
  );

  const copyLinkMutation = useMutation({
    mutationFn: () =>
      activeSession
        ? Promise.resolve(activeSession)
        : portalService.createSession({
            quote_id: id!,
            client_name: shareName || undefined,
            client_email: shareEmail || undefined,
            locale: clientLocale,
            expire_hours: shareDays * 24,
          }),
    onSuccess: (s) => {
      if (!activeSession) qc.invalidateQueries({ queryKey: ["portal-sessions", id] });
      navigator.clipboard.writeText(s.portal_url).catch(() => {
        toast.warning(t("sales:detail.toast.copyFailed"));
      });
      toast.success(t("sales:detail.toast.linkCopied"));
    },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const sendPortalEmailMutation = useMutation({
    mutationFn: async () => {
      const s = await portalService.createSession({
        quote_id: id!,
        client_name: shareName || undefined,
        client_email: shareEmail || undefined,
        locale: clientLocale,
        expire_hours: shareDays * 24,
      });
      return portalService.sendEmail(s.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-sessions", id] });
      toast.success(t("sales:detail.toast.emailSent", { email: shareEmail }));
      setShareOpen(false);
    },
    onError: (e: Error) => toast.error(translateApiError(e)),
  });

  const canShare = quote ? ["draft", "sent"].includes(quote.status) : false;

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-muted-foreground">{t("sales:detail.notFound")}</p>
        <Button variant="outline" onClick={() => navigate("/sales")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {t("sales:detail.backToSales")}
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("sales:detail.back")}
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{quote.quote_number}</span>
              <QuoteStatusBadge status={quote.status} />
            </div>
            <h1 className="text-xl font-semibold mt-0.5">{quote.title}</h1>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {quote.status === "draft" && (
            <Button
              size="sm"
              disabled={sendMutation.isPending || !quote.lines.length}
              onClick={() => sendMutation.mutate()}
            >
              {sendMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {t("sales:detail.send")}
            </Button>
          )}
          {quote.status === "sent" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-700 border-green-300 hover:bg-green-50"
                disabled={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate()}
              >
                {t("sales:detail.accept")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-50"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
              >
                {t("sales:detail.reject")}
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(salesService.getQuotePdfUrl(id!), "_blank")}
          >
            <Download className="h-3 w-3 mr-1" /> {t("sales:detail.pdf")}
          </Button>
          <Button
            size="sm"
            variant={canShare ? "default" : "outline"}
            disabled={!canShare}
            title={!canShare ? t("sales:detail.alreadyProcessed") : undefined}
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-3 w-3 mr-1" /> {t("sales:detail.share")}
          </Button>
        </div>
      </div>

      {/* Active portal session banner */}
      {activeSession && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-emerald-300/40 bg-emerald-500/10 text-sm">
          <span className="text-emerald-400 text-xs">
            {activeSession.client_email
              ? t("sales:detail.activeLinkSentTo", { email: activeSession.client_email, date: formatDate(activeSession.expires_at, "medium") })
              : t("sales:detail.activeLink", { date: formatDate(activeSession.expires_at, "medium") })}
          </span>
          <button
            className="text-blue-400 text-xs hover:underline"
            onClick={() => setShareOpen(true)}
          >
            {t("sales:detail.resend")}
          </button>
        </div>
      )}

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={(o) => { setShareOpen(o); if (!o) { setShareEmail(""); setShareName(""); setShareDays(14); setShareLocale(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("sales:detail.shareDialog.title")}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {quote?.quote_number} · {quote?.title} · {quote ? formatCurrency(quote.total, quote.currency) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="share-name" className="text-xs">{t("sales:detail.shareDialog.clientName")}</Label>
              <Input
                id="share-name"
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
                placeholder={t("sales:detail.shareDialog.namePlaceholder")}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="share-email" className="text-xs">
                {t("sales:detail.shareDialog.clientEmail")} <span className="text-red-400">*</span>
              </Label>
              <Input
                id="share-email"
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder={t("sales:detail.shareDialog.emailPlaceholder")}
                className="h-8 text-sm"
              />
            </div>
            {/* Como el selector de la interfaz: con un solo idioma ofrecido no hay nada que elegir */}
            {SUPPORTED_LOCALES.length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="share-locale" className="text-xs">{t("sales:detail.shareDialog.clientLanguage")}</Label>
                <select
                  id="share-locale"
                  value={clientLocale}
                  onChange={(e) => setShareLocale(e.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {SUPPORTED_LOCALES.map((code) => (
                    <option key={code} value={code}>{languageName(code)}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">{t("sales:detail.shareDialog.clientLanguageHint")}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sales:detail.shareDialog.validFor")}</Label>
              <div className="flex gap-2">
                {([7, 14, 30] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setShareDays(d)}
                    className={`flex-1 py-1.5 rounded-md text-xs border transition-colors ${
                      shareDays === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {formatUnit(d, "day")}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                disabled={copyLinkMutation.isPending}
                onClick={() => copyLinkMutation.mutate()}
              >
                {copyLinkMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <><Copy className="h-3 w-3 mr-1" /> {t("sales:detail.shareDialog.copyLink")}</>
                }
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs"
                disabled={!shareEmail || sendPortalEmailMutation.isPending}
                onClick={() => sendPortalEmailMutation.mutate()}
              >
                {sendPortalEmailMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <><Mail className="h-3 w-3 mr-1" /> {t("sales:detail.shareDialog.sendEmail")}</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lines table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("sales:detail.lines.title")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-8">{t("sales:detail.lines.index")}</TableHead>
                  <TableHead className="w-24">{t("sales:detail.lines.sku")}</TableHead>
                  <TableHead className="min-w-[180px]">{t("sales:detail.lines.description")}</TableHead>
                  <TableHead className="w-20">{t("sales:detail.lines.unit")}</TableHead>
                  <TableHead className="w-20 text-right">{t("sales:detail.lines.quantity")}</TableHead>
                  <TableHead className="w-24 text-right">{t("sales:detail.lines.unitPrice")}</TableHead>
                  <TableHead className="w-16 text-right">{t("sales:detail.lines.discount")}</TableHead>
                  <TableHead className="w-16 text-right">{t("sales:detail.lines.tax")}</TableHead>
                  <TableHead className="w-28 text-right">{t("sales:detail.lines.lineTotal")}</TableHead>
                  <TableHead className="min-w-[120px]">{t("sales:detail.lines.notes")}</TableHead>
                  {isDraft && <TableHead className="w-8" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.lines.map((line: QuoteLine, idx: number) => {
                  const lineTotal = calcLineAmount(line.quantity, line.unit_price, line.discount_percent, line.tax_percent);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <EditableCell value={line.sku ?? ""} lineId={line.id} field="sku" disabled={!isDraft} onSave={handleCellSave} />
                      </TableCell>
                      <TableCell>
                        <EditableCell value={line.description} lineId={line.id} field="description" disabled={!isDraft} className="w-full" onSave={handleCellSave} />
                      </TableCell>
                      <TableCell>
                        <EditableCell value={line.unit ?? ""} lineId={line.id} field="unit" disabled={!isDraft} onSave={handleCellSave} />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell value={line.quantity} lineId={line.id} field="quantity" type="number" disabled={!isDraft} className="text-right" onSave={handleCellSave} />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell value={line.unit_price} lineId={line.id} field="unit_price" type="number" disabled={!isDraft} className="text-right" onSave={handleCellSave} />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell value={line.discount_percent} lineId={line.id} field="discount_percent" type="number" disabled={!isDraft} className="text-right" onSave={handleCellSave} />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell value={line.tax_percent} lineId={line.id} field="tax_percent" type="number" disabled={!isDraft} className="text-right" onSave={handleCellSave} />
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {fmtCurrency(lineTotal)}
                      </TableCell>
                      <TableCell>
                        <EditableCell value={line.notes ?? ""} lineId={line.id} field="notes" disabled={!isDraft} onSave={handleCellSave} />
                      </TableCell>
                      {isDraft && (
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            disabled={removeLineMutation.isPending}
                            onClick={() => removeLineMutation.mutate(line.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {quote.lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isDraft ? 11 : 10} className="text-center text-muted-foreground text-sm py-8">
                      {isDraft ? t("sales:detail.lines.emptyDraft") : t("sales:detail.lines.empty")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {isDraft && (
            <div className="p-3 border-t">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs"
                disabled={addLineMutation.isPending}
                onClick={() => addLineMutation.mutate()}
              >
                {addLineMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Plus className="h-3 w-3" />}
                {t("sales:detail.lines.add")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="flex justify-end">
        <Card className="w-72">
          <CardContent className="pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("sales:detail.totals.subtotal")}</span>
              <span>{fmtCurrency(quote.subtotal)}</span>
            </div>
            {quote.discount_amount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>{t("sales:detail.totals.discount")}</span>
                <span>-{fmtCurrency(quote.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("sales:detail.totals.taxes")}</span>
              <span>{fmtCurrency(quote.tax_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t pt-1.5 mt-1">
              <span>{t("sales:detail.totals.total")}</span>
              <span>{fmtCurrency(quote.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes & Terms */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("sales:detail.notes.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              key={`notes-${quote.updated_at}`}
              defaultValue={quote.notes ?? ""}
              disabled={!isDraft}
              rows={4}
              placeholder={t("sales:detail.notes.placeholder")}
              onBlur={(e) => {
                if (e.target.value !== (quote.notes ?? "")) {
                  updateQuoteMutation.mutate({ notes: e.target.value });
                }
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("sales:detail.terms.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              key={`terms-${quote.updated_at}`}
              defaultValue={quote.terms ?? ""}
              disabled={!isDraft}
              rows={4}
              placeholder={t("sales:detail.terms.placeholder")}
              onBlur={(e) => {
                if (e.target.value !== (quote.terms ?? "")) {
                  updateQuoteMutation.mutate({ terms: e.target.value });
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("sales:detail.history.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("sales:detail.history.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {history.map((ev: QuoteEvent) => (
                <li key={ev.id} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground text-xs whitespace-nowrap pt-0.5">
                    {formatDateTime(ev.created_at)}
                  </span>
                  <span>{eventText(ev)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
