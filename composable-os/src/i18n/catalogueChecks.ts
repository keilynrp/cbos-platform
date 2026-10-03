import ts from "typescript";

/**
 * Comprobaciones sobre los catalogos de `locales/`, sin dependencias de i18next
 * ni de React: reciben datos y devuelven problemas, para que un test pueda
 * probarlas con catalogos inventados.
 *
 * Existen porque un `t("clave")` que siempre devuelve espanol se ve identico a
 * uno roto (plan de i18n, tarea 12). Dos averias no avisan por si solas:
 *
 * - **Paridad**: un idioma al que le falta una clave cae al de reserva *en
 *   silencio*, y la pantalla queda mitad traducida.
 * - **Cadenas huerfanas**: una clave que ya nadie usa se queda en el catalogo
 *   para siempre y se traduce por nada; una clave que el codigo pide y no existe
 *   pinta la propia clave.
 *
 * Las claves son siempre `espacio:ruta.anidada`, igual que en el backend.
 */

export type Catalogue = Record<string, unknown>;
/** `idioma -> espacio de nombres -> arbol de cadenas` */
export type Catalogues = Record<string, Record<string, Catalogue>>;

/** Sufijos de plural de i18next: `runs_one`, `runs_other` se piden como `runs`. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Cada cadena del arbol, con su ruta (`card.runs_one`). Los grupos no cuentan. */
export function leaves(tree: Catalogue, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      for (const [p, v] of leaves(value as Catalogue, path)) out.set(p, v);
    } else {
      out.set(path, String(value));
    }
  }
  return out;
}

/** Los `{{marcadores}}` de una cadena, ordenados y sin repetir. */
export function placeholders(message: string): string[] {
  const found = new Set<string>();
  for (const m of message.matchAll(/\{\{\s*([^}\s,]+)[^}]*\}\}/g)) found.add(m[1]);
  return [...found].sort();
}

// ---------------------------------------------------------------- paridad

export interface ParityOptions {
  /** Idioma de referencia: lo que otro idioma debe tener. */
  base: string;
  /**
   * Espacios de nombres que un idioma aun no ha traducido, por idioma. Permite
   * enviar un idioma por dominios sin romper el check, pero es un trinquete:
   * solo puede encogerse. Un espacio listado que ya existe, o que no existe en
   * el idioma base, es un problema (la lista se quedo vieja).
   */
  pending?: Record<string, string[]>;
}

/**
 * Lo que un idioma tiene distinto del base. Cada problema es una frase que dice
 * que arreglar:
 *
 * - una clave que falta (cae al idioma base sin avisar);
 * - una clave que sobra (el base no la tiene: se traduce algo que nadie pide);
 * - un marcador `{{x}}` que cambia (la traduccion pintaria `{{x}}` o lo perderia);
 * - un valor que no es cadena.
 */
export function compareCatalogues(catalogues: Catalogues, options: ParityOptions): string[] {
  const { base, pending = {} } = options;
  const problems: string[] = [];
  const reference = catalogues[base];
  if (!reference) return [`no hay catalogo del idioma base "${base}"`];

  for (const [language, namespaces] of Object.entries(catalogues)) {
    if (language === base) continue;
    const skipped = new Set(pending[language] ?? []);

    for (const ns of skipped) {
      if (!(ns in reference)) problems.push(`${language}: "${ns}" esta como pendiente pero ${base} no tiene ese espacio`);
      else if (ns in namespaces) problems.push(`${language}: "${ns}" ya existe, quitalo de la lista de pendientes`);
    }

    for (const ns of Object.keys(reference)) {
      if (skipped.has(ns)) continue;
      if (!(ns in namespaces)) {
        problems.push(`${language}: falta el espacio "${ns}"`);
        continue;
      }
      const want = leaves(reference[ns]);
      const have = leaves(namespaces[ns]);

      for (const [path, message] of want) {
        const mine = have.get(path);
        if (mine === undefined) {
          problems.push(`${language}: falta ${ns}:${path}`);
          continue;
        }
        const a = placeholders(message).join(",");
        const b = placeholders(mine).join(",");
        if (a !== b) problems.push(`${language}: ${ns}:${path} usa {{${b}}} y ${base} usa {{${a}}}`);
      }
      for (const path of have.keys()) {
        if (!want.has(path)) problems.push(`${language}: sobra ${ns}:${path}, ${base} no la tiene`);
      }
    }

    for (const ns of Object.keys(namespaces)) {
      if (!(ns in reference)) problems.push(`${language}: el espacio "${ns}" no existe en ${base}`);
    }
  }
  return problems;
}

