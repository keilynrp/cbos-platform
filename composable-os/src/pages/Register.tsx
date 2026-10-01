import { useState } from "react";
import { useT } from "@/i18n/useT";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, RegisterData } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Loader2, Zap } from "lucide-react";
import { translateApiError } from "@/lib/errors";

/** Longitud minima de la contrasena; la validacion y el placeholder la comparten. */
const MIN_PASSWORD_LENGTH = 8;

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export default function Register() {
  const t = useT();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterData>({
    workspace_name: "",
    workspace_slug: "",
    full_name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: keyof RegisterData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "workspace_name") next.workspace_slug = toSlug(value);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(t("auth:register.passwordTooShort", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.workspace_slug)) {
      setError(t("auth:register.invalidSlug"));
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(translateApiError(err, t("auth:register.failed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground">
            <Zap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CBOS Platform</h1> {/* i18n-ok: nombre del producto */}
          <p className="text-sm text-muted-foreground">{t("auth:register.tagline")}</p>
        </div>

        <Card className="border border-border/60 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t("auth:register.title")}</CardTitle>
            <CardDescription>{t("auth:register.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Workspace */}
              <div className="space-y-1.5">
                <Label htmlFor="workspace_name">{t("auth:register.workspaceName")}</Label>
                <Input
                  id="workspace_name"
                  placeholder={t("auth:register.workspaceNamePlaceholder")}
                  value={form.workspace_name}
                  onChange={set("workspace_name")}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workspace_slug">
                  {t("auth:register.workspaceSlug")}
                  <span className="text-xs text-muted-foreground ml-1">{t("auth:register.workspaceSlugHint")}</span>
                </Label>
                <Input
                  id="workspace_slug"
                  placeholder={t("auth:register.workspaceSlugPlaceholder")}
                  value={form.workspace_slug}
                  onChange={set("workspace_slug")}
                  required
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                {/* Usuario */}
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">{t("auth:register.fullName")}</Label>
                  <Input
                    id="full_name"
                    placeholder={t("auth:register.fullNamePlaceholder")}
                    value={form.full_name}
                    onChange={set("full_name")}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("auth:register.emailLabel")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth:register.emailPlaceholder")}
                    value={form.email}
                    onChange={set("email")}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("auth:register.passwordLabel")}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("auth:register.passwordPlaceholder", { min: MIN_PASSWORD_LENGTH })}
                    value={form.password}
                    onChange={set("password")}
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? t("auth:register.submitting") : t("auth:register.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth:register.haveAccount")}{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            {t("auth:register.signIn")}
          </Link>
        </p>
        <LanguageSelector className="justify-center" />
      </div>
    </div>
  );
}
