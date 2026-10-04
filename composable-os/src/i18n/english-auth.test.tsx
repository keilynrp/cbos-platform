import { fireEvent, screen } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n, { buildI18nOptions, resources } from "@/i18n";
import { ApiError } from "@/lib/api";
import { translateApiError } from "@/lib/errors";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { renderWithI18n } from "@/test/i18n";

/**
 * `auth` y `errors` en el ingles *real* (tarea 12 del plan de i18n). Mismo criterio
 * que `english.test.tsx`: los tests de pagina prueban con `EN(...)` que nada esta
 * cableado; estos, que el ingles que se envia es ingles y que las paginas lo pintan.
 */

const loginMock = vi.fn();
const registerMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ login: loginMock, register: registerMock, changeLocale: vi.fn() }),
}));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

beforeEach(() => {
  loginMock.mockReset();
  registerMock.mockReset();
});

afterEach(async () => {
  await i18n.changeLanguage("es");
});

describe("Login in English", () => {
  it("renders the page from the English catalogue", async () => {
    renderWithI18n(<Login />, await english());

    expect(screen.getByText("Sign in", { selector: "[class*=title], h2, h3, div" })).toBeInTheDocument();
    expect(screen.getByText("Enter your credentials to continue")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create workspace" })).toBeInTheDocument();
    expect(screen.queryByText("Iniciar sesión")).not.toBeInTheDocument();
  });

  it("toggles the password label in English", async () => {
    renderWithI18n(<Login />, await english());

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
  });
});

describe("Register in English", () => {
  it("renders the form from the English catalogue", async () => {
    renderWithI18n(<Register />, await english());

    expect(screen.getByText("Fill in your details to get started")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("At least 8 characters")).toBeInTheDocument();
    expect(screen.getByLabelText("Your full name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("validates in English before calling the server", async () => {
    renderWithI18n(<Register />, await english());

    fireEvent.change(screen.getByLabelText("Your full name"), { target: { value: "Ana Lopez" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText(/^Workspace name/), { target: { value: "My Shop" } });
    fireEvent.change(screen.getByLabelText(/^Workspace slug/), { target: { value: "my-shop" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("The password must be at least 8 characters long.")).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });
});

describe("backend errors in English", () => {
  // `translateApiError` lee la instancia global: se cambia su idioma y `afterEach` la devuelve.
  it("renders a mapped code with its detail, not the identifier and not Spanish", async () => {
    await i18n.changeLanguage("en");
    const error = new ApiError("x", "PROJECT_DELETE_NOT_PLANNING", { status: "active" }, 409);

    expect(translateApiError(error)).toBe(
      "Cannot delete a project with status 'active'. Only projects in planning can be deleted.",
    );
  });

  it("builds the empty-list variant from the English catalogue", async () => {
    await i18n.changeLanguage("en");
    const error = new ApiError("x", "PROJECT_INVALID_TRANSITION", { from: "cancelled", to: "active", allowed: [] }, 422);

    expect(translateApiError(error)).toBe(
      "Cannot move from 'cancelled' to 'active'. Allowed statuses: none (final status).",
    );
  });

  it("joins list details in English", async () => {
    await i18n.changeLanguage("en");
    const error = new ApiError("x", "CRM_OPPORTUNITY_INVALID_STAGE", { stage: "bogus", allowed: ["lost", "new"] }, 422);

    expect(translateApiError(error)).toBe("Invalid stage: 'bogus'. Valid stages: lost, new.");
  });

  it("says something different in Spanish for the same code", async () => {
    const error = new ApiError("x", "IDENTITY_INVALID_CREDENTIALS", undefined, 401);

    const spanish = translateApiError(error);
    await i18n.changeLanguage("en");

    expect(spanish).toBe("Correo o contrasena incorrectos.");
    expect(translateApiError(error)).toBe("Incorrect email or password.");
  });

  it("keeps the fallback ladder: an unmapped code still shows the backend message", async () => {
    await i18n.changeLanguage("en");

    expect(translateApiError(new ApiError("Backend says no.", "SOME_NEW_CODE", undefined, 400))).toBe("Backend says no.");
  });
});
