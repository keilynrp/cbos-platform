import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, RegisterData } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap } from "lucide-react";

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
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.workspace_slug)) {
      setError("El slug solo puede contener letras minúsculas, números y guiones.");
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar. Intenta de nuevo.");
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
          <h1 className="text-2xl font-bold tracking-tight">CBOS Platform</h1>
          <p className="text-sm text-muted-foreground">Crea tu workspace</p>
        </div>

        <Card className="border border-border/60 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Crear cuenta</CardTitle>
            <CardDescription>Completa los datos para comenzar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Workspace */}
              <div className="space-y-1.5">
                <Label htmlFor="workspace_name">Nombre del workspace</Label>
                <Input
                  id="workspace_name"
                  placeholder="Mi Empresa S.A."
                  value={form.workspace_name}
                  onChange={set("workspace_name")}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workspace_slug">
                  Slug del workspace
                  <span className="text-xs text-muted-foreground ml-1">(solo minúsculas y guiones)</span>
                </Label>
                <Input
                  id="workspace_slug"
                  placeholder="mi-empresa"
                  value={form.workspace_slug}
                  onChange={set("workspace_slug")}
                  required
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                {/* Usuario */}
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Tu nombre completo</Label>
                  <Input
                    id="full_name"
                    placeholder="Juan Pérez"
                    value={form.full_name}
                    onChange={set("full_name")}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@empresa.com"
                    value={form.email}
                    onChange={set("email")}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
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
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
