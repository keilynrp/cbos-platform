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

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) add(node.textContent);

  root.querySelectorAll("[placeholder],[aria-label],[title],[alt]").forEach((element) => {
    for (const attribute of ["placeholder", "aria-label", "title", "alt"]) {
      add(element.getAttribute(attribute));
    }
  });

  return found;
}
