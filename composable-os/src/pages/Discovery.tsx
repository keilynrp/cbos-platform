import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, Send, Sparkles, CheckCircle2, Clock, Package,
  ChevronRight, Loader2, Bot, User, Rocket, X, Building2,
  Users, BarChart3, ArrowRight,
} from "lucide-react";
import type { ApplyResult, BlueprintResponse } from "@/services/discovery";
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
import { useEnumLabel } from "@/i18n/enumLabel";
import { useFormat } from "@/i18n/useFormat";
import { useT } from "@/i18n/useT";
import { translateApiError } from "@/lib/errors";
import {
  discoveryService,
  type DiscoverySession,
  type DiscoveryMessage,
} from "@/services/discovery";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Estilo y precio mensual (USD) de cada paquete; el nombre vive en el catalogo. */
const PACKAGE_STYLE: Record<string, { color: string; price: number }> = {
  starter:         { color: "bg-blue-500/10 text-blue-700 border-blue-200",       price: 49 },
  growth:          { color: "bg-green-500/10 text-green-700 border-green-200",     price: 149 },
  operations_plus: { color: "bg-purple-500/10 text-purple-700 border-purple-200", price: 349 },
};

const INDUSTRY_VALUES = [
  "retail", "manufacturing", "services", "technology",
  "healthcare", "education", "food", "construction",
] as const;

const SIZE_VALUES = ["nano", "small", "medium", "large"] as const;

const STARTER_PROMPTS = ["retail", "consulting", "manufacturing", "clinic"] as const;

