import i18n, { type InitOptions } from "i18next";
import { initReactI18next } from "react-i18next";

import { FALLBACK_LOCALE, detectLocale, normalizeLocale } from "./locale";
import { SUPPORTED_LOCALES, UNRELEASED_LOCALES, resources } from "./resources";

/**
 * Clave donde se recuerda la eleccion de idioma en este navegador. Sirve para
 * las pantallas sin usuario (login); con sesion iniciada manda el servidor.
 */
export const LOCALE_STORAGE_KEY = "cbos.locale";

function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    // Modo privado o almacenamiento bloqueado: se sigue sin recordar.
    return null;
  }
}

/**
 * Ajustes de i18next para un conjunto de catalogos.
 *
 * Los idiomas soportados salen de las claves de `catalogues`: enviar un idioma
 * es que su carpeta exista en `locales/`, y con eso entra aqui sin tocar nada
 * mas. Se expone como funcion para que los tests construyan una instancia con
 * un segundo idioma usando exactamente los mismos ajustes que la aplicacion.
 */
export function buildI18nOptions(
  catalogues: typeof resources,
  lng: string,
): InitOptions {
  const languages = Object.keys(catalogues);
  const namespaces = [...new Set(Object.values(catalogues).flatMap((byNs) => Object.keys(byNs)))];

  return {
    resources: catalogues,
    lng,
    fallbackLng: FALLBACK_LOCALE,
    // `es-MX` no es una clave explicita en `resources`, pero se sirve con el
    // catalogo `es`. El tag completo se conserva para el formateo (ADR 0016).
    supportedLngs: languages,
    nonExplicitSupportedLngs: true,
    ns: namespaces,
    defaultNS: "common",
    // Los catalogos van incluidos: sin esto init seria asincrono y el primer
    // render pintaria las claves.
    initAsync: false,
    interpolation: {
      // React ya escapa lo que pinta. Con esto activo, un `'` de un valor
      // interpolado ("'active'") llegaria como `&#39;`.
      escapeValue: false,
    },
    // Un valor que la plantilla pide y el `detail` no trae se pinta vacio; el
    // defecto seria dejar `{{clave}}` a la vista.
    missingInterpolationHandler: () => "",
    returnNull: false,
  };
}

void i18n.use(initReactI18next).init(
  buildI18nOptions(
    resources,
    detectLocale({
      stored: readStoredLocale(),
      navigatorLanguages:
        typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]),
      supported: SUPPORTED_LOCALES,
    }),
  ),
);

i18n.on("languageChanged", (language) => {
  if (typeof document !== "undefined") document.documentElement.lang = language;
});
if (typeof document !== "undefined") document.documentElement.lang = i18n.language;

/**
 * Cambia el idioma de la interfaz y lo recuerda en este navegador.
 * Devuelve el locale realmente aplicado (normalizado); uno sin catalogo cae al
 * de reserva en lugar de dejar la interfaz sin texto.
 */
export async function setLocale(locale: string): Promise<string> {
  const next = normalizeLocale(locale, SUPPORTED_LOCALES) ?? FALLBACK_LOCALE;
  await i18n.changeLanguage(next);
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    // Igual que arriba: no poder recordarlo no debe impedir el cambio.
  }
  return next;
}

export { SUPPORTED_LOCALES, UNRELEASED_LOCALES, resources };
export default i18n;
