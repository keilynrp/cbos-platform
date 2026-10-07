/**
 * jsdom declara `en-US` como idioma del navegador. Mientras `en` estaba incompleto no
 * importaba (la deteccion lo descartaba y caia al espanol); con los 19 espacios
 * traducidos `en` se ofrece, y el `i18n` global arrancaria en ingles: los tests de
 * pagina "in Spanish" leerian ingles. Los tests de ingles construyen su propia
 * instancia (`createInstance`), asi que el global se queda en espanol, que es el
 * idioma de referencia.
 *
 * Va el primero en `setup.ts`: `@/i18n` lee el idioma al importarse.
 */
for (const [key, value] of [
  ["language", "es"],
  ["languages", ["es"]],
] as const) {
  Object.defineProperty(navigator, key, { value, configurable: true });
}
