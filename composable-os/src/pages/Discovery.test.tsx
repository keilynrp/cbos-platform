import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { ApiError } from "@/lib/api";
import Discovery from "@/pages/Discovery";
import {
  FORMATTED_CURRENCY, FORMATTED_RELATIVE, createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings,
} from "@/test/i18n";

const svc = vi.hoisted(() => ({
  listSessions: vi.fn(),
  createSession: vi.fn(),
  sendMessage: vi.fn(),
  generateBlueprint: vi.fn(),
  applyBlueprint: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());

vi.mock("@/services/discovery", () => ({ discoveryService: svc }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

/** Datos del backend (descripciones, capacidades...): no pertenecen al catalogo. */
const DATA = [
  "Tengo una tienda de zapatos", "Reduce el tiempo de facturacion", "Facturacion", "CRM basico",
  "Ventas", "crm", "inventory", "Workspace listo", "mercado", "abcd1234",
  "Hola", // el mensaje que el test escribe en el chat
];

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

const session = (over: Record<string, unknown> = {}) => ({
  id: "abcd1234-ffff", workspace_id: "w", status: "active",
  business_description: "Tengo una tienda de zapatos en Cienfuegos y vendo por catalogo", industry: "retail",
  company_size: "small", detected_pain_points: null, matched_capabilities: null, recommended_package: null,
  blueprint: null, created_at: minutesAgo(5), ...over,
});

const reply = {
  id: "m2", session_id: "abcd1234-ffff", role: "assistant", content: "Cuentame mas del mercado", token_count: 10,
  created_at: new Date().toISOString(),
};

const blueprint = {
  session_id: "abcd1234-ffff",
  recommended_package: "starter",
  matched_capabilities: [{ id: "c1", name: "CRM basico", description: "d", module: "crm" }],
  blueprint: { pain_points: ["Reduce el tiempo de facturacion"], modules: ["inventory"] },
};

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  toast.mockReset();
  navigate.mockReset();
  svc.listSessions.mockResolvedValue([session()]);
  svc.createSession.mockResolvedValue(session({ id: "new-session-id" }));
  svc.sendMessage.mockResolvedValue({ message: reply, session: session() });
  svc.generateBlueprint.mockResolvedValue(blueprint);
  svc.applyBlueprint.mockResolvedValue({ success: true, message: "Workspace listo", workspace_id: "w", activated_modules: ["crm"] });
});

/** Abre la sesion de la lista y manda un mensaje, para llegar al chat con respuesta. */
async function openChatAndSend(text = "Hola") {
  const row = await screen.findByRole("button", { name: /Tengo una tienda de zapatos/ });
  fireEvent.click(row);
  fireEvent.change(screen.getByPlaceholderText(/Cuéntame sobre tu negocio o proceso/), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));
  await screen.findByText("Cuentame mas del mercado");
}

describe("Discovery, in Spanish", () => {
  it("renders the welcome screen with the starter prompts", async () => {
    renderPageWithI18n(<Discovery />, i18n);

    expect(await screen.findByText("Solution Discovery AI")).toBeInTheDocument();
    expect(screen.getByText(/El proceso toma 2–3 minutos/)).toBeInTheDocument();
    expect(screen.getByText(/Tengo una tienda de ropa/)).toBeInTheDocument();
    expect(screen.getByText(/Somos una clínica/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nueva sesión de discovery/ })).toBeInTheDocument();
  });

  it("opens the new-session dialog prefilled from a starter prompt", async () => {
    renderPageWithI18n(<Discovery />, i18n);

    fireEvent.click(await screen.findByText(/Soy consultor y necesito gestionar propuestas/));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Nueva sesión de discovery")).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText(/Ej: Tengo una empresa de retail/)).toHaveValue(
      "Soy consultor y necesito gestionar propuestas y facturación",
    );
    expect(within(dialog).getByText("Industria")).toBeInTheDocument();
    expect(within(dialog).getByText("Tamaño")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Seleccionar…")).toHaveLength(2);
    expect(within(dialog).getByRole("button", { name: /Iniciar discovery/ })).toBeInTheDocument();
  });

  it("lists sessions with a trimmed title, the industry in words and a relative time", async () => {
    svc.listSessions.mockResolvedValue([
      session(),
      session({ id: "efgh5678-aaaa", business_description: null, industry: null, status: "completed", created_at: minutesAgo(180) }),
    ]);
    renderPageWithI18n(<Discovery />, i18n);

    // 30 caracteres y "…": "Tengo una tienda de zapatos en " tiene 31, se recorta.
    expect(await screen.findByText("Tengo una tienda de zapatos en…")).toBeInTheDocument();
    expect(screen.getByText("Retail / Comercio")).toBeInTheDocument();
    expect(screen.getByText("hace 5 min")).toBeInTheDocument();
    expect(screen.getByText("Sesión #efgh5678")).toBeInTheDocument();
    expect(screen.getByText("hace 3 h")).toBeInTheDocument();
  });

  it("says so when there are no sessions", async () => {
    svc.listSessions.mockResolvedValue([]);
    renderPageWithI18n(<Discovery />, i18n);

    expect(await screen.findByText("Sin sesiones. Inicia una nueva.")).toBeInTheDocument();
  });

  it("labels the icon-only buttons", async () => {
    renderPageWithI18n(<Discovery />, i18n);
    await screen.findByText("Tengo una tienda de zapatos en…");

    expect(screen.getByRole("button", { name: "Nueva sesión" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Tengo una tienda de zapatos en…"));
    expect(await screen.findByRole("button", { name: "Cerrar conversación" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar mensaje" })).toBeDisabled();
  });

  it("shows the chat header with the translated status and the empty-chat hint", async () => {
    renderPageWithI18n(<Discovery />, i18n);

    fireEvent.click(await screen.findByText("Tengo una tienda de zapatos en…"));

    expect(await screen.findByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Escribe tu primer mensaje…")).toBeInTheDocument();
  });

  it("sends a message and shows the assistant's reply", async () => {
    renderPageWithI18n(<Discovery />, i18n);

    await openChatAndSend("Vendo zapatos");

    expect(svc.sendMessage).toHaveBeenCalledWith("abcd1234-ffff", "Vendo zapatos");
    expect(screen.getByText("Vendo zapatos")).toBeInTheDocument();
    // El saludo del asistente aparece cuando el primer mensaje es del usuario.
    expect(screen.getByText(/He registrado tu contexto inicial/)).toBeInTheDocument();
  });

  it("reports a failed send with a translated title and the backend error", async () => {
    svc.sendMessage.mockRejectedValue(new ApiError("Session closed.", "DISCOVERY_SESSION_ALREADY_COMPLETED", { status: "completed" }, 409));
    renderPageWithI18n(<Discovery />, i18n);

    fireEvent.click(await screen.findByText("Tengo una tienda de zapatos en…"));
    fireEvent.change(await screen.findByPlaceholderText(/Cuéntame sobre tu negocio o proceso/), { target: { value: "Hola" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        title: "Error al enviar mensaje",
        description: "Esta sesion ya esta cerrada, no admite mas mensajes.",
        variant: "destructive",
      }),
    );
  });

  it("generates the blueprint: package, price, pain points, capabilities and modules", async () => {
    renderPageWithI18n(<Discovery />, i18n);
    await openChatAndSend();

    fireEvent.click(await screen.findByRole("button", { name: /Generar blueprint/ }));

    expect(await screen.findByText("Starter")).toBeInTheDocument();
    // `$49/mes` a mano antes; ahora la cifra la formatea Intl.
    expect(screen.getByText(/^USD\s49\/mes$/)).toBeInTheDocument();
    expect(screen.getByText("Pain points detectados")).toBeInTheDocument();
    expect(screen.getByText("Capacidades recomendadas")).toBeInTheDocument();
    expect(screen.getByText("Módulos incluidos")).toBeInTheDocument();
    expect(screen.getByText("Reduce el tiempo de facturacion")).toBeInTheDocument();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        title: "Blueprint generado",
        description: "Paquete recomendado: Starter",
      }),
    );
  });

  it("applies the blueprint and offers the CRM", async () => {
    renderPageWithI18n(<Discovery />, i18n);
    await openChatAndSend();
    fireEvent.click(await screen.findByRole("button", { name: /Generar blueprint/ }));

    fireEvent.click(await screen.findByRole("button", { name: /Aplicar blueprint/ }));

    expect(await screen.findByText("¡Workspace activado!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ir al CRM/ }));
    expect(navigate).toHaveBeenCalledWith("/crm");
  });

  it("falls back to the raw package name when the catalogue does not know it", async () => {
    svc.generateBlueprint.mockResolvedValue({ ...blueprint, recommended_package: "enterprise_x" });
    renderPageWithI18n(<Discovery />, i18n);
    await openChatAndSend();

    fireEvent.click(await screen.findByRole("button", { name: /Generar blueprint/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Paquete recomendado: enterprise_x" }),
      ),
    );
  });

  it("offers to view the blueprint of a completed session", async () => {
    svc.listSessions.mockResolvedValue([session({ status: "completed" })]);
    renderPageWithI18n(<Discovery />, i18n);

    fireEvent.click(await screen.findByText("Tengo una tienda de zapatos en…"));

    expect(await screen.findByText("Completada")).toBeInTheDocument();
    expect(screen.getByText(/Sesión completada\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver blueprint" })).toBeInTheDocument();
  });

  it("creates a session from the dialog", async () => {
    renderPageWithI18n(<Discovery />, i18n);
    fireEvent.click(await screen.findByRole("button", { name: /Nueva sesión de discovery/ }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByPlaceholderText(/Ej: Tengo una empresa de retail/), { target: { value: "Una ferreteria" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Iniciar discovery/ }));

    await waitFor(() => expect(svc.createSession).toHaveBeenCalledWith({ business_description: "Una ferreteria", industry: undefined, company_size: undefined }));
  });
});

/**
 * La prueba de que la pagina esta migrada entera, en cada estado donde hay
 * texto: bienvenida, dialogo, chat y blueprint. Lo sembrado como dato del
 * backend y lo que formatea Intl no cuenta.
 */
describe("Discovery, in a second language", () => {
  const INITIALS_AND_FORMATS = [FORMATTED_CURRENCY, FORMATTED_RELATIVE, /^USD\s49\/mes$|^\$49\/mes$/];

  const strings = (root: HTMLElement) => notFromCatalogue(visibleStrings(root), DATA, INITIALS_AND_FORMATS);

  it("has no string left outside the catalogue on the welcome screen", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<Discovery />, english);
    await screen.findByText("EN(Solución Discovery AI)".replace("Solución", "Solution"));
    await screen.findByText("Tengo una tienda de zapatos en…");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue in the new-session dialog", async () => {
    const english = await createPseudoInstance("en");
    renderPageWithI18n(<Discovery />, english);
    fireEvent.click(await screen.findByRole("button", { name: /EN\(Nueva sesión de discovery\)/ }));
    await screen.findByRole("dialog");

    expect(strings(screen.getByRole("dialog"))).toEqual([]);
  });

  it("has no string left outside the catalogue in the chat and the blueprint", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<Discovery />, english);

    fireEvent.click(await screen.findByText("Tengo una tienda de zapatos en…"));
    fireEvent.change(await screen.findByPlaceholderText("EN(Cuéntame sobre tu negocio o proceso… (Enter para enviar))"), { target: { value: "Hola" } });
    fireEvent.click(screen.getByRole("button", { name: "EN(Enviar mensaje)" }));
    await screen.findByText("Cuentame mas del mercado");
    fireEvent.click(await screen.findByRole("button", { name: /EN\(Generar blueprint\)/ }));
    await screen.findByText("EN(Starter)");

    expect(strings(container)).toEqual([]);
  });

  it("translates the toast of a generated blueprint", async () => {
    const english = await createPseudoInstance("en");
    renderPageWithI18n(<Discovery />, english);
    fireEvent.click(await screen.findByText("Tengo una tienda de zapatos en…"));
    fireEvent.change(await screen.findByPlaceholderText(/EN\(Cuéntame/), { target: { value: "Hola" } });
    fireEvent.click(screen.getByRole("button", { name: "EN(Enviar mensaje)" }));
    await screen.findByText("Cuentame mas del mercado");

    fireEvent.click(await screen.findByRole("button", { name: /EN\(Generar blueprint\)/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        title: "EN(Blueprint generado)",
        description: "EN(Paquete recomendado: EN(Starter))",
      }),
    );
  });
});
