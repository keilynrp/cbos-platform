import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Upload, Trash2, Loader2, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/i18n/useT";
import { translateApiError } from "@/lib/errors";
import {
  accountingService,
  type CompanyProfile,
  type UpdateCompanyProfileDto,
} from "@/services/accounting";

const MAX_LOGO_BYTES = 204_800;
const MAX_LOGO_KB = Math.round(MAX_LOGO_BYTES / 1024);
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg"];

type FormState = UpdateCompanyProfileDto;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function CompanyProfileSettings() {
  const t = useT();
  const [form, setForm] = useState<FormState>({});
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profile, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["company-profile"],
    queryFn: () => accountingService.getCompanyProfile(),
  });

  // Seed the form once the profile arrives.
  useEffect(() => {
    if (profile) {
      const { id, workspace_id, created_at, updated_at, ...rest } = profile;
      setForm(rest);
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: () => accountingService.updateCompanyProfile(form),
    onSuccess: (updated: CompanyProfile) => {
      qc.setQueryData(["company-profile"], updated);
      toast({ title: t("companyProfile:saved") });
    },
    onError: (e: Error) =>
      toast({ title: t("companyProfile:saveFailed"), description: translateApiError(e), variant: "destructive" }),
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    // Validate before uploading so the user gets instant feedback.
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast({
        title: t("companyProfile:logo.badFormatTitle"),
        description: t("companyProfile:logo.badFormat"),
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({
        title: t("companyProfile:logo.tooBigTitle"),
        description: t("companyProfile:logo.tooBig", { size: Math.round(file.size / 1024), max: MAX_LOGO_KB }),
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => set("logo_data_uri", reader.result as string);
    reader.onerror = () =>
      toast({ title: t("companyProfile:logo.readFailed"), variant: "destructive" });
    reader.readAsDataURL(file);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Without this the form would render empty on a failed load, which reads as
  // "nothing is configured yet" rather than "we could not read your data".
  if (isError) {
    return (
      <Card className="max-w-3xl">
        <CardContent className="py-10 flex flex-col items-center text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium">{t("companyProfile:loadFailed")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {translateApiError(error, t("companyProfile:unknownError"))}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("companyProfile:retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> {t("companyProfile:title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("companyProfile:subtitle")}
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <Save className="h-4 w-4 mr-2" />}
          {t("companyProfile:save")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{t("companyProfile:identity.title")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
              {form.logo_data_uri
                ? <img src={form.logo_data_uri} alt={t("companyProfile:identity.logoAlt")} className="max-h-full max-w-full object-contain" />
                : <Building2 className="h-8 w-8 text-muted-foreground/40" />}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-3.5 w-3.5 mr-1" /> {t("companyProfile:identity.upload")}
                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onLogoSelected} />
                  </label>
                </Button>
                {form.logo_data_uri && (
                  <Button size="sm" variant="ghost" onClick={() => set("logo_data_uri", null)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("companyProfile:identity.remove")}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("companyProfile:identity.hint", { max: MAX_LOGO_KB })}</p>
            </div>
          </div>

          <Field label={t("companyProfile:identity.legalName")}>
            <Input value={form.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} placeholder={t("companyProfile:identity.legalNamePlaceholder")} />
          </Field>

          <div className="grid grid-cols-[120px_1fr] gap-3">
            <Field label={t("companyProfile:identity.taxIdType")}>
              <Select value={form.tax_id_label ?? "RFC"} onValueChange={(v) => set("tax_id_label", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["RFC", "NIT", "CUIT", "RUC", "VAT", "EIN"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("companyProfile:identity.taxId")}>
              <Input value={form.tax_id ?? ""} onChange={(e) => set("tax_id", e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{t("companyProfile:address.title")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label={t("companyProfile:address.line")}>
            <Input value={form.address_line ?? ""} onChange={(e) => set("address_line", e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("companyProfile:address.city")}>
              <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label={t("companyProfile:address.state")}>
              <Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label={t("companyProfile:address.postalCode")}>
              <Input value={form.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} />
            </Field>
          </div>
          <Field label={t("companyProfile:address.country")}>
            <Input value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{t("companyProfile:contact.title")}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <Field label={t("companyProfile:contact.email")}>
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label={t("companyProfile:contact.phone")}>
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label={t("companyProfile:contact.website")}>
            <Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{t("companyProfile:defaults.title")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("companyProfile:defaults.currency")}>
              <Select value={form.default_currency ?? "USD"} onValueChange={(v) => set("default_currency", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USD", "MXN", "EUR", "COP", "BRL"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("companyProfile:defaults.taxRate")}>
              <Input
                type="number" min="0" max="100" step="0.1"
                value={form.default_tax_rate ?? 0}
                onChange={(e) => set("default_tax_rate", parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
          <Field label={t("companyProfile:defaults.footerNote")}>
            <Textarea
              rows={2}
              placeholder={t("companyProfile:defaults.footerNotePlaceholder")}
              value={form.invoice_footer_note ?? ""}
              onChange={(e) => set("invoice_footer_note", e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}
