import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import {
  compareCatalogues,
  findUntranslated,
  crossCheck,
  findKeyUses,
  leaves,
  placeholders,
  type Catalogues,
} from "./catalogueChecks";
import { releasedLocales, resources } from "./resources";

/**
 * Paridad entre idiomas y cadenas huerfanas (plan de i18n, "Verificacion").
 *
 * Con un solo idioma el check de paridad pasa trivialmente, que es justo la
 * trampa que hay que evitar: por eso cada control se prueba primero contra
 * catalogos inventados que *deben* fallar, y solo despues se aplica a los reales.
 */

const BASE = "es";

/**
 * Los espacios de nombres que cada idioma ya tiene traducidos. Lo demas es
 * pendiente. Cada PR que traduce un dominio lo anade aqui en el mismo cambio: el
 * check falla si el espacio existe y no esta listado (se anadio sin registrarlo) y
 * si esta listado y no existe. Cuando la lista iguala a la del idioma base, el
 * idioma se ofrece solo (`releasedLocales`): no hay un interruptor aparte.
 */
const TRANSLATED: Record<string, string[]> = {
  en: ["common", "errors", "auth", "layout", "dashboard", "analytics", "companyProfile", "customerPortal", "contracts", "crm", "discovery", "hr", "inventory", "invoicing"],
};

/**
 * Claves cuyo valor es igual en el idioma base y en el otro porque la palabra es
 * la misma (`Error`). Explicita a proposito: una traduccion que se quedo en espanol
 * es identica al base, y lo unico que la distingue de una legitima es que alguien
 * la apruebe aqui.
 */
const IDENTICAL_TO_BASE = [
  "common:error.title", "auth:login.tagline", "auth:login.emailLabel", "auth:register.emailLabel",
  "layout:brand.tagline", "layout:nav.items.dashboard", "layout:nav.items.crm",
  "layout:nav.items.workflows", "layout:nav.items.discovery", "layout:nav.items.portal",
  "dashboard:title", "dashboard:activity.crm",
  "crm:title", "crm:tabs.pipeline", "crm:tabs.leads", "crm:leadSource.web", "crm:entityType.lead",
  "crm:leadDialog.email",
  "discovery:title", "discovery:welcome.title", "discovery:blueprint.title", "discovery:packageName.starter",
  "discovery:packageName.growth", "discovery:packageName.operations_plus",
  "hr:createEmployee.email",
  "inventory:tabs.revpath", "inventory:inventory.sku", "inventory:revpath.lead",
  "invoicing:list.total", "invoicing:detail.total", "invoicing:detail.subtotal", "invoicing:detail.grandTotal",
  "invoicing:newDialog.subtotal", "invoicing:newDialog.total",
  "analytics:tabs.pipeline","companyProfile:identity.logoAlt", "companyProfile:contact.email",
  "customerPortal:quote.subtotal", "customerPortal:quote.total",
];

const pendingFor = (catalogues: Catalogues): Record<string, string[]> =>
  Object.fromEntries(
    Object.keys(catalogues)
      .filter((language) => language !== BASE)
      .map((language) => [
        language,
        Object.keys(catalogues[BASE]).filter((ns) => !(TRANSLATED[language] ?? []).includes(ns)),
      ]),
  );

/**
 * Espacios cuyas claves no aparecen como literal en el codigo porque las pone el
 * servidor: `errors` se indexa por el `code` que llega en la respuesta
 * (`translateApiError`). Que cada codigo registrado tenga traduccion lo verifica
 * `scripts/ci/check_error_registry.py`; aqui se excluyen del barrido de huerfanas
 * y de ningun otro.
 */
const KEYED_BY_THE_WIRE = ["errors"];

// ------------------------------------------------------------ controles

const base = (extra: Record<string, unknown> = {}): Catalogues => ({
  es: {
    common: { save: "Guardar", card: { runs_one: "{{count}} ejecucion", runs_other: "{{count}} ejecuciones" }, ...extra },
    sales: { title: "Ventas", hello: "Hola {{name}}" },
  },
});

