import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n, { setLocale } from "@/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: http,
  getToken: () => null,
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

const REGISTER_DATA = {
  workspace_name: "Mi Taller",
  workspace_slug: "mi-taller",
  full_name: "Ana Lopez",
  email: "ana@taller.co",
  password: "supersecreta",
};

let auth!: ReturnType<typeof useAuth>;
function Probe() {
  auth = useAuth();
  return null;
}
const mount = () => render(<AuthProvider><Probe /></AuthProvider>);

beforeEach(async () => {
  Object.values(http).forEach((fn) => fn.mockReset());
  http.post.mockResolvedValue({ access_token: "t" });
  http.get.mockResolvedValue({ id: "u", email: "ana@taller.co", role: "admin", workspace_id: "w", effective_locale: "es" });
  window.localStorage.clear();
  await i18n.changeLanguage("es");
});

/**
 * Un visitante elige idioma en el login y sigue a "Crear workspace". Antes el
 * registro no llevaba esa eleccion: el backend creaba el workspace con el idioma
 * del navegador y el `effective_locale` de `/auth/me` deshacia lo elegido.
 */
describe("register keeps the language the visitor chose", () => {
  it("sends the active language as Accept-Language, which seeds the workspace default (ADR 0016)", async () => {
    mount();
    await setLocale("es-MX");

    await act(async () => {
      await auth.register(REGISTER_DATA);
    });

    expect(http.post).toHaveBeenCalledWith("/auth/register", REGISTER_DATA, {
      headers: { "Accept-Language": "es-MX" },
    });
  });

  it("follows a change of language made after the page loaded", async () => {
    mount();
    await setLocale("es-ES");

    await act(async () => {
      await auth.register(REGISTER_DATA);
    });

    expect(http.post.mock.calls[0][2]).toEqual({ headers: { "Accept-Language": "es-ES" } });
  });

  it("applies the server's effective locale once registered", async () => {
    http.get.mockResolvedValue({ id: "u", email: "a@b.co", role: "admin", workspace_id: "w", effective_locale: "es-ES" });
    mount();

    await act(async () => {
      await auth.register(REGISTER_DATA);
    });

    await waitFor(() => expect(i18n.language).toBe("es-ES"));
  });
});