// ── Main Component ───────────────────────────────────────────────────────────
export default function Discovery() {
  const t = useT();
  const label = useEnumLabel();
  const { formatCurrency, formatRelativeTime } = useFormat();
  const [selectedSession, setSelectedSession] = useState<DiscoverySession | null>(null);
  const [messages, setMessages] = useState<DiscoveryMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newForm, setNewForm] = useState({ business_description: "", industry: "", company_size: "" });
  const [blueprintData, setBlueprintData] = useState<BlueprintResponse | null>(null);
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

  /**
   * Nombre visible de una sesion: su descripcion recortada a `max` caracteres
   * (con "…" si se pidio y se recorto), o un titulo generico.
   */
  const sessionTitle = (session: DiscoverySession, max: number, ellipsis: boolean) => {
    const description = session.business_description;
    if (!description) return t("discovery:sessions.untitled", { id: session.id.slice(0, 8) });
    return description.slice(0, max) + (ellipsis && description.length > max ? "…" : "");
  };

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
    onError: (err: Error) => toast({ title: t("discovery:toast.createFailed"), description: translateApiError(err), variant: "destructive" }),
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
      toast({ title: t("discovery:toast.sendFailed"), description: translateApiError(err), variant: "destructive" });
    },
  });

  const generateBlueprint = useMutation({
    mutationFn: () => discoveryService.generateBlueprint(selectedSession!.id),
    onSuccess: (data) => {
      setBlueprintData(data);
      setSelectedSession((s) => s ? { ...s, status: "completed", recommended_package: data.recommended_package } : s);
      qc.invalidateQueries({ queryKey: ["discovery-sessions"] });
      toast({
        title: t("discovery:toast.blueprintReady"),
        description: t("discovery:toast.recommendedPackage", {
          name: label("discovery:packageName", data.recommended_package),
        }),
      });
    },
    onError: (err: Error) => toast({ title: t("common:error.title"), description: translateApiError(err), variant: "destructive" }),
  });

  const applyBlueprint = useMutation({
    mutationFn: () => discoveryService.applyBlueprint(selectedSession!.id),
    onSuccess: (result) => {
      setApplyResult(result);
      qc.invalidateQueries({ queryKey: ["discovery-sessions"] });
    },
    onError: (err: Error) => toast({ title: t("common:error.title"), description: translateApiError(err), variant: "destructive" }),
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

  const pkgStyle = bp ? PACKAGE_STYLE[bp.recommended_package] : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-6 overflow-hidden">
      {/* ── Left: Session List ─────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r flex flex-col bg-card">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{t("discovery:title")}</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label={t("discovery:newSessionButton")}
            onClick={() => setNewSessionOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {loadingSessions ? (
            <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground text-center">
              {t("discovery:sessions.empty")}
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
                    <span className="text-xs font-medium truncate">{sessionTitle(s, 30, true)}</span>
                    {s.status === "completed"
                      ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      : <Clock className="h-3 w-3 text-muted-foreground shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.industry && (
                      <span className="text-[10px] text-muted-foreground">{label("discovery:industry", s.industry)}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">{formatRelativeTime(s.created_at)}</span>
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
            <h2 className="text-xl font-bold mb-2">{t("discovery:welcome.title")}</h2>
            <p className="text-muted-foreground text-sm max-w-md mb-8">
              {t("discovery:welcome.intro")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mb-6">
              {STARTER_PROMPTS.map((key) => {
                const prompt = t(`discovery:starter.${key}`);
                return (
                  <button
                    key={key}
                    onClick={() => handleStarterPrompt(prompt)}
                    className="text-left p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors text-xs text-muted-foreground"
                  >
                    "{prompt}"
                  </button>
                );
              })}
            </div>
            <Button onClick={() => setNewSessionOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> {t("discovery:welcome.newSession")}
            </Button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-12 border-b px-4 flex items-center justify-between bg-card shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Bot className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium truncate">{sessionTitle(selectedSession, 50, false)}</span>
                <Badge variant={selectedSession.status === "completed" ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {label("discovery:sessionStatus", selectedSession.status)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedSession.status === "active" && messages.length >= 2 && !generateBlueprint.isPending && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => generateBlueprint.mutate()}>
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> {t("discovery:chat.generateBlueprint")}
                  </Button>
                )}
                {generateBlueprint.isPending && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> {t("discovery:chat.analyzing")}
                  </span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label={t("discovery:chat.closeSession")}
                  onClick={() => setSelectedSession(null)}
                >
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
                    <span>{t("discovery:chat.firstMessage")}</span>
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
                        {t("discovery:chat.greeting")}
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
                      <Sparkles className="h-4 w-4 text-primary" /> {t("discovery:blueprint.title")}
                    </h3>
                  </div>
                  <ScrollArea className="flex-1 p-3 space-y-4">
                    {/* Package recommendation */}
                    {pkgStyle && (
                      <div className={`p-3 rounded-lg border ${pkgStyle.color} mb-3`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4" />
                          <span className="text-sm font-semibold">{label("discovery:packageName", bp.recommended_package)}</span>
                        </div>
                        <p className="text-xs opacity-80">
                          {t("discovery:blueprint.perMonth", {
                            price: formatCurrency(pkgStyle.price, "USD", { maximumFractionDigits: 0 }),
                          })}
                        </p>
                      </div>
                    )}

                    {/* Pain points */}
                    {bp.blueprint.pain_points && (bp.blueprint.pain_points as string[]).length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("discovery:blueprint.painPoints")}</p>
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
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("discovery:blueprint.capabilities")}</p>
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
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("discovery:blueprint.modules")}</p>
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
                          <span className="font-semibold text-sm">{t("discovery:blueprint.activated")}</span>
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
                          {t("discovery:blueprint.goToCrm")} <ArrowRight className="h-3.5 w-3.5 ml-2" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full mt-3"
                        onClick={() => applyBlueprint.mutate()}
                        disabled={applyBlueprint.isPending}
                      >
                        {applyBlueprint.isPending
                          ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> {t("discovery:blueprint.applying")}</>
                          : <><Rocket className="h-3.5 w-3.5 mr-2" /> {t("discovery:blueprint.apply")}</>}
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
                    placeholder={t("discovery:chat.placeholder")}
                    className="min-h-[44px] max-h-32 resize-none text-sm"
                    rows={1}
                    disabled={sendMessage.isPending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!inputText.trim() || sendMessage.isPending}
                    aria-label={t("discovery:chat.send")}
                    className="h-11 w-11 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {selectedSession.status === "completed" && !bp && (
              <div className="border-t p-3 bg-card shrink-0 text-center text-sm text-muted-foreground">
                {t("discovery:chat.sessionCompleted")}{" "}
                <button
                  className="text-primary hover:underline"
                  onClick={() => generateBlueprint.mutate()}
                  disabled={generateBlueprint.isPending}
                >
                  {t("discovery:chat.viewBlueprint")}
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
              <Search className="h-5 w-5 text-primary" /> {t("discovery:newSession.title")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {t("discovery:newSession.description")}
              </label>
              <Textarea
                placeholder={t("discovery:newSession.descriptionPlaceholder")}
                rows={3}
                value={newForm.business_description}
                onChange={(e) => setNewForm((f) => ({ ...f, business_description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {t("discovery:newSession.industry")}
                </label>
                <Select
                  value={newForm.industry}
                  onValueChange={(v) => setNewForm((f) => ({ ...f, industry: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("discovery:newSession.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_VALUES.map((value) => (
                      <SelectItem key={value} value={value} className="text-xs">
                        {label("discovery:industry", value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Users className="h-3 w-3" /> {t("discovery:newSession.size")}
                </label>
                <Select
                  value={newForm.company_size}
                  onValueChange={(v) => setNewForm((f) => ({ ...f, company_size: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("discovery:newSession.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_VALUES.map((value) => (
                      <SelectItem key={value} value={value} className="text-xs">
                        {label("discovery:size", value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSessionOpen(false)}>{t("discovery:newSession.cancel")}</Button>
            <Button onClick={() => createSession.mutate()} disabled={createSession.isPending}>
              {createSession.isPending
                ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> {t("discovery:newSession.creating")}</>
                : <><BarChart3 className="h-3.5 w-3.5 mr-2" /> {t("discovery:newSession.start")}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
