import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * La funcion `t` para componentes. Usala en lugar de `useTranslation().t`.
 *
 *     const t = useT();
 *     t("workflows:card.runs", { count: n })
 *
 * El proyecto compila con `strict: false`, y con `strictNullChecks` apagado el
 * tipo de `useTranslation().t` colapsa el namespace del hook a `common`: una
 * llamada con opciones (interpolacion, `count`) deja de compilar aunque la clave
 * exista. `i18n.t` no tiene ese problema y valida la clave contra el catalogo.
 *
 * `useTranslation` sigue llamandose: es lo que suscribe al componente al cambio
 * de idioma. La funcion devuelta es estable mientras el idioma no cambie.
 */
export function useT() {
  const { i18n } = useTranslation();
  const language = i18n.language;

  // `language` no se lee dentro: es lo que invalida la funcion al cambiar el
  // idioma, para que los efectos y memos que dependen de `t` se recalculen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => i18n.t.bind(i18n), [i18n, language]);
}
