import { afterEach, describe, expect, it } from "vitest";

import {
  EMPTY,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formattingLocale,
  todayInputValue,
} from "@/i18n/format";

/**
 * Las expresiones `LEGACY_*` son lo que el codigo hacia antes de centralizar el
 * formateo. Las pruebas de equivalencia las comparan con los helpers para el
 * locale por defecto: adoptar el locale activo no debe cambiar un solo numero.
 */
const legacyCurrency = (n: number, currency: string, opts: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency, ...opts }).format(n);
const legacyDate = (iso: string, opts?: Intl.DateTimeFormatOptions) =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-MX", opts);

describe("formattingLocale", () => {
  it("keeps the full tag when it carries a region", () => {
    expect(formattingLocale("es-MX")).toBe("es-MX");
    expect(formattingLocale("es-ES")).toBe("es-ES");
  });

  it("gives a bare language the region the product already formats with", () => {
    // `es` a secas formatea a la espanola ("1234,50\u00a0US$"), y el locale por
    // defecto del producto es `es`: sin esta region por defecto, adoptar el
    // locale activo cambiaria todos los numeros de la aplicacion.
    expect(formattingLocale("es")).toBe("es-MX");
    expect(formattingLocale("en")).toBe("en-US");
  });

  it("falls back to the default for a language it does not know", () => {
    expect(formattingLocale("fr")).toBe("es-MX");
    expect(formattingLocale("")).toBe("es-MX");
  });
});

describe("formatCurrency", () => {
  it.each([
    [1234.5, "USD"],
    [1234.5, "MXN"],
    [0, "USD"],
    [-99.999, "EUR"],
  ])("matches the previous es-MX output for %s %s", (value, currency) => {
    expect(formatCurrency(value, currency, "es")).toBe(legacyCurrency(value, currency));
  });

  it("honours the fraction-digit options some pages use", () => {
    expect(formatCurrency(1234.5, "USD", "es", { maximumFractionDigits: 0 })).toBe(
      legacyCurrency(1234.5, "USD", { maximumFractionDigits: 0 }),
    );
    expect(formatCurrency(5, "USD", "es", { minimumFractionDigits: 2 })).toBe(
      legacyCurrency(5, "USD", { minimumFractionDigits: 2 }),
    );
  });

  it("follows the region when the locale carries one", () => {
    // ICU separa la cifra del simbolo con un espacio de no separacion (U+00A0).
    expect(formatCurrency(1234.5, "USD", "es-ES")).toBe("1234,50\u00a0US$");
    expect(formatCurrency(1234.5, "USD", "en-US")).toBe("$1,234.50");
  });

  it("shows a placeholder for a missing amount", () => {
    expect(formatCurrency(null, "USD", "es")).toBe(EMPTY);
    expect(formatCurrency(undefined, "USD", "es")).toBe(EMPTY);
  });

  it("does not throw on a currency code Intl rejects", () => {
    // Un RangeError aqui dejaria la pagina en blanco por un dato del servidor.
    expect(formatCurrency(1234.5, "XX", "es")).toBe("1,234.50 XX");
  });

  it("defaults the currency to USD, as every page helper did", () => {
    expect(formatCurrency(10, undefined, "es")).toBe(legacyCurrency(10, "USD"));
  });
});

describe("formatNumber and formatPercent", () => {
  it("formats thousands with the locale's separators", () => {
    expect(formatNumber(1234567.891, "es")).toBe("1,234,567.891");
    expect(formatNumber(1234567.891, "es-ES")).toBe("1.234.567,891");
  });

  it("formats a fraction as a percentage", () => {
    expect(formatPercent(0.125, "es", { maximumFractionDigits: 1 })).toBe("12.5%");
    expect(formatPercent(0.16, "es")).toBe("16%");
  });

  it("shows a placeholder for a missing value", () => {
    expect(formatNumber(null, "es")).toBe(EMPTY);
    expect(formatPercent(undefined, "es")).toBe(EMPTY);
  });
});

describe("formatDate", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("matches the previous es-MX output, short and medium", () => {
    expect(formatDate("2026-09-30", "es", "short")).toBe(legacyDate("2026-09-30"));
    expect(formatDate("2026-09-30", "es", "medium")).toBe(
      legacyDate("2026-09-30", { day: "2-digit", month: "short", year: "numeric" }),
    );
  });

  it("defaults to the medium style", () => {
    expect(formatDate("2026-09-30", "es")).toBe(formatDate("2026-09-30", "es", "medium"));
  });

  it("follows the locale", () => {
    expect(formatDate("2026-09-30", "en-US", "short")).toBe("9/30/2026");
  });

  it("keeps a date-only value on the same day in a timezone behind UTC", () => {
    // `new Date("2026-09-30")` es medianoche UTC: en Mexico (UTC-6) el mismo
    // instante es el 29 por la tarde. Cinco sitios lo parseaban asi.
    process.env.TZ = "America/Mexico_City";

    expect(new Date("2026-09-30").toLocaleDateString("es-MX")).toBe("29/9/2026"); // el bug
    expect(formatDate("2026-09-30", "es", "short")).toBe("30/9/2026");
  });

  it("formats a full timestamp as the instant it is", () => {
    process.env.TZ = "America/Mexico_City";

    expect(formatDate("2026-09-30T03:30:00Z", "es", "short")).toBe("29/9/2026");
  });

  it("shows a placeholder instead of 'Invalid Date'", () => {
    expect(formatDate(null, "es")).toBe(EMPTY);
    expect(formatDate(undefined, "es")).toBe(EMPTY);
    expect(formatDate("", "es")).toBe(EMPTY);
    expect(formatDate("not-a-date", "es")).toBe(EMPTY);
  });

  it("accepts a Date", () => {
    expect(formatDate(new Date(2026, 8, 30), "es", "short")).toBe("30/9/2026");
  });
});

describe("formatDateTime", () => {
  it("adds the time to the medium date", () => {
    const text = formatDateTime(new Date(2026, 8, 30, 15, 7), "es-ES");

    expect(text).toContain("30");
    expect(text).toContain("2026");
    expect(text).toContain("15:07");
  });

  it("shows a placeholder for a missing or invalid value", () => {
    expect(formatDateTime(null, "es")).toBe(EMPTY);
    expect(formatDateTime("nope", "es")).toBe(EMPTY);
  });
});

describe("todayInputValue", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("is today's date in the user's timezone, not in UTC", () => {
    // 23:30 en Mexico ya es el dia siguiente en UTC: `toISOString().slice(0,10)`
    // dejaba la fecha de pago por defecto en manana.
    process.env.TZ = "America/Mexico_City";
    const lateEvening = new Date(2026, 8, 30, 23, 30);

    expect(lateEvening.toISOString().slice(0, 10)).toBe("2026-10-01"); // el bug
    expect(todayInputValue(lateEvening)).toBe("2026-09-30");
  });

  it("zero-pads month and day", () => {
    expect(todayInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
