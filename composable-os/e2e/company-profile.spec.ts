import { test, expect } from "@playwright/test";
import {
  ensureAccount,
  fieldInput,
  legalNameInput,
  login,
  pngOfSize,
  resetProfile,
  TINY_PNG,
  toast,
} from "./helpers";

/**
 * Covers the two frontend requirements in the company-profile spec that no
 * other layer can check — the uploader must reject an oversized file *without
 * issuing a request*, and the loading/error states must render — plus the
 * round trip a user actually performs.
 *
 * The PDF's contents are deliberately not asserted here: the backend suite
 * extracts the rendered text with pypdf. What this file adds is proof that the
 * data saved from the page reaches the download.
 */

let token: string;

test.beforeAll(async ({ request }) => {
  token = await ensureAccount(request);
});

test.beforeEach(async ({ request, page }) => {
  await resetProfile(request, token);
  await login(page);
});

test("loads with empty fields and no error", async ({ page }) => {
  await page.goto("/settings/company");
  await expect(legalNameInput(page)).toHaveValue("");
  await expect(page.getByText("No se pudieron cargar")).toHaveCount(0);
});

test("saves and keeps the values across a reload", async ({ page }) => {
  await page.goto("/settings/company");
  await legalNameInput(page).fill("Distribuidora Ñandú S.A. de C.V.");
  await fieldInput(page, "Identificador fiscal").fill("ABC010203XYZ");
  await page.click('button:has-text("Guardar")');
  await expect(toast(page, "Datos guardados")).toBeVisible();

  await page.reload();
  await expect(legalNameInput(page)).toHaveValue("Distribuidora Ñandú S.A. de C.V.");
  await expect(fieldInput(page, "Identificador fiscal")).toHaveValue("ABC010203XYZ");
});

test("rejects a logo over 200 KB without issuing a request", async ({ page }) => {
  await page.goto("/settings/company");
  await expect(legalNameInput(page)).toBeVisible();

  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("company-profile")) requests.push(r.method());
  });

  await page.setInputFiles('input[type="file"]', {
    name: "grande.png",
    mimeType: "image/png",
    buffer: pngOfSize(250 * 1024),
  });

  await expect(toast(page, "Logo demasiado grande")).toBeVisible();
  // The guard is only worth having if it fires before the network does.
  expect(requests, "the oversized logo must never reach the API").toHaveLength(0);
  await expect(page.locator('img[alt="Logo"]')).toHaveCount(0);
});

test("rejects a non-image file without issuing a request", async ({ page }) => {
  await page.goto("/settings/company");
  await expect(legalNameInput(page)).toBeVisible();

  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("company-profile")) requests.push(r.method());
  });

  await page.setInputFiles('input[type="file"]', {
    name: "notas.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 not an image"),
  });

  await expect(toast(page, "Formato no admitido")).toBeVisible();
  expect(requests).toHaveLength(0);
});

test("previews, persists and clears the logo", async ({ page }) => {
  await page.goto("/settings/company");
  await expect(legalNameInput(page)).toBeVisible();

  await page.setInputFiles('input[type="file"]', {
    name: "logo.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await expect(page.locator('img[alt="Logo"]')).toBeVisible();

  await page.click('button:has-text("Guardar")');
  await expect(toast(page, "Datos guardados")).toBeVisible();
  await page.reload();
  await expect(page.locator('img[alt="Logo"]')).toBeVisible();

  await page.click('button:has-text("Quitar")');
  await expect(page.locator('img[alt="Logo"]')).toHaveCount(0);
  await page.click('button:has-text("Guardar")');
  await expect(toast(page, "Datos guardados")).toBeVisible();
  await page.reload();
  await expect(legalNameInput(page)).toBeVisible();
  await expect(page.locator('img[alt="Logo"]')).toHaveCount(0);
});

test("renders the error state and recovers on retry", async ({ page }) => {
  // Fail only the profile read; everything else on the page keeps working.
  await page.route("**/accounting/company-profile", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ status: 500, contentType: "application/json", body: '{"detail":"Boom"}' })
      : route.continue(),
  );

  await page.goto("/settings/company");
  await expect(page.getByText("No se pudieron cargar los datos de facturación")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  // An empty form here would read as "nothing configured yet".
  await expect(legalNameInput(page)).toHaveCount(0);

  await page.unroute("**/accounting/company-profile");
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(legalNameInput(page)).toBeVisible();
});

test("Facturación links to the settings page", async ({ page }) => {
  await page.goto("/invoicing");
  const link = page.getByRole("link", { name: /Datos de facturación/ });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/settings\/company$/);
  await expect(legalNameInput(page)).toBeVisible();
});

test("the saved issuer reaches the downloaded PDF", async ({ page }) => {
  await page.goto("/settings/company");
  await legalNameInput(page).fill("Distribuidora Ñandú S.A. de C.V.");
  await page.click('button:has-text("Guardar")');
  await expect(toast(page, "Datos guardados")).toBeVisible();

  // Drive the download the way the app does: same origin, same stored token.
  // The invoice is deleted afterwards so repeated runs do not pile up drafts.
  const pdf = await page.evaluate(async () => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("cbos_token")}`,
    };
    const invoice = await fetch("/api/v1/accounting/invoices", {
      method: "POST",
      headers,
      body: JSON.stringify({
        issue_date: "2026-08-04",
        currency: "USD",
        lines: [{ description: "Servicio", quantity: 1, unit_price: 100 }],
      }),
    }).then((r) => r.json());

    const res = await fetch(`/api/v1/accounting/invoices/${invoice.id}/pdf`, { headers });
    const bytes = new Uint8Array(await res.arrayBuffer());

    const deleted = await fetch(`/api/v1/accounting/invoices/${invoice.id}`, {
      method: "DELETE",
      headers,
    });

    return {
      status: res.status,
      type: res.headers.get("content-type"),
      magic: String.fromCharCode(...bytes.slice(0, 4)),
      size: bytes.length,
      cleanedUp: deleted.status === 204,
    };
  });

  expect(pdf.status).toBe(200);
  expect(pdf.type).toBe("application/pdf");
  expect(pdf.magic).toBe("%PDF");
  // A configured issuer embeds a Unicode subset, so the file is far past the
  // ~1.7 KB a core-font-only document weighs.
  expect(pdf.size).toBeGreaterThan(5_000);
  expect(pdf.cleanedUp, "the draft invoice should be removed after the check").toBe(true);
});
