import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { ApiError } from "@/lib/api";
import CompanyProfileSettings from "@/pages/CompanyProfileSettings";
import { createPseudoInstance, notFromCatalogue, renderPageWithI18n, visibleStrings } from "@/test/i18n";

const svc = vi.hoisted(() => ({ getCompanyProfile: vi.fn(), updateCompanyProfile: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/services/accounting", () => ({ accountingService: svc }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

/** Valores del perfil (datos del usuario) y las opciones de los desplegables: no son texto de la interfaz. */
const DATA = ["RFC", "USD"];

const profile = (over: Record<string, unknown> = {}) => ({
  id: "p1", workspace_id: "w1", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  legal_name: "Distribuidora Ñandú", tax_id_label: "RFC", tax_id: "ABC010203XYZ", logo_data_uri: null,
  address_line: "Calle 1", city: "Cienfuegos", state: "CF", postal_code: "55000", country: "Cuba",
  email: "a@b.co", phone: "123", website: "https://x.co", default_currency: "USD", default_tax_rate: 16,
  invoice_footer_note: "", ...over,
});

const fileInput = (container: HTMLElement) => container.querySelector('input[type="file"]') as HTMLInputElement;
const pick = (container: HTMLElement, file: File) =>
  fireEvent.change(fileInput(container), { target: { files: [file] } });

beforeEach(() => {
  svc.getCompanyProfile.mockReset().mockResolvedValue(profile());
  svc.updateCompanyProfile.mockReset().mockImplementation(async (form) => profile(form));
  toast.mockReset();
});

describe("CompanyProfileSettings, in Spanish", () => {
  it("renders every section and label once the profile loads", async () => {
    renderPageWithI18n(<CompanyProfileSettings />, i18n);

    expect(await screen.findByText("Datos de facturación")).toBeInTheDocument();
    expect(screen.getByText("Estos datos aparecen como emisor en las facturas impresas y exportadas")).toBeInTheDocument();
    for (const text of [
      "Identidad", "Razón social", "Tipo de ID", "Identificador fiscal", "Dirección", "Calle y número", "Ciudad",
      "Estado / Provincia", "Código postal", "País", "Contacto", "Email", "Teléfono", "Sitio web",
      "Valores por defecto", "Moneda", "IVA por defecto (%)", "Nota al pie de la factura",
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByPlaceholderText("Mi Empresa S.A. de C.V.")).toHaveValue("Distribuidora Ñandú");
    expect(screen.getByRole("button", { name: /Guardar/ })).toBeInTheDocument();
  });

  it("states the logo limit from the same constant that enforces it", async () => {
    renderPageWithI18n(<CompanyProfileSettings />, i18n);

    expect(await screen.findByText("PNG o JPG, máximo 200 KB")).toBeInTheDocument();
  });

  it("saves and confirms with a toast", async () => {
    renderPageWithI18n(<CompanyProfileSettings />, i18n);
    await screen.findByText("Datos de facturación");

    fireEvent.click(screen.getByRole("button", { name: /Guardar/ }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Datos guardados" }));
  });

  it("reports a failed save with the translated backend error", async () => {
    svc.updateCompanyProfile.mockRejectedValue(
      new ApiError("Logo too large.", "ACCOUNTING_LOGO_TOO_LARGE", { size_kb: 300, max_kb: 200 }, 400),
    );
    renderPageWithI18n(<CompanyProfileSettings />, i18n);
    await screen.findByText("Datos de facturación");

    fireEvent.click(screen.getByRole("button", { name: /Guardar/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        title: "No se pudo guardar",
        description: "El logo pesa 300 KB y el maximo son 200 KB. Reduce la imagen antes de subirla.",
        variant: "destructive",
      }),
    );
  });

  it("rejects a logo in an unsupported format before it reaches the API", async () => {
    const { container } = renderPageWithI18n(<CompanyProfileSettings />, i18n);
    await screen.findByText("Datos de facturación");

    pick(container, new File(["x"], "notas.pdf", { type: "application/pdf" }));

    expect(toast).toHaveBeenCalledWith({
      title: "Formato no admitido",
      description: "El logo debe ser PNG o JPG.",
      variant: "destructive",
    });
    expect(svc.updateCompanyProfile).not.toHaveBeenCalled();
  });

  it("rejects an oversized logo and says how big it was", async () => {
    const { container } = renderPageWithI18n(<CompanyProfileSettings />, i18n);
    await screen.findByText("Datos de facturación");

    pick(container, new File([new Uint8Array(300 * 1024)], "grande.png", { type: "image/png" }));

    expect(toast).toHaveBeenCalledWith({
      title: "Logo demasiado grande",
      description: "Pesa 300 KB y el maximo son 200 KB.",
      variant: "destructive",
    });
  });

  it("previews an accepted logo and lets the user remove it", async () => {
    const { container } = renderPageWithI18n(<CompanyProfileSettings />, i18n);
    await screen.findByText("Datos de facturación");

    pick(container, new File([new Uint8Array(10)], "logo.png", { type: "image/png" }));

    const logo = await screen.findByAltText("Logo");
    expect(logo).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Quitar/ }));
    await waitFor(() => expect(screen.queryByAltText("Logo")).not.toBeInTheDocument());
  });

  it("explains a failed load and offers to retry, instead of an empty form", async () => {
    svc.getCompanyProfile.mockRejectedValueOnce(new Error("down"));
    renderPageWithI18n(<CompanyProfileSettings />, i18n);

    expect(await screen.findByText("No se pudieron cargar los datos de facturación")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Mi Empresa S.A. de C.V.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Datos de facturación")).toBeInTheDocument();
  });

  it("uses the catalogue's fallback for an error without a message", async () => {
    svc.getCompanyProfile.mockRejectedValueOnce(undefined);
    renderPageWithI18n(<CompanyProfileSettings />, i18n);

    expect(await screen.findByText("Error desconocido")).toBeInTheDocument();
  });
});

describe("CompanyProfileSettings, in a second language", () => {
  const strings = (root: HTMLElement) => notFromCatalogue(visibleStrings(root), DATA);

  it("has no string left outside the catalogue once loaded", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<CompanyProfileSettings />, english);
    await screen.findByText("EN(Datos de facturación)");

    expect(strings(container)).toEqual([]);
  });

  it("has no string left outside the catalogue when the load fails", async () => {
    svc.getCompanyProfile.mockRejectedValue(undefined);
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<CompanyProfileSettings />, english);
    await screen.findByText("EN(No se pudieron cargar los datos de facturación)");

    expect(strings(container)).toEqual([]);
    expect(screen.getByText("EN(Error desconocido)")).toBeInTheDocument();
  });

  it("translates the logo toasts", async () => {
    const english = await createPseudoInstance("en");
    const { container } = renderPageWithI18n(<CompanyProfileSettings />, english);
    await screen.findByText("EN(Datos de facturación)");

    pick(container, new File(["x"], "notas.pdf", { type: "application/pdf" }));
    pick(container, new File([new Uint8Array(300 * 1024)], "g.png", { type: "image/png" }));

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "EN(Formato no admitido)", description: "EN(El logo debe ser PNG o JPG.)" }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "EN(Logo demasiado grande)", description: "EN(Pesa 300 KB y el maximo son 200 KB.)" }));
  });
});
