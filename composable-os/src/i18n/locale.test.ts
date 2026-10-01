import { describe, it, expect } from "vitest";

import { catalogueFor, detectLocale, normalizeLocale } from "@/i18n/locale";

const TWO = ["es", "en"];

/**
 * Espejo de `backend/app/core/i18n`: el frontend valida y normaliza con las
 * mismas reglas que el backend (ADR 0016), porque un locale que el PATCH del
 * backend rechazaria no debe llegar a intentarse.
 */
describe("normalizeLocale", () => {
  it.each([
    ["es", "es"],
    ["ES", "es"],
    [" es ", "es"],
    ["es-MX", "es-MX"],
    ["es-mx", "es-MX"],
    ["es_MX", "es-MX"],
    // Region numerica UN M.49 (tres cifras): `es-419`, espanol de Latinoamerica.
    ["es-419", "es-419"],
    ["ES_419", "es-419"],
  ])("canonicalises %j to %j", (raw, expected) => {
    expect(normalizeLocale(raw, TWO)).toBe(expected);
  });

  it.each([
    null, undefined, "", "   ", "fr", "xx", "spanish", "es-MX-extra", "es-", "-MX", "e", "es-M",
    // Una region numerica son exactamente tres cifras.
    "es-41", "es-4190", "es-4a9", "es-41M",
  ])(
    "rejects %j",
    (raw) => {
      expect(normalizeLocale(raw as string | null | undefined, TWO)).toBeNull();
    },
  );

  it("checks the base language against the supported set", () => {
    expect(normalizeLocale("en-US", ["es"])).toBeNull();
    expect(normalizeLocale("en-US", TWO)).toBe("en-US");
  });
});

describe("catalogueFor", () => {
  it("falls back from region to base language", () => {
    expect(catalogueFor("es-MX", TWO)).toBe("es");
  });

  it("uses the default for a language with no catalogue", () => {
    expect(catalogueFor("fr-FR", TWO)).toBe("es");
  });
});

describe("detectLocale", () => {
  it("prefers what the user stored over the browser", () => {
    expect(detectLocale({ stored: "en", navigatorLanguages: ["es-MX"], supported: TWO })).toBe("en");
  });

  it("ignores a stored value that has no catalogue any more", () => {
    // Retirar un idioma no puede dejar a nadie con una pantalla sin texto.
    expect(detectLocale({ stored: "fr", navigatorLanguages: ["en-US"], supported: TWO })).toBe("en-US");
  });

  it("takes the first browser language that has a catalogue", () => {
    expect(detectLocale({ stored: null, navigatorLanguages: ["fr-FR", "en-GB", "es"], supported: TWO })).toBe("en-GB");
  });

  it("keeps a numeric region, which the backend accepts too", () => {
    expect(detectLocale({ stored: null, navigatorLanguages: ["es-419"], supported: TWO })).toBe("es-419");
  });

  it("reduces a tag it cannot read whole to the base language", () => {
    // Escritura + region (`es-Latn-419`) no se admite hoy, pero el idioma si esta.
    expect(detectLocale({ stored: null, navigatorLanguages: ["es-Latn-419"], supported: TWO })).toBe("es");
  });

  it("falls back to the deployment default when nothing matches", () => {
    expect(detectLocale({ stored: null, navigatorLanguages: ["fr-FR", "de"], supported: TWO })).toBe("es");
    expect(detectLocale({ stored: null, navigatorLanguages: [], supported: TWO })).toBe("es");
  });
});
