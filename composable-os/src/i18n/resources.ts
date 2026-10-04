/**
 * Catalogos por idioma, descubiertos por carpeta: `locales/<idioma>/<dominio>.json`.
 *
 * Partidos por dominio (`common`, `auth`, `errors`, luego `crm`, `sales`...) y
 * no un fichero unico por idioma: 514 cadenas en un JSON no se revisan en un
 * diff (ADR 0015).
 *
 * Se cargan de forma estatica. Con un unico idioma no hay nada que diferir, y
 * la carga perezosa (ADR 0015) llega cuando haya un segundo catalogo completo
 * (tarea 12 del plan): entonces solo cambia `eager: true` por su version diferida
 * y el resto del modulo sigue igual.
 */
import { FALLBACK_LOCALE } from "./locale";

type Catalogue = Record<string, unknown>;

const files = import.meta.glob<Catalogue>("../locales/*/*.json", {
  eager: true,
  import: "default",
});

export const resources: Record<string, Record<string, Catalogue>> = {};

for (const [path, content] of Object.entries(files)) {
  const match = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, language, namespace] = match;
  (resources[language] ??= {})[namespace] = content;
}

/** Idioma de referencia: el que define que espacios de nombres hay que traducir. */
const BASE_LANGUAGE = FALLBACK_LOCALE;

/**
 * Idiomas que la interfaz ofrece: los que tienen **todos** los espacios de
 * nombres del idioma base.
 *
 * Una pantalla a medio traducir se lee como rota y es peor que ninguna (ADR
 * 0015), y con `fallbackLng` un idioma a medias cae al espanol sin avisar. Por eso
 * una carpeta en `locales/` no basta para ofrecer un idioma: se ofrece cuando el
 * ultimo dominio esta traducido, sin tocar nada mas. Hasta entonces el idioma
 * vive en `resources` (los tests lo usan) pero ni el selector, ni la deteccion del
 * navegador, ni `setLocale` llegan a el. La paridad clave a clave la vigila
 * `catalogues.test.ts`.
 */
export function releasedLocales(
  catalogues: Record<string, Record<string, Catalogue>>,
  base: string = BASE_LANGUAGE,
): string[] {
  const required = Object.keys(catalogues[base] ?? {});
  return Object.keys(catalogues).filter(
    (language) => language === base || required.every((namespace) => namespace in catalogues[language]),
  );
}

export const SUPPORTED_LOCALES: string[] = releasedLocales(resources);

/** Idiomas con catalogo en el repo pero incompletos: aun no se ofrecen. */
export const UNRELEASED_LOCALES: string[] = Object.keys(resources).filter(
  (language) => !SUPPORTED_LOCALES.includes(language),
);
