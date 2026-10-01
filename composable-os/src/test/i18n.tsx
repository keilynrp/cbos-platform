import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";

import { buildI18nOptions, resources } from "@/i18n";

type Tree = { [key: string]: string | Tree };

/**
 * Pseudo-localiza un catalogo: cada cadena pasa a `EN(<original>)`.
 *
 * Es la prueba de que una pagina esta *completamente* migrada: tras renderizarla
 * con este catalogo, todo texto visible debe llevar el prefijo. Uno que no lo
 * lleve es una cadena cableada que se escapo del catalogo, y ninguna traduccion
 * real la va a cambiar (ADR 0015: "el parcial es peor que nada").
 */
export function pseudoLocalize(tree: Tree, prefix = "EN"): Tree {
  return Object.fromEntries(
    Object.entries(tree).map(([key, value]) => [
      key,
      typeof value === "string" ? `${prefix}(${value})` : pseudoLocalize(value, prefix),
    ]),
  );
}

/** Instancia con los ajustes de la app, el catalogo real `es` y un `en` pseudo-localizado. */
export async function createPseudoInstance(lng: "es" | "en"): Promise<I18n> {
  const pseudo = Object.fromEntries(
    Object.entries(resources.es).map(([namespace, catalogue]) => [
      namespace,
      pseudoLocalize(catalogue as Tree),
    ]),
  );

  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions({ ...resources, en: pseudo }, lng));
  return instance;
}

/** Renderiza dentro de un router y de una instancia de i18n concreta. */
export function renderWithI18n(ui: ReactElement, instance: I18n) {
  return render(
    <I18nextProvider i18n={instance}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>,
  );
}

/**
 * Como `renderWithI18n`, y ademas con un `QueryClient` sin reintentos: las
 * paginas que piden datos con React Query (los servicios se mockean en el test).
 */
export function renderPageWithI18n(ui: ReactElement, instance: I18n) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
  });

  return render(
    <I18nextProvider i18n={instance}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

/**
 * Lo que una pagina pinta sin que venga del catalogo de la app: texto que llega
 * del backend (nombres, descripciones) y fechas o numeros ya formateados. La
 * comprobacion "no queda nada cableado" los descarta para no dar falsos
 * positivos; lo que cuenta es el texto *de la interfaz*.
 *
 * - `data`: valores del backend que el test sembro (se descartan si el texto los contiene).
 * - se descarta tambien todo texto con un ano de cuatro cifras (una fecha formateada)
 *   y los numeros con unidad abreviada (`12ms`, `1,234.5ms`), que los produce `Intl`.
 */
export function notFromCatalogue(
  texts: string[],
  data: string[] = [],
  ignore: RegExp[] = [],
  prefix = "EN(",
): string[] {
  return texts.filter(
    (text) =>
      !text.startsWith(prefix) &&
      !data.some((value) => text.includes(value)) &&
      !/\d{4}/.test(text) &&
      !/^\d[\d.,]*\s?[a-zA-Zµ]{0,3}$/.test(text) &&
      !ignore.some((pattern) => pattern.test(text)),
  );
}

/** Importes ya formateados por `Intl` (`USD 12.5 k`, `$12.5K`): no son texto del catalogo. */
export const FORMATTED_CURRENCY = /^[A-Z$€£]{1,3}\s?[\d.,\s]+\s?[kKM]?$/;

/** Tiempo relativo ya formateado por `Intl` (`hace 5 min`, `5m ago`, `yesterday`). */
export const FORMATTED_RELATIVE = /^(hace\s|ahora$|ayer$|anteayer$|now$|yesterday$)|\bago$/;

/**
 * Textos visibles de un arbol: los nodos de texto y los atributos que el
 * usuario lee (`placeholder`, `aria-label`, `title`, `alt`).
 *
 * Se descartan las cadenas sin una sola letra ("••••••••", "/", "—"): no
 * pertenecen a ningun idioma y no hay nada que traducir.
 */
export function visibleStrings(root: HTMLElement): string[] {
  const found: string[] = [];
  const add = (value: string | null | undefined) => {
    const text = value?.trim();
    if (text && /\p{L}/u.test(text)) found.push(text);
  };

  // `<style>` y `<script>` guardan codigo, no texto visible (el ScrollArea de Radix
  // inyecta un `<style>`).
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      ["STYLE", "SCRIPT", "NOSCRIPT"].includes((node.parentElement?.tagName ?? "").toUpperCase())
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) add(node.textContent);

  root.querySelectorAll("[placeholder],[aria-label],[title],[alt]").forEach((element) => {
    for (const attribute of ["placeholder", "aria-label", "title", "alt"]) {
      add(element.getAttribute(attribute));
    }
  });

  return found;
}
