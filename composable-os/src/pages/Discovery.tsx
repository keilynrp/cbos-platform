import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, Send, Sparkles, CheckCircle2, Clock, Package,
  ChevronRight, Loader2, Bot, User, Rocket, X, Building2,
  Users, BarChart3, ArrowRight,
} from "lucide-react";
import type { ApplyResult } from "@/services/discovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  discoveryService,
  type DiscoverySession,
  type DiscoveryMessage,
} from "@/services/discovery";

// ── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const PACKAGE_LABELS: Record<string, { label: string; color: string; price: string }> = {
  starter:        { label: "Starter",      color: "bg-blue-500/10 text-blue-700 border-blue-200",   price: "$49/mes" },
  growth:         { label: "Growth",       color: "bg-green-500/10 text-green-700 border-green-200", price: "$149/mes" },
  operations_plus:{ label: "Operations+", color: "bg-purple-500/10 text-purple-700 border-purple-200", price: "$349/mes" },
};

const INDUSTRY_OPTIONS = [
  { value: "retail",        label: "Retail / Comercio" },
  { value: "manufacturing", label: "Manufactura" },
  { value: "services",      label: "Servicios / Consultoría" },
  { value: "technology",    label: "Tecnología / Software" },
  { value: "healthcare",    label: "Salud / Farmacia" },
  { value: "education",     label: "Educación / Capacitación" },
  { value: "food",          label: "Alimentos / Restaurantes" },
  { value: "construction",  label: "Construcción / Inmobiliaria" },
];

const SIZE_OPTIONS = [
  { value: "nano",   label: "1 persona (solopreneur)" },
  { value: "small",  label: "Pequeña (2–20 personas)" },
  { value: "medium", label: "Mediana (20–100 personas)" },
  { value: "large",  label: "Grande (+100 personas)" },
];

const STARTER_PROMPTS = [
  "Tengo una tienda de ropa y necesito organizar mis ventas y clientes",
  "Soy consultor y necesito gestionar propuestas y facturación",
  "Tenemos una empresa de manufactura con inventario y distribución",
  "Somos una clínica que necesita agendar citas y gestionar pacientes",
];

