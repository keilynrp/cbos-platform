import { afterEach, describe, expect, it } from "vitest";

import {
  EMPTY,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMilliseconds,
  formatMonthShort,
  formatMonthYear,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatUnit,
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

  it("keeps a numeric region too, as the backend and the locale helpers accept it", () => {
    // `es-419` (espanol de Latinoamerica) es un tag BCP 47 valido; reducirlo a la
    // region por defecto perderia justo la preferencia regional que guarda.
    expect(formattingLocale("es-419")).toBe("es-419");
    expect(formatDate("2026-09-30", "es-419", "short")).toBe("30/9/2026");
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

  it("does not reuse a formatter built for another time zone", () => {
    // `Intl.DateTimeFormat` captura la zona al construirse: una cache que solo
    // mire locale y opciones devuelve la hora de la zona anterior. Pasaba en CI
    // (UTC) y no en una maquina en otra zona, y tambien si la zona del sistema
    // cambia con la SPA abierta.
    const instant = "2026-09-30T03:30:00Z";

    process.env.TZ = "UTC";
    expect(formatDate(instant, "es", "short")).toBe("30/9/2026");

    process.env.TZ = "America/Mexico_City";
    expect(formatDate(instant, "es", "short")).toBe("29/9/2026");

    process.env.TZ = "Asia/Tokyo";
    expect(formatDate(instant, "es", "short")).toBe("30/9/2026");
    expect(formatDateTime(instant, "es")).toContain("12:30");

    process.env.TZ = "UTC";
    expect(formatDate(instant, "es", "short")).toBe("30/9/2026");
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

describe("formatCompactCurrency", () => {
  // `\s` cubre el espacio de no separacion que ICU pone entre el codigo y la cifra.
  it("abbreviates thousands and millions, as the KPI cards always did", () => {
    expect(formatCompactCurrency(850, "USD", "es")).toMatch(/^USD\s850$/);
    expect(formatCompactCurrency(12500, "USD", "es")).toMatch(/^USD\s12\.5\sk$/);
    expect(formatCompactCurrency(1200000, "USD", "es")).toMatch(/^USD\s1\.2\sM$/);
  });

  it("does not pad a round number with a decimal", () => {
    expect(formatCompactCurrency(0, "USD", "es")).toMatch(/^USD\s0$/);
    expect(formatCompactCurrency(1000000, "USD", "es")).toMatch(/^USD\s1\sM$/);
  });

  it("follows the locale", () => {
    expect(formatCompactCurrency(12500, "USD", "en-US")).toBe("$12.5K");
  });

  it("shows a placeholder for a missing value and survives a bad currency", () => {
    expect(formatCompactCurrency(null, "USD", "es")).toBe(EMPTY);
    expect(formatCompactCurrency(12500, "XX", "es")).toBe("12,500.00 XX");
  });
});

describe("formatMonthShort", () => {
  it("names the month in the locale, from a YYYY-MM value", () => {
    expect(formatMonthShort("2026-01", "es")).toBe("ene");
    expect(formatMonthShort("2026-04", "es")).toBe("abr");
    expect(formatMonthShort("2026-12", "en-US")).toBe("Dec");
  });

  it("shows a placeholder for anything that is not a month", () => {
    expect(formatMonthShort("garbage", "es")).toBe(EMPTY);
    expect(formatMonthShort("2026-13", "es")).toBe(EMPTY);
    expect(formatMonthShort("2026-00", "es")).toBe(EMPTY);
    expect(formatMonthShort(null, "es")).toBe(EMPTY);
  });
});

describe("formatMonthYear", () => {
  it("names the month and the two-digit year, from a YYYY-MM value", () => {
    // Antes salia "Apr '26" de un array de abreviaturas en ingles.
    expect(formatMonthYear("2026-04", "es")).toBe("abr 26");
    expect(formatMonthYear("2026-12", "en-US")).toBe("Dec 26");
  });

  it("shows a placeholder for anything that is not a month", () => {
    expect(formatMonthYear("garbage", "es")).toBe(EMPTY);
    expect(formatMonthYear("2026-13", "es")).toBe(EMPTY);
    expect(formatMonthYear(undefined, "es")).toBe(EMPTY);
  });
});

describe("formatUnit", () => {
  it("formats a number with an abbreviated unit, as the countdown printed it", () => {
    expect(formatUnit(3, "day", "es")).toBe("3d");
    expect(formatUnit(12, "millisecond", "es")).toBe("12ms");
  });

  it("follows the locale's number format", () => {
    expect(formatUnit(1234.5, "kilobyte", "es-ES")).toMatch(/^1234,5\s?kB$/);
  });

  it("shows a placeholder for a missing value", () => {
    expect(formatUnit(null, "day", "es")).toBe(EMPTY);
    expect(formatUnit(undefined, "day", "es")).toBe(EMPTY);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date(2026, 8, 30, 12, 0, 0).getTime();
  const ago = (ms: number) => formatRelativeTime(now - ms, "es", now);
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it("picks the unit from the size of the gap", () => {
    expect(ago(0)).toBe("ahora");
    expect(ago(30_000)).toBe("hace 30 s");
    expect(ago(5 * MIN)).toBe("hace 5 min");
    expect(ago(3 * HOUR)).toBe("hace 3 h");
    expect(ago(DAY)).toBe("ayer");
    expect(ago(10 * DAY)).toMatch(/^hace 10 d/);
  });

  it("truncates instead of rounding up, like the old helpers", () => {
    expect(ago(59 * MIN + 59_000)).toBe("hace 59 min");
    expect(ago(23 * HOUR + 59 * MIN)).toBe("hace 23 h");
  });

  it("speaks about the future too", () => {
    expect(formatRelativeTime(now + 5 * MIN, "es", now)).toMatch(/5 min/);
  });

  it("follows the locale", () => {
    expect(formatRelativeTime(now - 5 * MIN, "en-US", now)).toBe("5m ago");
  });

  it("accepts an ISO string and shows a placeholder for a bad value", () => {
    expect(formatRelativeTime(new Date(now - 3 * HOUR).toISOString(), "es", now)).toBe("hace 3 h");
    expect(formatRelativeTime(null, "es", now)).toBe(EMPTY);
    expect(formatRelativeTime("nope", "es", now)).toBe(EMPTY);
  });
});

describe("formatMilliseconds", () => {
  it("formats a duration as a unit, as the page printed it before", () => {
    // Antes era `{ms}ms` a mano: la unidad es de Intl, no una cadena de la pagina.
    expect(formatMilliseconds(12, "es")).toBe("12ms");
    expect(formatMilliseconds(1234.5, "es")).toBe("1,234.5ms");
  });

  it("follows the locale's number format", () => {
    expect(formatMilliseconds(1234.5, "es-ES")).toBe("1234,5ms");
  });

  it("shows a placeholder for a missing value", () => {
    expect(formatMilliseconds(null, "es")).toBe(EMPTY);
    expect(formatMilliseconds(undefined, "es")).toBe(EMPTY);
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