describe("compareCatalogues (los controles pueden fallar)", () => {
  it("un idioma identico en estructura no tiene problemas", () => {
    const c = base();
    c.en = {
      common: { save: "Save", card: { runs_one: "{{count}} run", runs_other: "{{count}} runs" } },
      sales: { title: "Sales", hello: "Hi {{name}}" },
    };
    expect(compareCatalogues(c, { base: BASE })).toEqual([]);
  });

  it("detecta una clave que falta", () => {
    const c = base();
    c.en = { common: { save: "Save", card: { runs_one: "x {{count}}" } }, sales: { title: "Sales", hello: "Hi {{name}}" } };
    expect(compareCatalogues(c, { base: BASE })).toEqual(["en: falta common:card.runs_other"]);
  });

  it("detecta una clave que sobra", () => {
    const c = base();
    c.en = {
      common: { save: "Save", card: { runs_one: "{{count}}", runs_other: "{{count}}" }, extra: "x" },
      sales: { title: "Sales", hello: "Hi {{name}}" },
    };
    expect(compareCatalogues(c, { base: BASE })).toEqual(["en: sobra common:extra, es no la tiene"]);
  });

  it("detecta un marcador que cambia o se pierde", () => {
    const c = base();
    c.en = {
      common: { save: "Save", card: { runs_one: "{{count}}", runs_other: "{{count}}" } },
      sales: { title: "Sales", hello: "Hi {{nombre}}" },
    };
    expect(compareCatalogues(c, { base: BASE })).toEqual(["en: sales:hello usa {{nombre}} y es usa {{name}}"]);
    c.en.sales.hello = "Hi";
    expect(compareCatalogues(c, { base: BASE })).toHaveLength(1);
  });

  it("detecta un espacio entero que falta o sobra", () => {
    const c = base();
    c.en = { common: { save: "Save", card: { runs_one: "{{count}}", runs_other: "{{count}}" } }, extra: { a: "a" } };
    expect(compareCatalogues(c, { base: BASE })).toEqual([
      'en: falta el espacio "sales"',
      'en: el espacio "extra" no existe en es',
    ]);
  });

  it("un espacio pendiente se tolera, pero la lista no puede quedarse vieja", () => {
    const c = base();
    c.en = { common: { save: "Save", card: { runs_one: "{{count}}", runs_other: "{{count}}" } } };
    expect(compareCatalogues(c, { base: BASE, pending: { en: ["sales"] } })).toEqual([]);

    c.en.sales = { title: "Sales", hello: "Hi {{name}}" };
    expect(compareCatalogues(c, { base: BASE, pending: { en: ["sales"] } })).toEqual([
      'en: "sales" ya existe, quitalo de la lista de pendientes',
    ]);
    expect(compareCatalogues(c, { base: BASE, pending: { en: ["nope"] } })).toEqual([
      'en: "nope" esta como pendiente pero es no tiene ese espacio',
    ]);
  });

  it("sin idioma base lo dice en lugar de pasar", () => {
    expect(compareCatalogues({ en: {} }, { base: "es" })).toHaveLength(1);
  });
});

describe("findUntranslated (los controles pueden fallar)", () => {
  const catalogues = (en: Record<string, unknown>): Catalogues => ({
    es: { common: { save: "Guardar", error: "Error", hello: "Hola {{name}}", count: "{{n}}" } },
    en: { common: en },
  });
  const run = (en: Record<string, unknown>, allow: string[] = []) =>
    findUntranslated(catalogues(en), { base: "es", allow });

  it("una traduccion de verdad no tiene problemas", () => {
    expect(run({ save: "Save", error: "Error", hello: "Hi {{name}}", count: "{{n}}" }, ["common:error"])).toEqual([]);
  });

  it("detecta una cadena copiada del espanol", () => {
    expect(run({ save: "Guardar", error: "Error", hello: "Hi {{name}}", count: "{{n}}" }, ["common:error"])).toEqual([
      `en: common:save es igual que en es ("Guardar")`,
    ]);
  });

  it("una palabra identica solo vale si alguien la aprobo", () => {
    expect(run({ save: "Save", error: "Error", hello: "Hi {{name}}", count: "{{n}}" })).toEqual([
      `en: common:error es igual que en es ("Error")`,
    ]);
  });

  it("lo que no tiene palabras (un numero, un marcador) no cuenta como copia", () => {
    expect(run({ save: "Save", error: "Failure", hello: "Hi {{name}}", count: "{{n}}" })).toEqual([]);
  });

  it("la lista de permitidas no puede quedarse vieja", () => {
    expect(run({ save: "Save", error: "Failure", hello: "Hi {{name}}", count: "{{n}}" }, ["common:error"])).toEqual([
      "en: common:error esta permitida como igual pero ya difiere; quitala de la lista",
    ]);
  });

  it("no compara los espacios pendientes", () => {
    const c = catalogues({ save: "Guardar" });
    expect(findUntranslated(c, { base: "es", pending: { en: ["common"] } })).toEqual([]);
  });
});

