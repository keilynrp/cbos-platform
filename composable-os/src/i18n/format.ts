/**
 * Formateo de moneda, numeros y fechas segun el locale activo.
 *
 * Es el unico sitio de la aplicacion que construye un `Intl.NumberFormat` o
 * `Intl.DateTimeFormat` o llama a `toLocale*String` (lo hace cumplir una regla
 * de eslint). Antes habia ~28 llamadas dispersas que decidian el locale cada una
 * por su cuenta: unas con `"es-MX"` cableado, otras con `"en-US"`, y otras con
 * el del navegador, de modo que la misma cifra salia distinta segun la pagina.
 *
 * No pasa por i18next (ADR 0015): usa `Intl`, que ya conoce las reglas de cada
 * region. Son funciones puras que reciben el locale; el hook `useFormat` las
 * liga al idioma activo y re-renderiza al cambiarlo.
 */

/** Lo que se muestra cuando falta el valor. No pertenece a ningun idioma. */
export const EMPTY = "—";

/**
 * Region con la que se formatea un idioma sin region.
 *
 * El catalogo cae de `es-MX` a `es`, pero el formateo no: `es` a secas formatea
 * a la espanola (`1234,50 US$`, `1.234.567,89`), mientras que el producto
 * siempre ha formateado como `es-MX` (`USD 1,234.50`). Como el locale por
 * defecto es `es` (ADR 0016), sin esta tabla adoptar el locale activo cambiaria
 * todos los numeros de la aplicacion. Un usuario o workspace que quiera el
 * formato espanol fija `es-ES` y se respeta.
 */
const REGION_DEFAULTS: Record<string, string> = { es: "es-MX", en: "en-US" };
const FALLBACK_FORMATTING_LOCALE = "es-MX";

/** El tag que se le pasa a `Intl`: el completo si trae region, si no el de la tabla. */
export function formattingLocale(locale: string): string {
  const tag = (locale ?? "").trim().replace(/_/g, "-");

  // Region de dos letras (`MX`) o numerica UN M.49 de tres cifras (`419`).
  const withRegion = /^([A-Za-z]{2,3})-([A-Za-z]{2}|\d{3})$/.exec(tag);
  if (withRegion) return `${withRegion[1].toLowerCase()}-${withRegion[2].toUpperCase()}`;

  const base = tag.split("-")[0].toLowerCase();
  return REGION_DEFAULTS[base] ?? FALLBACK_FORMATTING_LOCALE;
}

// Construir un formateador es caro y las tablas lo piden por fila.
const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }
  return format;
}

// `Intl.DateTimeFormat` captura la zona horaria al construirse. Una cache que solo
// mirase locale y opciones seguiria dando la hora de la zona anterior si esta
// cambia (un entorno UTC y otro no, o el sistema cambiando de zona con la SPA
// abierta). La zona entra en la clave, pero resolverla cuesta construir un
// formateador, asi que solo se vuelve a resolver cuando cambia el desfase respecto
// de UTC (que es tambien lo que pasa en un cambio de horario de verano).
let lastOffset: number | null = null;
let lastZone = "";

function currentTimeZone(): string {
  const offset = new Date().getTimezoneOffset();
  if (offset !== lastOffset) {
    lastOffset = offset;
    lastZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return lastZone;
}

function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${currentTimeZone()}|${JSON.stringify(options)}`;
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options);
    dateFormats.set(key, format);
  }
  return format;
}

const isMissing = (value: number | null | undefined): value is null | undefined =>
  value === null || value === undefined || Number.isNaN(value);

// ── Numeros ─────────────────────────────────────────────────────────────────

export function formatNumber(
  value: number | null | undefined,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  if (isMissing(value)) return EMPTY;
  return numberFormat(formattingLocale(locale), options).format(value);
}

/** `value` es una fraccion: 0.125 -> "12.5%". */
export function formatPercent(
  value: number | null | undefined,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  if (isMissing(value)) return EMPTY;
  return numberFormat(formattingLocale(locale), { style: "percent", ...options }).format(value);
}

/**
 * Una duracion en milisegundos, con la unidad de `Intl` ("12ms"). La unidad
 * abreviada es la misma en los idiomas que usa el producto, pero su posicion y
 * el separador decimal no, y no es texto que deba vivir en una pagina.
 */
export function formatMilliseconds(value: number | null | undefined, locale: string): string {
  if (isMissing(value)) return EMPTY;
  return numberFormat(formattingLocale(locale), {
    style: "unit",
    unit: "millisecond",
    unitDisplay: "narrow",
  }).format(value);
}

export function formatCurrency(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  if (isMissing(value)) return EMPTY;
  return currencyText(value, currency || "USD", locale, options);
}

/**
 * Importe abreviado para tarjetas de KPI y ejes de graficos: `USD 12.5 k`,
 * `USD 1.2 M`. La abreviatura (k, M, mil) la pone `Intl` segun el locale; antes
 * eran `$`, `k` y `M` escritos a mano.
 */
export function formatCompactCurrency(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: string,
): string {
  if (isMissing(value)) return EMPTY;
  return currencyText(value, currency || "USD", locale, {
    notation: "compact",
    compactDisplay: "short",
    // Sin esto la moneda impone dos decimales ("USD 850.00") y un 0 sale "USD 0.0".
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function currencyText(
  value: number,
  code: string,
  locale: string,
  options: Intl.NumberFormatOptions,
): string {
  const tag = formattingLocale(locale);
  try {
    return numberFormat(tag, { style: "currency", currency: code, ...options }).format(value);
  } catch (error) {
    // Intl lanza RangeError ante un codigo de moneda que no conoce. Venia del
    // servidor: no debe dejar la pagina en blanco, asi que se muestra la cifra
    // con el codigo tal cual.
    if (error instanceof RangeError) {
      const amount = numberFormat(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${amount.format(value)} ${code}`;
    }
    throw error;
  }
}

