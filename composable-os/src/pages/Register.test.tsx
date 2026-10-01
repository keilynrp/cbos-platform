import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { ApiError } from "@/lib/api";
import Register from "@/pages/Register";
import { createPseudoInstance, renderWithI18n, visibleStrings } from "@/test/i18n";

const registerMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ register: registerMock, changeLocale: vi.fn() }),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigateMock,
}));

beforeEach(() => {
  registerMock.mockReset();
  navigateMock.mockReset();
});

const BRAND = "CBOS Platform";

/** Rellena el formulario; `over` permite romper un campo concreto. */
function fill(labels: { name: string; slug: string; full: string; email: string; password: string }, over: Partial<Record<keyof typeof labels, string>> = {}) {
  const values = { name: "Mi Taller", slug: "mi-taller", full: "Ana Lopez", email: "a@b.co", password: "supersecreta", ...over };
  // Los dos primeros labels llevan texto extra (el hint del slug), de ahi el prefijo.
  const startsWith = (text: string) => new RegExp("^" + text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  fireEvent.change(screen.getByLabelText(startsWith(labels.name)), { target: { value: values.name } });
  fireEvent.change(screen.getByLabelText(startsWith(labels.slug)), { target: { value: values.slug } });
  fireEvent.change(screen.getByLabelText(labels.full), { target: { value: values.full } });
  fireEvent.change(screen.getByLabelText(labels.email), { target: { value: values.email } });
  fireEvent.change(screen.getByLabelText(labels.password), { target: { value: values.password } });
}

const ES = { name: "Nombre del workspace", slug: "Slug del workspace", full: "Tu nombre completo", email: "Email", password: "Contraseña" };
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

describe("Register, in Spanish", () => {
  it("renders the copy from the catalogue", () => {
    renderWithI18n(<Register />, i18n);

    expect(screen.getByRole("heading", { name: BRAND })).toBeInTheDocument();
    expect(screen.getByText("Completa los datos para comenzar")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Mínimo 8 caracteres")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("derives the slug from the workspace name", () => {
    renderWithI18n(<Register />, i18n);

    fireEvent.change(screen.getByLabelText(/^Nombre del workspace/), { target: { value: "Mi Taller Ñandú!" } });

    expect(screen.getByLabelText(/^Slug del workspace/)).toHaveValue("mi-taller-and");
  });

  it("rejects a short password before calling the backend", async () => {
    renderWithI18n(<Register />, i18n);
    fill(ES, { password: "corta" });

    submit();

    expect(await screen.findByText("La contraseña debe tener al menos 8 caracteres.")).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid slug before calling the backend", async () => {
    renderWithI18n(<Register />, i18n);
    fill(ES, { slug: "Mal Slug!" });

    submit();

    expect(
      await screen.findByText("El slug solo puede contener letras minúsculas, números y guiones."),
    ).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("registers and goes home", async () => {
    registerMock.mockResolvedValue(undefined);
    renderWithI18n(<Register />, i18n);
    fill(ES);

    submit();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/"));
    expect(registerMock).toHaveBeenCalledWith({
      workspace_name: "Mi Taller",
      workspace_slug: "mi-taller",
      full_name: "Ana Lopez",
      email: "a@b.co",
      password: "supersecreta",
    });
  });

  it("shows the translated backend error", async () => {
    registerMock.mockRejectedValue(new ApiError("Workspace slug already exists.", "IDENTITY_WORKSPACE_SLUG_TAKEN", { slug: "mi-taller" }, 409));
    renderWithI18n(<Register />, i18n);
    fill(ES);

    submit();

    expect(await screen.findByText("El identificador 'mi-taller' ya esta en uso.")).toBeInTheDocument();
  });

  it("uses the catalogue's fallback when the failure has no message", async () => {
    registerMock.mockRejectedValue(undefined);
    renderWithI18n(<Register />, i18n);
    fill(ES);

    submit();

    expect(await screen.findByText("Error al registrar. Intenta de nuevo.")).toBeInTheDocument();
  });
});

describe("Register, in a second language", () => {
  const EN = { name: "EN(Nombre del workspace)", slug: "EN(Slug del workspace)", full: "EN(Tu nombre completo)", email: "EN(Email)", password: "EN(Contraseña)" };

  it("has no string left outside the catalogue", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderWithI18n(<Register />, english);

    const hardcoded = visibleStrings(container).filter((text) => !text.startsWith("EN(") && text !== BRAND);

    expect(hardcoded).toEqual([]);
  });

  it("translates the client-side validation messages, with the number interpolated", async () => {
    const english = await createPseudoInstance("en");
    renderWithI18n(<Register />, english);
    fill(EN, { password: "corta" });

    fireEvent.click(screen.getByRole("button", { name: "EN(Crear cuenta)" }));

    expect(await screen.findByText("EN(La contraseña debe tener al menos 8 caracteres.)")).toBeInTheDocument();
  });

  it("translates the fallback error too", async () => {
    registerMock.mockRejectedValue(undefined);
    const english = await createPseudoInstance("en");
    renderWithI18n(<Register />, english);
    fill(EN);

    fireEvent.click(screen.getByRole("button", { name: "EN(Crear cuenta)" }));

    expect(await screen.findByText("EN(Error al registrar. Intenta de nuevo.)")).toBeInTheDocument();
  });
});
