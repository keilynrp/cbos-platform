import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import NotFound from "@/pages/NotFound";
import { createPseudoInstance, notFromCatalogue, renderWithI18n, visibleStrings } from "@/test/i18n";

beforeEach(() => {
  // La pagina registra la ruta inexistente con console.error a proposito.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("NotFound", () => {
  it("renders in Spanish, where it used to say 'Oops! Page not found'", () => {
    renderWithI18n(<NotFound />, i18n);

    expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(screen.getByText("¡Vaya! Página no encontrada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  });

  it("logs the missing route for developers", () => {
    renderWithI18n(<NotFound />, i18n);

    expect(console.error).toHaveBeenCalledWith(
      "404 Error: User attempted to access non-existent route:",
      "/",
    );
  });

  it("has no string left outside the catalogue in a second language", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderWithI18n(<NotFound />, english);

    expect(notFromCatalogue(visibleStrings(container))).toEqual([]);
    expect(screen.getByText("EN(¡Vaya! Página no encontrada)")).toBeInTheDocument();
  });
});