// ── Main Component ───────────────────────────────────────────────────────────
export default function Discovery() {
  const [selectedSession, setSelectedSession] = useState<DiscoverySession | null>(null);
  const [messages, setMessages] = useState<DiscoveryMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newForm, setNewForm] = useState({ business_description: "", industry: "", company_size: "" });
  const [blueprintData, setBlueprintData] = useState<ReturnType<typeof discoveryService.generateBlueprint> extends Promise<infer T> ? T : never | null>(null as unknown);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["discovery-sessions"],
    queryFn: discoveryService.listSessions,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createSession = useMutation({
    mutationFn: () => discoveryService.createSession({
      business_description: newForm.business_description || undefined,
      industry: newForm.industry || undefined,
      company_size: newForm.company_size || undefined,
    }),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ["discovery-sessions"] });
      setNewSessionOpen(false);
      setNewForm({ business_description: "", industry: "", company_size: "" });
      setSelectedSession(session);
      setMessages([]);
      setBlueprintData(null);
      // If description provided, add it as first user message display
      if (session.business_description) {
        setMessages([{
          id: "init",
          session_id: session.id,
          role: "user",
          content: session.business_description,
          token_count: null,
          created_at: session.created_at,
        }]);
      }
    },
    onError: (err: Error) => toast({ title: "Error al crear sesión", description: err.message, variant: "destructive" }),
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) => discoveryService.sendMessage(selectedSession!.id, content),
    onMutate: (content) => {
      // Optimistic user message
      const optimistic: DiscoveryMessage = {
        id: `opt-${Date.now()}`,
        session_id: selectedSession!.id,
        role: "user",
        content,
        token_count: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
    },
    onSuccess: ({ message, session }) => {
      setMessages((prev) => [...prev, message]);
      setSelectedSession(session);
      qc.invalidateQueries({ queryKey: ["discovery-sessions"] });
    },
    onError: (err: Error) => {
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("opt-")));
      toast({ title: "Error al enviar mensaje", description: err.message, variant: "destructive" });
    },
  });

  const generateBlueprint = useMutation({
    mutationFn: () => discoveryService.generateBlueprint(selectedSession!.id),
    onSuccess: (data) => {
      setBlueprintData(data as unknown);
      setSelectedSession((s) => s ? { ...s, status: "completed", recommended_package: data.recommended_package } : s);
      qc.invalidateQueries({ queryKey: ["discovery-sessions"] });
      toast({ title: "Blueprint generado", description: `Paquete recomendado: ${data.recommended_package}` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const applyBlueprint = useMutation({
    mutationFn: () => discoveryService.applyBlueprint(selectedSession!.id),
    onSuccess: (result) => {
      setApplyResult(result);
      qc.invalidateQueries({ queryKey: ["discovery-sessions"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !selectedSession || sendMessage.isPending) return;
    setInputText("");
    sendMessage.mutate(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectSession = (session: DiscoverySession) => {
    setSelectedSession(session);
    setMessages([]);
    setBlueprintData(null);
  };

  const handleStarterPrompt = (prompt: string) => {
    setNewForm((f) => ({ ...f, business_description: prompt }));
    setNewSessionOpen(true);
  };

  // ── Blueprint panel data ───────────────────────────────────────────────────
  const bp = blueprintData as {
    recommended_package: string;
    matched_capabilities: Array<{ id: string; name: string; description: string; module: string }>;
    blueprint: { pain_points?: string[]; modules?: string[] };
  } | null;

  const pkgInfo = bp ? PACKAGE_LABELS[bp.recommended_package] : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-6 overflow-hidden">
      {/* ── Left: Session List ─────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r flex flex-col bg-card">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Discovery AI</span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setNewSessionOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {loadingSessions ? (
            <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground text-center">
              Sin sesiones. Inicia una nueva.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSession(s)}
                  className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                    selectedSession?.id === s.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-medium truncate">
                      {s.business_description
                        ? s.business_description.slice(0, 30) + (s.business_description.length > 30 ? "…" : "")
                        : `Sesión #${s.id.slice(0, 8)}`}
                    </span>
                    {s.status === "completed"
                      ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      : <Clock className="h-3 w-3 text-muted-foreground shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.industry && (
                      <span className="text-[10px] text-muted-foreground capitalize">{s.industry}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(s.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* ── Main: Chat or Welcome ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedSession ? (
          // Welcome screen
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Solution Discovery AI</h2>
            <p className="text-muted-foreground text-sm max-w-md mb-8">
              Cuéntame sobre tu negocio y te ayudaré a identificar qué módulos de Composable OS necesitas. El proceso toma 2–3 minutos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mb-6">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => handleStarterPrompt(p)}
                  className="text-left p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors text-xs text-muted-foreground"
                >
                  "{p}"
                </button>
              ))}
            </div>
            <Button onClick={() => setNewSessionOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nueva sesión de discovery
            </Button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-12 border-b px-4 flex items-center justify-between bg-card shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Bot className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium truncate">
                  {selectedSession.business_description
                    ? selectedSession.business_description.slice(0, 50)
                    : `Sesión #${selectedSession.id.slice(0, 8)}`}
                </span>
                <Badge variant={selectedSession.status === "completed" ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {selectedSession.status === "completed" ? "Completada" : "Activa"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedSession.status === "active" && messages.length >= 2 && !generateBlueprint.isPending && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => generateBlueprint.mutate()}>
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> Generar blueprint
                  </Button>
                )}
                {generateBlueprint.isPending && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Analizando…
                  </span>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedSession(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex min-h-0">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
                    <Bot className="h-8 w-8 opacity-30" />
                    <span>Escribe tu primer mensaje…</span>
                  </div>
                )}

                <div className="space-y-4 max-w-2xl mx-auto">
                  {/* AI greeting */}
                  {messages.length > 0 && messages[0].role === "user" && (
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-xl">
                        Hola, soy el AI de Solution Discovery. He registrado tu contexto inicial. Cuéntame más sobre los principales desafíos que enfrenta tu negocio. ¿Cuál es el proceso que más tiempo te consume?
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/10"
                      }`}>
                        {msg.role === "user"
                          ? <User className="h-3.5 w-3.5" />
                          : <Bot className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <div className={`rounded-2xl px-4 py-3 text-sm max-w-xl whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted rounded-tl-sm"
                      } ${msg.id.startsWith("opt-") ? "opacity-70" : ""}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {sendMessage.isPending && (
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Blueprint panel */}
              {bp && (
                <div className="w-72 shrink-0 border-l flex flex-col bg-card">
                  <div className="p-3 border-b">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Blueprint
                    </h3>
                  </div>
                  <ScrollArea className="flex-1 p-3 space-y-4">
                    {/* Package recommendation */}
                    {pkgInfo && (
                      <div className={`p-3 rounded-lg border ${pkgInfo.color} mb-3`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4" />
                          <span className="text-sm font-semibold">{pkgInfo.label}</span>
                        </div>
                        <p className="text-xs opacity-80">{pkgInfo.price}</p>
                      </div>
                    )}

                    {/* Pain points */}
                    {bp.blueprint.pain_points && (bp.blueprint.pain_points as string[]).length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Pain points detectados</p>
                        <div className="flex flex-wrap gap-1">
                          {(bp.blueprint.pain_points as string[]).map((p) => (
                            <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Capabilities */}
                    {bp.matched_capabilities.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Capacidades recomendadas</p>
                        <div className="space-y-1.5">
                          {bp.matched_capabilities.map((cap) => (
                            <div key={cap.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                              <ChevronRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-medium">{cap.name}</p>
                                <p className="text-[10px] text-muted-foreground">{cap.module}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Modules */}
                    {bp.blueprint.modules && (bp.blueprint.modules as string[]).length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Módulos incluidos</p>
                        <div className="flex flex-wrap gap-1">
                          {(bp.blueprint.modules as string[]).map((m) => (
                            <Badge key={m} variant="secondary" className="text-[10px] capitalize">{m}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {applyResult ? (
                      <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-800">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span className="font-semibold text-sm">¡Workspace activado!</span>
                        </div>
                        {applyResult.activated_modules.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {applyResult.activated_modules.map((m) => (
                              <Badge key={m} className="bg-emerald-100 text-emerald-800 text-[10px] capitalize border-0">{m}</Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-emerald-700">{applyResult.message}</p>
                        <Button size="sm" className="w-full" onClick={() => navigate("/crm")}>
                          Ir al CRM <ArrowRight className="h-3.5 w-3.5 ml-2" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full mt-3"
                        onClick={() => applyBlueprint.mutate()}
                        disabled={applyBlueprint.isPending}
                      >
                        {applyBlueprint.isPending
                          ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Aplicando…</>
                          : <><Rocket className="h-3.5 w-3.5 mr-2" /> Aplicar blueprint</>}
                      </Button>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Input */}
            {selectedSession.status === "active" && (
              <div className="border-t p-3 bg-card shrink-0">
                <div className="max-w-2xl mx-auto flex items-end gap-2">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Cuéntame sobre tu negocio o proceso… (Enter para enviar)"
                    className="min-h-[44px] max-h-32 resize-none text-sm"
                    rows={1}
                    disabled={sendMessage.isPending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!inputText.trim() || sendMessage.isPending}
                    className="h-11 w-11 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {selectedSession.status === "completed" && !bp && (
              <div className="border-t p-3 bg-card shrink-0 text-center text-sm text-muted-foreground">
                Sesión completada.{" "}
                <button
                  className="text-primary hover:underline"
                  onClick={() => generateBlueprint.mutate()}
                  disabled={generateBlueprint.isPending}
                >
                  Ver blueprint
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── New Session Dialog ─────────────────────────────────────────── */}
      <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> Nueva sesión de discovery
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Describe tu negocio (opcional)
              </label>
              <Textarea
                placeholder="Ej: Tengo una empresa de retail con 3 tiendas, manejo inventario y necesito digitalizar mis ventas..."
                rows={3}
                value={newForm.business_description}
                onChange={(e) => setNewForm((f) => ({ ...f, business_description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Industria
                </label>
                <Select
                  value={newForm.industry}
                  onValueChange={(v) => setNewForm((f) => ({ ...f, industry: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Users className="h-3 w-3" /> Tamaño
                </label>
                <Select
                  value={newForm.company_size}
                  onValueChange={(v) => setNewForm((f) => ({ ...f, company_size: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSessionOpen(false)}>Cancelar</Button>
            <Button onClick={() => createSession.mutate()} disabled={createSession.isPending}>
              {createSession.isPending
                ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Creando…</>
                : <><BarChart3 className="h-3.5 w-3.5 mr-2" /> Iniciar discovery</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