describe("releasedLocales (los controles pueden fallar)", () => {
  const es = { common: { a: "a" }, sales: { b: "b" } };

  it("un idioma al que le falta un espacio no se ofrece", () => {
    expect(releasedLocales({ es, en: { common: { a: "a" } } })).toEqual(["es"]);
  });

  it("se ofrece en cuanto tiene el ultimo", () => {
    expect(releasedLocales({ es, en: { common: { a: "a" }, sales: { b: "b" } } })).toEqual(["es", "en"]);
  });

  it("el base siempre se ofrece", () => {
    expect(releasedLocales({ es })).toEqual(["es"]);
  });
});

describe("leaves y placeholders", () => {
  it("aplana el arbol y no cuenta los grupos", () => {
    expect([...leaves({ a: { b: "x", c: { d: "y" } }, e: "z" }).keys()]).toEqual(["a.b", "a.c.d", "e"]);
  });

  it("lee los marcadores con y sin formato", () => {
    expect(placeholders("{{b}} y {{a}} y {{ a }} y {{n, number}}")).toEqual(["a", "b", "n"]);
  });
});

describe("crossCheck (los controles pueden fallar)", () => {
  const catalogue = {
    ui: { save: "Guardar", runStatus: { done: "Hecho", failed: "Fallo" }, card: { runs_one: "uno", runs_other: "otros" }, unused: "x" },
  };
  const run = (source: string) => crossCheck(catalogue, findKeyUses(source, "f.tsx", ["ui"]));

  it("una clave exacta, un plural y un grupo cuentan como usados", () => {
    const report = run('t("ui:save"); t("ui:card.runs", {count}); label("ui:runStatus", s);');
    expect(report.orphans).toEqual(["ui:unused"]);
    expect(report.missing).toEqual([]);
  });

  it("una clave interpolada usa todo lo que casa", () => {
    const report = run("t(`ui:runStatus.${s}`); t(\"ui:save\"); t(\"ui:card.runs\"); t(\"ui:unused\");");
    expect(report.orphans).toEqual([]);
  });

  it("una clave que el codigo pide y no existe se reporta con su linea", () => {
    const report = run('\nt("ui:svae");');
    expect(report.missing).toMatchObject([{ pattern: "ui:svae", line: 2 }]);
  });

  it("sin ningun uso, todo el catalogo es huerfano", () => {
    expect(run("const x = 1;").orphans).toHaveLength(5);
  });

  it("un literal que parece clave pero no es de un espacio conocido se ignora", () => {
    expect(run('fetch("http://x"); a("other:save");').missing).toEqual([]);
  });
});

// ------------------------------------------------------------- reales

// Vitest corre con la raiz del proyecto como directorio de trabajo.
const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const rel = relative(SRC, path).replace(/\\/g, "/");
    if (statSync(path).isDirectory()) {
      if (rel === "locales" || rel === "test") continue;
      out.push(...sourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|d)\.tsx?$/.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

describe("los catalogos que se envian", () => {
  it("el idioma base existe", () => {
    expect(Object.keys(resources)).toContain(BASE);
  });

  it("todos los idiomas estan en paridad con el base", () => {
    expect(compareCatalogues(resources as Catalogues, { base: BASE, pending: pendingFor(resources as Catalogues) })).toEqual([]);
  });

  it("ninguna cadena traducida es una copia del idioma base", () => {
    const catalogues = resources as Catalogues;
    expect(
      findUntranslated(catalogues, { base: BASE, pending: pendingFor(catalogues), allow: IDENTICAL_TO_BASE }),
    ).toEqual([]);
  });

  it("un idioma se ofrece cuando esta completo, y no antes", () => {
    const catalogues = resources as Catalogues;
    const complete = Object.keys(catalogues).filter((language) => (pendingFor(catalogues)[language] ?? []).length === 0);
    expect(releasedLocales(catalogues).sort()).toEqual(complete.sort());
  });

  it("ninguna clave del catalogo esta huerfana ni el codigo pide una que no existe", () => {
    const namespaces = Object.keys(resources[BASE]);
    const uses = sourceFiles(SRC).flatMap((file) =>
      findKeyUses(readFileSync(file, "utf8"), relative(SRC, file).replace(/\\/g, "/"), namespaces),
    );
    expect(uses.length).toBeGreaterThan(100); // el escaner encuentra algo: no pasa sin mirar

    const report = crossCheck(resources[BASE] as Record<string, Record<string, unknown>>, uses);
    expect(report.missing.map((u) => `${u.file}:${u.line} ${u.pattern}`)).toEqual([]);
    expect(report.orphans.filter((key) => !KEYED_BY_THE_WIRE.some((ns) => key.startsWith(`${ns}:`)))).toEqual([]);
  });
});
