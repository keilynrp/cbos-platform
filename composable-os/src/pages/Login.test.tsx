import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { ApiError } from "@/lib/api";
import Login from "@/pages/Login";
import { LANGUAGE_NAMES, createPseudoInstance, renderWithI18n, visibleStrings } from "@/test/i18n";

const loginMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ login: loginMock, changeLocale: vi.fn() }),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigateMock,
}));

beforeEach(() => {
  loginMock.mockReset();
  navigateMock.mockReset();
});

/** Lo unico que no se traduce: el nombre del producto. */
const BRAND = "CBOS Platform";

describe("Login, in Spanish", () => {
  it("renders the copy from the catalogue", () => {
    renderWithI18n(<Login />, i18n);

    expect(screen.getByRole("heading", { name: BRAND })).toBeInTheDocument();
    expect(screen.getByText("Iniciar sesión")).toBeInTheDocument();
    expect(screen.getByText("Ingresa tus credenciales para continuar")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear workspace" })).toBeInTheDocument();
  });

  it("toggles the password visibility label", () => {
    renderWithI18n(<Login />, i18n);

    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));

    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toBeInTheDocument();
  });

  it("shows the translated backend error, not the raw code", async () => {
    loginMock.mockRejectedValue(new ApiError("Invalid email or password.", "IDENTITY_INVALID_CREDENTIALS", undefined, 401));
    renderWithI18n(<Login />, i18n);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Correo o contrasena incorrectos.")).toBeInTheDocument();
    expect(screen.queryByText(/IDENTITY_INVALID_CREDENTIALS/)).not.toBeInTheDocument();
  });

  it("uses the catalogue's fallback when the failure has no message", async () => {
    loginMock.mockRejectedValue(undefined);
    renderWithI18n(<Login />, i18n);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Credenciales inválidas")).toBeInTheDocument();
  });

  it("navigates home after a successful login", async () => {
    loginMock.mockResolvedValue(undefined);
    renderWithI18n(<Login />, i18n);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/"));
  });
});

/**
 * La prueba de que la pagina esta migrada *entera*: con un catalogo `en`
 * pseudo-localizado, todo texto visible debe llevar el prefijo `EN(`. Uno que
 * no lo lleve es una cadena cableada.
 */
describe("Login, in a second language", () => {
  it("has no string left outside the catalogue", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderWithI18n(<Login />, english);

    const hardcoded = visibleStrings(container).filter(
      (text) => !text.startsWith("EN(") && text !== BRAND && !LANGUAGE_NAMES.test(text),
    );

    expect(hardcoded).toEqual([]);
  });

  it("renders the translated copy", async () => {
    const english = await createPseudoInstance("en");
    renderWithI18n(<Login />, english);

    expect(screen.getByText("EN(Iniciar sesión)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EN(Entrar)" })).toBeInTheDocument();
  });

  it("translates the fallback error too", async () => {
    loginMock.mockRejectedValue(undefined);
    const english = await createPseudoInstance("en");
    renderWithI18n(<Login />, english);

    fireEvent.change(screen.getByLabelText("EN(Email)"), { target: { value: "a@b.co" } });
    fireEvent.change(screen.getByLabelText("EN(Contraseña)"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "EN(Entrar)" }));

    expect(await screen.findByText("EN(Credenciales inválidas)")).toBeInTheDocument();
  });
});
