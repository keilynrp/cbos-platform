/**
 * Catalogos por idioma, descubiertos por carpeta: `locales/<idioma>/<dominio>.json`.
 *
 * Partidos por dominio (`common`, `auth`, `errors`, luego `crm`, `sales`...) y
 * no un fichero unico por idioma: 514 cadenas en un JSON no se revisan en un
 * diff (ADR 0015).
 *
 * Se cargan de forma estatica. Con un unico idioma no hay nada que diferir, y
 * la carga perezosa (ADR 0015) llega cuando exista un segundo catalogo (tarea 12
 * del plan): entonces solo cambia `eager: true` por su version diferida y el
 * resto del modulo sigue igual.
 */
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

/** Idiomas con catalogo enviado. Hoy solo `es`. */
export const SUPPORTED_LOCALES: string[] = Object.keys(resources);
