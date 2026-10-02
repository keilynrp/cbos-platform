import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { findHardcodedStrings } from "@/test/hardcoded";

/**
 * Las paginas y componentes migrados a i18n, relativos a `src/`.
 *
 * Una pantalla a medio traducir se lee como rota y es peor que ninguna (ADR
 * 0015), asi que una vez que una esta aqui no puede volver a tener texto cableado:
 * el test falla con el fichero, la linea y la cadena.
 *
 * Al migrar una pagina se anade a esta lista en el mismo cambio. Lo que no es de
 * ningun idioma (un nombre propio, una unidad) se marca con `i18n-ok` en la
 * misma linea; ver `src/test/hardcoded.ts`.
 */
export const MIGRATED = [
  "pages/Login.tsx",
  "pages/Register.tsx",
  "pages/Workflows.tsx",
  "pages/Index.tsx",
  "pages/Discovery.tsx",
  "pages/Settings.tsx",
  "pages/NotFound.tsx",
  "pages/CompanyProfileSettings.tsx",
  "pages/CustomerPortal.tsx",
  "pages/Analytics.tsx",
  "pages/Contracts.tsx",
  "pages/CRM.tsx",
  "pages/InventoryOrders.tsx",
  "pages/Projects.tsx",
  "pages/HR.tsx",
  "pages/Sales.tsx",
  "pages/QuoteDetail.tsx",
  "pages/Invoicing.tsx",
  "components/sales/QuoteStatusBadge.tsx",
  "components/LanguageSelector.tsx",
  "components/CloseLabel.tsx",
  "components/ui/dialog.tsx",
  "components/ui/sheet.tsx",
  "components/ui/sidebar.tsx",
  "components/ui/pagination.tsx",
  "components/ui/breadcrumb.tsx",
  "components/ui/carousel.tsx",
  "components/layout/AppSidebar.tsx",
  "components/layout/AppLayout.tsx",
];

describe("migrated pages keep every visible string in the catalogue", () => {
  it.each(MIGRATED)("%s", (file) => {
    const source = readFileSync(resolve(__dirname, "..", file), "utf8");

    const hardcoded = findHardcodedStrings(source, file).map((f) => `${file}:${f.line} ${f.kind}: ${f.text}`);

    expect(hardcoded).toEqual([]);
  });

  it("lists files that exist", () => {
    // Un fichero renombrado o borrado dejaria de vigilarse sin avisar.
    for (const file of MIGRATED) {
      expect(() => readFileSync(resolve(__dirname, "..", file), "utf8"), file).not.toThrow();
    }
  });
});
