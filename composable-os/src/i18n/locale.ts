/**
 * Funciones puras de locale: normalizar, elegir catalogo y detectar el idioma
 * inicial. Espejo de `backend/app/core/i18n` (ADR 0016): mismas reglas, para que
 * el frontend no intente un locale que el PATCH del backend rechazaria.
 *
 * No leen ni escriben nada del entorno (ni `localStorage` ni `navigator`): lo
 * que necesitan entra por parametro. Asi se prueban sin jsdom y no dependen de
 * cuantos idiomas haya enviados, que hoy es uno.
 */

export const FALLBACK_LOCALE = "es";

const isAlpha = (value: string, lengths: number[]) =>
  lengths.includes(value.length) && /^[A-Za-z]+$/.test(value);

/**
 * Tag canonico (`es`, `es-MX`), o `null` si esta mal formado o no tiene
 * catalogo. Solo admite `idioma` o `idioma-REGION`: los subtags de escritura no
 * se necesitan hoy y aceptarlos sin uso es aceptar entrada que nadie probo.
 */
export function normalizeLocale(
  raw: string | null | undefined,
  supported: readonly string[],
): string | null {
  if (typeof raw !== "string") return null;

  const parts = raw.trim().replace(/_/g, "-").split("-");
  if (parts.length > 2) return null;

  const [language, region] = parts;
  if (!isAlpha(language, [2, 3])) return null;
  const base = language.toLowerCase();
  if (!supported.includes(base)) return null;

  if (parts.length === 1) return base;
  if (!isAlpha(region, [2])) return null;
  return `${base}-${region.toUpperCase()}`;
}

/** Catalogo que sirve a un locale: el idioma base, o el de reserva. */
export function catalogueFor(locale: string, supported: readonly string[]): string {
  const base = locale.replace(/_/g, "-").split("-")[0].toLowerCase();
  return supported.includes(base) ? base : FALLBACK_LOCALE;
}

interface DetectInput {
  /** Lo que el usuario eligio antes (localStorage), si hay algo. */
  stored: string | null;
  /** `navigator.languages`, de mayor a menor preferencia. */
  navigatorLanguages: readonly string[];
  supported: readonly string[];
}

/**
 * Idioma inicial, antes de saber quien es el usuario (p. ej. en el login).
 *
 * Con sesion iniciada manda el servidor: `/auth/me` devuelve el locale efectivo
 * ya resuelto, y aqui no se reimplementa esa cadena. Esto solo cubre el hueco
 * en que no hay usuario que preguntarle.
 *
 * Un valor guardado sin catalogo se trata como ausente y sigue la cadena.
 */
export function detectLocale({ stored, navigatorLanguages, supported }: DetectInput): string {
  const fromStorage = normalizeLocale(stored, supported);
  if (fromStorage) return fromStorage;

  for (const tag of navigatorLanguages) {
    const match =
      normalizeLocale(tag, supported) ??
      // `es-419` no es una region de dos letras, pero el idioma si se sirve.
      normalizeLocale(tag.replace(/_/g, "-").split("-")[0], supported);
    if (match) return match;
  }

  return FALLBACK_LOCALE;
}
