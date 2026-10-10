import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import type { QuoteEvent } from "@/services/sales";

const text = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;

/**
 * Los datos que el texto de cada tipo de evento necesita, o `null` si el evento no
 * los trae (los eventos anteriores a que el servidor guardara el dato en
 * `event_metadata`): en ese caso se muestra su `description` tal como se guardo.
 */
function paramsFor(event: QuoteEvent): Record<string, string> | null {
  const meta = event.event_metadata ?? {};

  switch (event.event_type) {
    case "created": {
      const number = text(meta.quote_number);
      return number ? { number } : null;
    }
    case "line_added":
    case "line_removed": {
      const description = text(meta.description);
      return description ? { description } : null;
    }
    case "line_updated": {
      // `event_metadata` guarda aqui lo que cambio: campo -> valor.
      const changes = Object.entries(meta).map(([field, value]) => `${field}: ${String(value)}`);
      return changes.length ? { changes: changes.join(", ") } : null;
    }
    case "rejected":
      return "reason" in meta ? { reason: text(meta.reason) ?? "—" } : null;
    case "updated":
    case "sent":
    case "accepted":
      return {};
    default:
      return null;
  }
}

/**
 * El texto de un evento del historial de una cotizacion, en el idioma de la interfaz.
 *
 * El servidor guarda el tipo del evento y sus datos (ADR 0014: el backend responde
 * codigos y la interfaz los traduce). `description` es la reserva para un tipo que el
 * catalogo no conoce o un evento sin datos.
 */
export function useQuoteEventText() {
  const { t, i18n } = useTranslation();
  const translate = t as unknown as (key: string, params: Record<string, string>) => string;

  return useCallback(
    (event: QuoteEvent): string => {
      const params = paramsFor(event);
      const key = `sales:detail.history.events.${event.event_type}`;
      return params && i18n.exists(key) ? translate(key, params) : event.description;
    },
    // `t` cambia de identidad al cambiar el idioma, que es lo que debe re-renderizar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n, t],
  );
}
