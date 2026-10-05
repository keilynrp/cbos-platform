import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import globalI18n, { buildI18nOptions, resources } from "@/i18n";
import { ApiError } from "@/lib/api";
import Discovery from "@/pages/Discovery";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `discovery` en el ingles *real* (tarea 12 del plan de i18n): la bienvenida, el dialogo
 * de nueva sesion, el chat y el blueprint con el catalogo `en` que se envia.
 */

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

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

const session = (over: Record<string, unknown> = {}) => ({
  id: "abcd1234-ffff", workspace_id: "w", status: "active",
  business_description: "I run a shoe shop in Cienfuegos and sell by catalogue", industry: "retail",
  company_size: "small", detected_pain_points: null, matched_capabilities: null, recommended_package: null,
  blueprint: null, created_at: minutesAgo(5), ...over,
});

const reply = {
  id: "m2", session_id: "abcd1234-ffff", role: "assistant", content: "Tell me more about the market", token_count: 10,
  created_at: new Date().toISOString(),
};

const blueprint = {
  session_id: "abcd1234-ffff",
  recommended_package: "starter",
  matched_capabilities: [{ id: "c1", name: "Basic CRM", description: "d", module: "crm" }],
  blueprint: { pain_points: ["Cut invoicing time"], modules: ["inventory"] },
};

/** El titulo de la sesion se recorta a 30 caracteres con «…». */
const TRIMMED = "I run a shoe shop in Cienfuego…";

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset());
  toast.mockReset();
  navigate.mockReset();
  svc.listSessions.mockResolvedValue([session()]);
  svc.createSession.mockResolvedValue(session({ id: "new-session-id" }));
  svc.sendMessage.mockResolvedValue({ message: reply, session: session() });
  svc.generateBlueprint.mockResolvedValue(blueprint);
  svc.applyBlueprint.mockResolvedValue({ success: true, message: "Workspace ready", workspace_id: "w", activated_modules: ["crm"] });
});

