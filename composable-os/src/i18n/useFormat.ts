import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  type DateStyle,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMilliseconds,
  formatMonthShort,
  formatMonthYear,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatUnit,
  formattingLocale,
} from "./format";

/**
 * Los formateadores de `format.ts` ligados al idioma activo.
 *
 * Se suscribe al idioma (`useTranslation`), asi que el componente se re-renderiza
 * al cambiarlo: un helper de modulo que leyera `i18n.language` no se enteraria y
 * la pagina seguiria con el formato anterior hasta su proximo render.
 *
 * Las funciones devueltas son estables mientras el idioma no cambie.
 */
export function useFormat() {
  const { i18n } = useTranslation();
  const language = i18n.language;

  return useMemo(
    () => ({
      /** El tag con el que se formatea (con region), p. ej. `es-MX`. */
      locale: formattingLocale(language),
      formatCurrency: (
        value: number | null | undefined,
        currency?: string | null,
        options?: Intl.NumberFormatOptions,
      ) => formatCurrency(value, currency, language, options),
      formatNumber: (value: number | null | undefined, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, language, options),
      formatPercent: (value: number | null | undefined, options?: Intl.NumberFormatOptions) =>
        formatPercent(value, language, options),
      formatDate: (value: Parameters<typeof formatDate>[0], style?: DateStyle) =>
        formatDate(value, language, style),
      formatDateTime: (value: Parameters<typeof formatDateTime>[0]) =>
        formatDateTime(value, language),
      formatMilliseconds: (value: number | null | undefined) => formatMilliseconds(value, language),
      formatCompactCurrency: (value: number | null | undefined, currency?: string | null) =>
        formatCompactCurrency(value, currency, language),
      formatMonthShort: (yearMonth: string | null | undefined) => formatMonthShort(yearMonth, language),
      formatMonthYear: (yearMonth: string | null | undefined) => formatMonthYear(yearMonth, language),
      formatUnit: (value: number | null | undefined, unit: string) => formatUnit(value, unit, language),
      formatRelativeTime: (value: Parameters<typeof formatRelativeTime>[0]) =>
        formatRelativeTime(value, language),
    }),
    [language],
  );
}