// ── Fechas ──────────────────────────────────────────────────────────────────

type DateInput = string | number | Date | null | undefined;

/**
 * Convierte a `Date`, o `null` si no hay nada que mostrar.
 *
 * Un valor de solo dia (`2026-09-30`) es una fecha de calendario, no un
 * instante: se interpreta a medianoche *local*. `new Date("2026-09-30")` es
 * medianoche UTC, que en Mexico (UTC-6) es el 29 por la tarde.
 */
function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) {
      const [year, month, day] = [Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3])];
      const date = new Date(year, month - 1, day);
      // `2026-13-45` no es una fecha: new Date la desborda al ano siguiente.
      return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type DateStyle = "short" | "medium";

const DATE_STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: {}, // numerica del locale: 30/9/2026
  medium: { day: "2-digit", month: "short", year: "numeric" }, // 30 sep 2026
};

export function formatDate(value: DateInput, locale: string, style: DateStyle = "medium"): string {
  const date = toDate(value);
  if (!date) return EMPTY;
  return dateFormat(formattingLocale(locale), DATE_STYLES[style]).format(date);
}

export function formatDateTime(value: DateInput, locale: string): string {
  const date = toDate(value);
  if (!date) return EMPTY;
  return dateFormat(formattingLocale(locale), {
    ...DATE_STYLES.medium,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * El nombre corto de un mes a partir de `YYYY-MM` (lo que devuelve la API de
 * analitica): "2026-04" -> "abr". Antes salia de un array de abreviaturas en
 * ingles escrito a mano, asi que un dashboard en espanol mostraba "Apr".
 */
export function formatMonthShort(yearMonth: string | null | undefined, locale: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth ?? "");
  if (!match) return EMPTY;

  const month = Number(match[2]);
  if (month < 1 || month > 12) return EMPTY;

  return dateFormat(formattingLocale(locale), { month: "short" }).format(
    new Date(Number(match[1]), month - 1, 1),
  );
}

const relativeFormats = new Map<string, Intl.RelativeTimeFormat>();

/**
 * "hace 5 min", "ayer", "ahora": la distancia a `now` en la unidad que toca.
 *
 * Trunca en vez de redondear (59 min 59 s es "hace 59 min", no "hace 1 h"),
 * como los tres helpers `timeAgo` a los que sustituye, que ademas pintaban
 * "5m ago" en ingles en una interfaz en espanol.
 */
export function formatRelativeTime(value: DateInput, locale: string, now: number = Date.now()): string {
  const date = toDate(value);
  if (!date) return EMPTY;

  const tag = formattingLocale(locale);
  let format = relativeFormats.get(tag);
  if (!format) {
    format = new Intl.RelativeTimeFormat(tag, { numeric: "auto", style: "narrow" });
    relativeFormats.set(tag, format);
  }

  const seconds = Math.trunc((date.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return format.format(seconds, "second");
  if (abs < 3600) return format.format(Math.trunc(seconds / 60), "minute");
  if (abs < 86_400) return format.format(Math.trunc(seconds / 3600), "hour");
  return format.format(Math.trunc(seconds / 86_400), "day");
}

/**
 * Hoy, como valor de un `<input type="date">` (`YYYY-MM-DD`), en la zona del
 * usuario. `toISOString().slice(0, 10)` da el dia en UTC: pasadas las 18:00 en
 * Mexico ya es "manana".
 */
export function todayInputValue(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
