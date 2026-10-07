import i18next from "i18next";
import { afterEach, describe, expect, it } from "vitest";

import i18n, {
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  UNRELEASED_LOCALES,
  buildI18nOptions,
  resources,
  setLocale,
} from "@/i18n";

afterEach(async () => {
  await i18n.changeLanguage("es");
  window.localStorage.clear();
});

describe("catalogues", () => {
  it("offers every language that has all the namespaces of Spanish", () => {
    // `en` completo (tarea 12, ultimo dominio) entra solo: no hay un interruptor aparte.
    expect([...SUPPORTED_LOCALES].sort()).toEqual(["en", "es"]);
    expect(UNRELEASED_LOCALES).toEqual([]);
  });

  it("keeps a language without a shipped catalogue out of reach: setLocale ignores it", async () => {
    expect(resources.fr).toBeUndefined();
    expect(await setLocale("fr")).toBe("es");
    expect(i18n.language).toBe("es");
  });

  it("switches to a released language and remembers it", async () => {
    expect(await setLocale("en")).toBe("en");
    expect(i18n.language).toBe("en");
    expect(i18n.t("auth:login.title")).toBe("Sign in");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
  });

  it("resolves a key from the bundled catalogue", () => {
    expect(i18n.t("auth:login.title")).toBe("Iniciar sesión");
  });

  it("serves the base catalogue to a region tag and keeps the full tag", async () => {
    await i18n.changeLanguage("es-MX");

    expect(i18n.t("auth:login.title")).toBe("Iniciar sesión");
    // El tag completo se conserva: el formateo lo usa (ADR 0016, punto 4).
    expect(i18n.language).toBe("es-MX");
  });
});

/**
 * ADR 0015, Verificacion: un `t("clave")` que siempre devuelve espanol se ve
 * identico a uno roto. Hasta que exista un segundo catalogo real (tarea 12), se
 * construye una instancia con los mismos ajustes que la aplicacion y un
 * catalogo `en` de prueba: enviar un idioma es que aparezca su carpeta, y esos
 * ajustes derivan de las claves de los catalogos.
 */
describe("a second language", () => {
  const withEnglish = async (lng: string) => {
    const instance = i18next.createInstance();
    await instance.init(
      buildI18nOptions({ ...resources, en: { auth: { login: { title: "Sign in" } } } }, lng),
    );
    return instance;
  };

  it("renders in the second language, not only the development one", async () => {
    const instance = await withEnglish("en");

    expect(instance.t("auth:login.title")).toBe("Sign in");
  });

  it("falls back to Spanish for a key the second language lacks", async () => {
    const instance = await withEnglish("en");

    // Traducida a medias: lo no traducido sale en espanol y no como la clave.
    expect(instance.t("auth:login.description")).toBe("Ingresa tus credenciales para continuar");
  });

  it("switches at runtime", async () => {
    const instance = await withEnglish("es");
    expect(instance.t("auth:login.title")).toBe("Iniciar sesión");

    await instance.changeLanguage("en");
    expect(instance.t("auth:login.title")).toBe("Sign in");
  });

  it("does not activate a language that has no shipped catalogue", async () => {
    // Pedir un idioma sin carpeta en `locales/` (`fr`) no debe dejar la interfaz en
    // un idioma sin texto: se queda en el de reserva.
    const instance = i18next.createInstance();
    await instance.init(buildI18nOptions(resources, "es"));
    await instance.changeLanguage("fr");

    expect(instance.t("auth:login.title")).toBe("Iniciar sesión");
  });
});

describe("setLocale", () => {
  it("applies and remembers the language", async () => {
    const applied = await setLocale("es-mx");

    expect(applied).toBe("es-MX");
    expect(i18n.language).toBe("es-MX");
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("es-MX");
  });

  it("falls back to the default for a language with no catalogue", async () => {
    // Sin esto, un valor guardado de un idioma retirado dejaria la interfaz
    // sin texto.
    expect(await setLocale("fr")).toBe("es");
    expect(i18n.language).toBe("es");
  });

  it("keeps <html lang> in step with the active language", async () => {
    await setLocale("es-MX");

    expect(document.documentElement.lang).toBe("es-MX");
  });
});

describe("plurals", () => {
  it("resolves plural forms from the language's CLDR rules", async () => {
    // Los cuatro bugs de plural del ADR 0015 ("1 facturas pagadas") desaparecen
    // con este mecanismo, no con un parche por sitio.
    const instance = i18next.createInstance();
    await instance.init(
      buildI18nOptions(
        { es: { common: { paid_one: "{{count}} factura pagada", paid_other: "{{count}} facturas pagadas" } } },
        "es",
      ),
    );
    const t = instance.t as unknown as (key: string, options: object) => string;

    expect(t("paid", { count: 1 })).toBe("1 factura pagada");
    expect(t("paid", { count: 2 })).toBe("2 facturas pagadas");
    expect(t("paid", { count: 0 })).toBe("0 facturas pagadas");
  });
});