// -------------------------------------------------------------- huerfanas

export interface KeyUse {
  /** `ns:ruta` con `*` donde el codigo interpola (`ns:status.*`). */
  pattern: string;
  file: string;
  line: number;
}

/**
 * Las claves que un fichero menciona: todo literal de cadena que empiece por un
 * espacio de nombres conocido y `:`. No intenta entender `t(...)`: una clave
 * guardada en una tabla de datos y pedida mas tarde cuenta igual, que es como
 * se escriben las claves de este codigo.
 *
 * Un literal con `${...}` se vuelve un patron (`ns:status.${s}` -> `ns:status.*`).
 */
export function findKeyUses(source: string, file: string, namespaces: Iterable<string>): KeyUse[] {
  const known = new Set(namespaces);
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX);
  const uses: KeyUse[] = [];

  const take = (position: number, text: string) => {
    const match = text.match(/^([A-Za-z][A-Za-z0-9]*):(\S+)$/);
    if (!match || !known.has(match[1])) return;
    uses.push({ pattern: text, file, line: sf.getLineAndCharacterOfPosition(position).line + 1 });
  };

  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      take(node.getStart(sf), node.text);
    } else if (ts.isTemplateExpression(node)) {
      const text = node.head.text + node.templateSpans.map((s) => `*${s.literal.text}`).join("");
      take(node.getStart(sf), text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return uses;
}

const escapeRegex = (s: string) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
const toRegex = (pattern: string) =>
  new RegExp(`^${pattern.split("*").map(escapeRegex).join("[^:]*")}(?:\\..*)?$`);

/** `ns:ruta` de cada cadena del catalogo, con el sufijo de plural quitado. */
function keysOf(namespaces: Record<string, Catalogue>): string[] {
  const keys = new Set<string>();
  for (const [ns, tree] of Object.entries(namespaces)) {
    for (const path of leaves(tree).keys()) keys.add(`${ns}:${path.replace(PLURAL_SUFFIX, "")}`);
  }
  return [...keys];
}

export interface UsageReport {
  /** Claves del catalogo que ningun fichero menciona. */
  orphans: string[];
  /** Menciones sin literal interpolado que no existen en el catalogo. */
  missing: KeyUse[];
}

/**
 * Cruza lo que el codigo menciona con lo que el catalogo tiene.
 *
 * - Un literal exacto (`ns:a.b`) usa esa clave. Si apunta a un *grupo*
 *   (`ns:runStatus`, el prefijo de `useEnumLabel`) usa todo lo que cuelga de el.
 * - Un patron (`ns:status.*`) usa todo lo que case.
 * - Un literal exacto que no es clave ni grupo es una clave que no existe.
 */
export function crossCheck(catalogue: Record<string, Catalogue>, uses: KeyUse[]): UsageReport {
  const keys = keysOf(catalogue);
  const used = new Set<string>();
  const missing: KeyUse[] = [];

  for (const use of uses) {
    const matcher = toRegex(use.pattern);
    const hits = keys.filter((key) => matcher.test(key));
    for (const key of hits) used.add(key);
    if (hits.length === 0 && !use.pattern.includes("*")) missing.push(use);
  }
  return { orphans: keys.filter((key) => !used.has(key)).sort(), missing };
}