/** Abre la sesion de la lista y manda un mensaje, para llegar al chat con respuesta. */
async function openChatAndSend(text = "Hello") {
  fireEvent.click(await screen.findByText(TRIMMED));
  fireEvent.change(screen.getByPlaceholderText(/Tell me about your business or process/), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findByText("Tell me more about the market");
}

describe("Discovery in English", () => {
  it("renders the welcome screen with the starter prompts", async () => {
    renderPageWithI18n(<Discovery />, await english());

    expect(await screen.findByText("Solution Discovery AI")).toBeInTheDocument();
    expect(screen.getByText(/It takes 2–3 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/I have a clothing shop/)).toBeInTheDocument();
    expect(screen.getByText(/We are a clinic/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New discovery session/ })).toBeInTheDocument();
    expect(screen.queryByText(/Cuéntame sobre tu negocio/)).not.toBeInTheDocument();
  });

  it("opens the new-session dialog prefilled from a starter prompt", async () => {
    renderPageWithI18n(<Discovery />, await english());

    fireEvent.click(await screen.findByText(/I am a consultant and need to manage proposals/));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("New discovery session")).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText(/E\.g\. I have a retail company/)).toHaveValue(
      "I am a consultant and need to manage proposals and invoicing",
    );
    expect(within(dialog).getByText("Industry")).toBeInTheDocument();
    expect(within(dialog).getByText("Size")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Select…")).toHaveLength(2);
    expect(within(dialog).getByRole("button", { name: /Start discovery/ })).toBeInTheDocument();
  });

  it("lists sessions with a trimmed title, the industry in words and a relative time", async () => {
    svc.listSessions.mockResolvedValue([
      session(),
      session({ id: "efgh5678-aaaa", business_description: null, industry: null, status: "completed", created_at: minutesAgo(180) }),
    ]);
    renderPageWithI18n(<Discovery />, await english());

    expect(await screen.findByText(TRIMMED)).toBeInTheDocument();
    expect(screen.getByText("Retail / Commerce")).toBeInTheDocument();
    expect(screen.getByText("5m ago")).toBeInTheDocument();
    expect(screen.getByText("Session #efgh5678")).toBeInTheDocument();
    expect(screen.getByText("3h ago")).toBeInTheDocument();
  });

  it("says so when there are no sessions", async () => {
    svc.listSessions.mockResolvedValue([]);
    renderPageWithI18n(<Discovery />, await english());

    expect(await screen.findByText("No sessions. Start a new one.")).toBeInTheDocument();
  });

  it("labels the icon-only buttons", async () => {
    renderPageWithI18n(<Discovery />, await english());
    await screen.findByText(TRIMMED);

    expect(screen.getByRole("button", { name: "New session" })).toBeInTheDocument();
    fireEvent.click(screen.getByText(TRIMMED));
    expect(await screen.findByRole("button", { name: "Close conversation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });

  it("shows the chat header with the status and the empty-chat hint", async () => {
    renderPageWithI18n(<Discovery />, await english());

    fireEvent.click(await screen.findByText(TRIMMED));

    expect(await screen.findByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Write your first message…")).toBeInTheDocument();
  });

  it("sends a message and shows the assistant's greeting and reply", async () => {
    renderPageWithI18n(<Discovery />, await english());

    await openChatAndSend("I sell shoes");

    expect(svc.sendMessage).toHaveBeenCalledWith("abcd1234-ffff", "I sell shoes");
    expect(screen.getByText("I sell shoes")).toBeInTheDocument();
    expect(screen.getByText(/I have registered your initial context/)).toBeInTheDocument();
  });

  it("reports a failed send with an English title and the backend error", async () => {
    svc.sendMessage.mockRejectedValue(new ApiError("Session closed.", "DISCOVERY_SESSION_ALREADY_COMPLETED", { status: "completed" }, 409));
    // `translateApiError` lee la instancia global: se le da el mismo idioma.
    await globalI18n.changeLanguage("en");
    try {
      renderPageWithI18n(<Discovery />, await english());

      fireEvent.click(await screen.findByText(TRIMMED));
      fireEvent.change(await screen.findByPlaceholderText(/Tell me about your business or process/), { target: { value: "Hello" } });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Could not send the message", variant: "destructive" }),
        ),
      );
      const description = toast.mock.calls[0][0].description as string;
      expect(description).not.toMatch(/sesion|cerrada/i);
    } finally {
      await globalI18n.changeLanguage("es");
    }
  });

  it("generates the blueprint: package, price, pain points, capabilities and modules", async () => {
    renderPageWithI18n(<Discovery />, await english());
    await openChatAndSend();

    fireEvent.click(await screen.findByRole("button", { name: /Generate blueprint/ }));

    expect(await screen.findByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("$49/month")).toBeInTheDocument();
    expect(screen.getByText("Pain points detected")).toBeInTheDocument();
    expect(screen.getByText("Recommended capabilities")).toBeInTheDocument();
    expect(screen.getByText("Included modules")).toBeInTheDocument();
    expect(screen.getByText("Cut invoicing time")).toBeInTheDocument();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        title: "Blueprint generated",
        description: "Recommended package: Starter",
      }),
    );
  });

  it("applies the blueprint and offers the CRM", async () => {
    renderPageWithI18n(<Discovery />, await english());
    await openChatAndSend();
    fireEvent.click(await screen.findByRole("button", { name: /Generate blueprint/ }));

    fireEvent.click(await screen.findByRole("button", { name: /Apply blueprint/ }));

    expect(await screen.findByText("Workspace activated!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Go to CRM/ }));
    expect(navigate).toHaveBeenCalledWith("/crm");
  });

  it("offers to view the blueprint of a completed session", async () => {
    svc.listSessions.mockResolvedValue([session({ status: "completed" })]);
    renderPageWithI18n(<Discovery />, await english());

    fireEvent.click(await screen.findByText(TRIMMED));

    expect(await screen.findByText("Completed")).toBeInTheDocument();
    expect(screen.getByText(/Session completed\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View blueprint" })).toBeInTheDocument();
  });

  it("creates a session from the dialog", async () => {
    renderPageWithI18n(<Discovery />, await english());
    fireEvent.click(await screen.findByRole("button", { name: /New discovery session/ }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByPlaceholderText(/E\.g\. I have a retail company/), { target: { value: "A hardware store" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Start discovery/ }));

    await waitFor(() =>
      expect(svc.createSession).toHaveBeenCalledWith({ business_description: "A hardware store", industry: undefined, company_size: undefined }),
    );
  });
});
