import { screen } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CloseLabel } from "@/components/CloseLabel";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { buildI18nOptions, resources } from "@/i18n";
import { useEnumLabel } from "@/i18n/enumLabel";
import NotFound from "@/pages/NotFound";
import { renderWithI18n } from "@/test/i18n";

/**
 * Renderiza con el catalogo `en` *real* (tarea 12 del plan de i18n), no con el
 * pseudo-localizado: los tests de pagina usan `EN(...)` para probar que nada
 * esta cableado, y estos prueban lo que aquellos no pueden: que el ingles que se
 * envia es ingles. Un `t("clave")` que siempre devuelve espanol se ve identico a
 * uno roto.
 *
 * `en` no se ofrece todavia (`UNRELEASED_LOCALES`): la instancia se construye con
 * los mismos ajustes que la app, pidiendo el idioma explicitamente.
 */
async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the real English catalogue", () => {
  it("renders a page in English", async () => {
    renderWithI18n(<NotFound />, await english());

    expect(screen.getByText("Oops! Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to home" })).toHaveAttribute("href", "/");
    expect(screen.queryByText("¡Vaya! Página no encontrada")).not.toBeInTheDocument();
  });

  it("renders the labels of a shared component, including the screen-reader ones", async () => {
    renderWithI18n(
      <>
        <CloseLabel />
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </>,
      await english(),
    );

    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to previous page" })).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("translates an enum value that arrives from the backend", async () => {
    const instance = await english();
    let label: ReturnType<typeof useEnumLabel> | undefined;
    function Probe() {
      label = useEnumLabel();
      return null;
    }
    renderWithI18n(<Probe />, instance);

    expect(label?.("common:invoiceStatus", "overdue")).toBe("Overdue");
    expect(label?.("common:invoiceStatus", "a_status_the_catalogue_lacks")).toBe("a_status_the_catalogue_lacks");
  });

  it("is a different language from Spanish for the same key", async () => {
    const spanish = i18next.createInstance();
    await spanish.init(buildI18nOptions(resources, "es"));
    const en = await english();

    expect(spanish.t("common:close")).toBe("Cerrar");
    expect(en.t("common:close")).toBe("Close");
  });

  it("serves the English catalogue to a regional tag and keeps the full tag", async () => {
    const instance = i18next.createInstance();
    await instance.init(buildI18nOptions(resources, "en-GB"));

    expect(instance.t("common:close")).toBe("Close");
    expect(instance.language).toBe("en-GB");
  });

  it("falls back to Spanish for a namespace English does not have yet", async () => {
    // Es la razon por la que `en` no se ofrece hasta estar completo: sin esto un
    // usuario veria la pantalla mezclada. Se fija para que nadie lo descubra en
    // produccion.
    const instance = await english();
    // `workflows` sigue pendiente: cuando se traduzca, este test pasa a otro dominio.
    expect(instance.t("workflows:new")).toBe("Nuevo Workflow");
  });
});
