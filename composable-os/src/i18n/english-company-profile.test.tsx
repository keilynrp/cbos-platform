import { fireEvent, screen, waitFor } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import globalI18n, { buildI18nOptions, resources } from "@/i18n";
import { ApiError } from "@/lib/api";
import CompanyProfileSettings from "@/pages/CompanyProfileSettings";
import { renderPageWithI18n } from "@/test/i18n";

/**
 * `companyProfile` en el ingles *real* (tarea 12 del plan de i18n): el formulario de
 * datos de facturacion, sus avisos del logo y el error del backend, con el catalogo
 * `en` que se envia.
 */

const svc = vi.hoisted(() => ({ getCompanyProfile: vi.fn(), updateCompanyProfile: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/services/accounting", () => ({ accountingService: svc }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

async function english(): Promise<I18n> {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions(resources, "en"));
  return instance;
}

const profile = (over: Record<string, unknown> = {}) => ({
  id: "p1", workspace_id: "w1", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  legal_name: "Acme Ltd", tax_id_label: "RFC", tax_id: "ABC010203XYZ", logo_data_uri: null,
  address_line: "1 Main St", city: "Springfield", state: "IL", postal_code: "55000", country: "USA",
  email: "a@b.co", phone: "123", website: "https://x.co", default_currency: "USD", default_tax_rate: 16,
  invoice_footer_note: "", ...over,
});

const pick = (container: HTMLElement, file: File) =>
  fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } });

beforeEach(() => {
  svc.getCompanyProfile.mockReset().mockResolvedValue(profile());
  svc.updateCompanyProfile.mockReset().mockImplementation(async (form) => profile(form));
  toast.mockReset();
});

describe("CompanyProfileSettings in English", () => {
  it("renders every section and label once the profile loads", async () => {
    renderPageWithI18n(<CompanyProfileSettings />, await english());

    expect(await screen.findByText("Billing details")).toBeInTheDocument();
    expect(screen.getByText("These details appear as the issuer on printed and exported invoices")).toBeInTheDocument();
    for (const text of [
      "Identity", "Legal name", "ID type", "Tax ID", "Address", "Street and number", "City",
      "State / Province", "Postal code", "Country", "Contact", "Email", "Phone", "Website",
      "Defaults", "Currency", "Default tax rate (%)", "Invoice footer note",
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByPlaceholderText("My Company Inc.")).toHaveValue("Acme Ltd");
    expect(screen.getByRole("button", { name: /Save/ })).toBeInTheDocument();
    expect(screen.queryByText("Guardar")).not.toBeInTheDocument();
  });

  it("states the logo limit", async () => {
    renderPageWithI18n(<CompanyProfileSettings />, await english());

    expect(await screen.findByText("PNG or JPG, up to 200 KB")).toBeInTheDocument();
  });

  it("saves and confirms with a toast", async () => {
    renderPageWithI18n(<CompanyProfileSettings />, await english());
    await screen.findByText("Billing details");

    fireEvent.click(screen.getByRole("button", { name: /Save/ }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Details saved" }));
  });

  it("reports a failed save with the backend error in English", async () => {
    svc.updateCompanyProfile.mockRejectedValue(
      new ApiError("Logo too large.", "ACCOUNTING_LOGO_TOO_LARGE", { size_kb: 300, max_kb: 200 }, 400),
    );
    const instance = await english();
    // `translateApiError` lee la instancia global: se le da el mismo idioma.
    await globalI18n.changeLanguage("en");
    try {
      renderPageWithI18n(<CompanyProfileSettings />, instance);
      await screen.findByText("Billing details");

      fireEvent.click(screen.getByRole("button", { name: /Save/ }));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({
          title: "Could not save",
          description: "The logo is 300 KB and the maximum is 200 KB. Reduce the image before uploading it.",
          variant: "destructive",
        }),
      );
    } finally {
      await globalI18n.changeLanguage("es");
    }
  });

  it("rejects an unsupported or oversized logo with English notices", async () => {
    const { container } = renderPageWithI18n(<CompanyProfileSettings />, await english());
    await screen.findByText("Billing details");

    pick(container, new File(["x"], "notes.pdf", { type: "application/pdf" }));
    pick(container, new File([new Uint8Array(300 * 1024)], "big.png", { type: "image/png" }));

    expect(toast).toHaveBeenCalledWith({
      title: "Unsupported format",
      description: "The logo must be a PNG or JPG.",
      variant: "destructive",
    });
    expect(toast).toHaveBeenCalledWith({
      title: "Logo too large",
      description: "It is 300 KB and the maximum is 200 KB.",
      variant: "destructive",
    });
    expect(svc.updateCompanyProfile).not.toHaveBeenCalled();
  });

  it("explains a failed load and offers to retry", async () => {
    svc.getCompanyProfile.mockRejectedValueOnce(undefined);
    renderPageWithI18n(<CompanyProfileSettings />, await english());

    expect(await screen.findByText("Could not load the billing details")).toBeInTheDocument();
    expect(screen.getByText("Unknown error")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Billing details")).toBeInTheDocument();
  });
});
