import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * Traduce un valor que llega del backend como identificador: un estado
 * (`completed`, `draft`), un tipo (`event`), una etapa.
 *
 *     const label = useEnumLabel();
 *     label("workflows:runStatus", run.status)   // "completada"
 *
 * `prefix` es la ruta cualificada del grupo en el catalogo. Si el catalogo no
 * tiene entrada para el valor, devuelve el valor tal cual: un estado nuevo en el
 * backend no debe dejar un hueco ni una clave a la vista. Las claves de un grupo
 * de enums no se verifican en compilacion porque el valor llega en runtime.
 */
export function useEnumLabel() {
  const { t, i18n } = useTranslation();
  const translate = t as unknown as (key: string) => string;

  return useCallback(
    (prefix: string, value: string | null | undefined): string => {
      if (!value) return "";
      // Un punto en el valor se leeria como una ruta anidada.
      if (value.includes(".")) return value;

      const key = `${prefix}.${value}`;
      return i18n.exists(key) ? translate(key) : value;
    },
    // `t` cambia de identidad al cambiar el idioma, que es lo que debe re-renderizar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n, t],
  );
}
