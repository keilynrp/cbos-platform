import { fireEvent, screen } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppLayout } from "@/components/layout/AppLayout";
import { buildI18nOptions, resources } from "@/i18n";
import { renderWithI18n } from "@/test/i18n";

/**
 * `layout` en el ingles *real* (tarea 12 del plan de i18n): la navegacion, la
 * cabecera y las notificaciones se pintan con el catalogo `en` que se envia, no con
 * el pseudo-localizado de `AppLayout.test.tsx`.
 */

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown>, logout: vi.fn() }));
const notif = vi.hoisted(() => ({
  notifications: [] as Array<Record<string, unknown>>,
  unreadCount: 0,
  markAllRead: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: auth.user, logout: auth.logout }) }));
vi.mock("@/lib/useNotifications", () => ({ useNotifications: () => notif }));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

beforeEach(() => {
  auth.user = { full_name: "Ana Torres", email: "ana@sol.co" };
  auth.logout.mockReset();
  notif.notifications = [];
  notif.unreadCount = 0;
  notif.markAllRead.mockReset();
  notif.dismiss.mockReset();
});

describe("AppLayout in English", () => {
  it("shows the navigation with its sections", async () => {
    renderWithI18n(<AppLayout />, await english());

    for (const section of ["Commerce", "Operations", "System"]) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }
    for (const item of [
      "Dashboard", "CRM", "Sales", "Inventory", "Portal", "Invoicing", "Contracts", "Projects",
      "Team", "Workflows", "Discovery", "Analytics", "Settings",
    ]) {
      expect(screen.getByRole("link", { name: item })).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: "Ventas" })).not.toBeInTheDocument();
  });

  it("keeps every link on its route", async () => {
    renderWithI18n(<AppLayout />, await english());

    expect(screen.getByRole("link", { name: "Sales" })).toHaveAttribute("href", "/sales");
    expect(screen.getByRole("link", { name: "Team" })).toHaveAttribute("href", "/hr");
  });

  it("offers the footer and header actions in English", async () => {
    renderWithI18n(<AppLayout />, await english());

    expect(screen.getByRole("button", { name: "Dark mode" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Collapse" }));
    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search the platform...")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it("falls back to «User» when the account has no name", async () => {
    auth.user = { full_name: null, email: "ana@sol.co" };
    renderWithI18n(<AppLayout />, await english());

    expect(screen.getAllByText("User").length).toBeGreaterThan(0);
  });

  it("renders the notification panel, empty and with data", async () => {
    const instance = await english();
    const { unmount } = renderWithI18n(<AppLayout />, instance);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText("No notifications")).toBeInTheDocument();
    unmount();

    notif.notifications = [{
      id: "n1", event_type: "quote.accepted", title: "Quote accepted", payload: {}, entity_id: null,
      timestamp: new Date(Date.now() - 5 * 60_000).toISOString(), read: false,
    }];
    notif.unreadCount = 1;
    renderWithI18n(<AppLayout />, instance);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(notif.markAllRead).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(notif.dismiss).toHaveBeenCalledWith("n1");
  });
});
