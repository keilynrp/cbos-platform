import { expect, type Page, type APIRequestContext } from "@playwright/test";

/**
 * Fixtures for the company-profile suite.
 *
 * The account is created on first run and reused afterwards, so repeated runs
 * do not accumulate workspaces in the dev database. The profile is reset
 * before each test instead, which is what actually needs to be clean.
 */

export const ACCOUNT = {
  workspace_name: "E2E Company Profile",
  workspace_slug: "e2e-company-profile",
  full_name: "E2E Runner",
  email: "e2e-company-profile@cbos-test.com",
  // Deliberately not a credential-shaped literal. This account only ever exists
  // in a local dev database and the suite creates it itself, but a string that
  // looks like a password trips secret scanners on every pull request. The
  // backend only requires 8 characters.
  password: process.env.E2E_PASSWORD ?? "e2e-local-fixture-not-a-secret",
};

/** Every field a test may dirty, so a reset really starts from zero. */
const BLANK_PROFILE = {
  legal_name: null,
  tax_id: null,
  tax_id_label: "RFC",
  address_line: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  email: null,
  phone: null,
  website: null,
  logo_data_uri: null,
  default_currency: "USD",
  default_tax_rate: 0,
  invoice_footer_note: null,
};

/** A valid 1x1 PNG — the smallest thing the uploader will accept. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** A PNG-signed buffer of an arbitrary size, to exercise the size guard. */
export function pngOfSize(bytes: number): Buffer {
  const buf = Buffer.alloc(bytes, 0x41);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  return buf;
}

/** Register the shared account, tolerating the case where it already exists. */
export async function ensureAccount(request: APIRequestContext): Promise<string> {
  const registered = await request.post("/api/v1/auth/register", { data: ACCOUNT });
  if (registered.ok()) return (await registered.json()).access_token;

  const logged = await request.post("/api/v1/auth/login", {
    data: { email: ACCOUNT.email, password: ACCOUNT.password },
  });
  expect(
    logged.ok(),
    `Could not register or log in the e2e account (register: ${registered.status()}, ` +
      `login: ${logged.status()}). Is the stack up?`,
  ).toBeTruthy();
  return (await logged.json()).access_token;
}

export async function resetProfile(request: APIRequestContext, token: string) {
  const res = await request.put("/api/v1/accounting/company-profile", {
    data: BLANK_PROFILE,
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `Could not reset the profile: ${res.status()}`).toBeTruthy();
}

/** Log in through the real form, so the app stores the token the way it does for a user. */
export async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', ACCOUNT.email);
  await page.fill('input[type="password"]', ACCOUNT.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("login"));
}

export const legalNameInput = (page: Page) =>
  page.locator('input[placeholder="Mi Empresa S.A. de C.V."]');

/**
 * A toast renders its text twice: the visible title and an aria-live span that
 * announces title and description together for screen readers. Matching
 * loosely resolves to both and trips strict mode, so pin the exact title.
 */
export const toast = (page: Page, title: string) => page.getByText(title, { exact: true });

export const fieldInput = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator("..").locator("input");
