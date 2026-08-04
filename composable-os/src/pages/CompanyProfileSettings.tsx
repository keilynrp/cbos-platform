import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Upload, Trash2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  accountingService,
  type CompanyProfile,
  type UpdateCompanyProfileDto,
} from "@/services/accounting";

const MAX_LOGO_BYTES = 204_800;
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
  const [form, setForm] = useState<FormState>({});
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
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
      toast({ title: "Datos guardados" });
    },
    onError: (e: Error) =>
      toast({ title: "No se pudo guardar", description: e.message, variant: "destructive" }),
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
        title: "Formato no admitido",
        description: "El logo debe ser PNG o JPG.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({
        title: "Logo demasiado grande",
        description: `Pesa ${Math.round(file.size / 1024)} KB y el maximo son 200 KB.`,
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => set("logo_data_uri", reader.result as string);
    reader.onerror = () =>
      toast({ title: "No se pudo leer el archivo", variant: "destructive" });
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Datos de facturación
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Estos datos aparecen como emisor en las facturas impresas y exportadas
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <Save className="h-4 w-4 mr-2" />}
          Guardar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Identidad</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
              {form.logo_data_uri
                ? <img src={form.logo_data_uri} alt="Logo" className="max-h-full max-w-full object-contain" />
                : <Building2 className="h-8 w-8 text-muted-foreground/40" />}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-3.5 w-3.5 mr-1" /> Subir logo
                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onLogoSelected} />
                  </label>
                </Button>
                {form.logo_data_uri && (
                  <Button size="sm" variant="ghost" onClick={() => set("logo_data_uri", null)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Quitar
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG o JPG, máximo 200 KB</p>
            </div>
          </div>

          <Field label="Razón social">
            <Input value={form.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} placeholder="Mi Empresa S.A. de C.V." />
          </Field>

          <div className="grid grid-cols-[120px_1fr] gap-3">
            <Field label="Tipo de ID">
              <Select value={form.tax_id_label ?? "RFC"} onValueChange={(v) => set("tax_id_label", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["RFC", "NIT", "CUIT", "RUC", "VAT", "EIN"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Identificador fiscal">
              <Input value={form.tax_id ?? ""} onChange={(e) => set("tax_id", e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Dirección</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Calle y número">
            <Input value={form.address_line ?? ""} onChange={(e) => set("address_line", e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ciudad">
              <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Estado / Provincia">
              <Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label="Código postal">
              <Input value={form.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} />
            </Field>
          </div>
          <Field label="País">
            <Input value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Contacto</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <Field label="Email">
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Sitio web">
            <Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Valores por defecto</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Moneda">
              <Select value={form.default_currency ?? "USD"} onValueChange={(v) => set("default_currency", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USD", "MXN", "EUR", "COP", "BRL"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="IVA por defecto (%)">
              <Input
                type="number" min="0" max="100" step="0.1"
                value={form.default_tax_rate ?? 0}
                onChange={(e) => set("default_tax_rate", parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
          <Field label="Nota al pie de la factura">
            <Textarea
              rows={2}
              placeholder="Gracias por su preferencia · Condiciones de pago…"
              value={form.invoice_footer_note ?? ""}
              onChange={(e) => set("invoice_footer_note", e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}
