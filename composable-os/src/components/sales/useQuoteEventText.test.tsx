import { renderHook } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import type { QuoteEvent } from "@/services/sales";

import { useQuoteEventText } from "./useQuoteEventText";

async function instance(lng: "es" | "en"): Promise<I18n> {
  const created = i18next.createInstance();
  await created.init(buildI18nOptions(resources, lng));
  return created;
}

const event = (
  event_type: string,
  event_metadata: Record<string, unknown> | null,
  description = "stored description",
): QuoteEvent => ({
  id: "e1", quote_id: "q1", user_id: null, event_type, description, event_metadata,
  created_at: "2026-10-09T23:23:00Z",
});

async function textOf(lng: "es" | "en", ev: QuoteEvent): Promise<string> {
  const i18n = await instance(lng);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  );
  const { result } = renderHook(() => useQuoteEventText(), { wrapper });
  return result.current(ev);
}

// (tipo, datos, español, inglés)
const CASES: Array<[string, Record<string, unknown> | null, string, string]> = [
  ["created", { quote_number: "Q-1" }, "Cotización creada: Q-1", "Quote created: Q-1"],
  ["line_added", { description: "Widget" }, "Línea agregada: Widget", "Line added: Widget"],
  ["line_removed", { description: "Widget" }, "Línea eliminada: Widget", "Line removed: Widget"],
  ["line_updated", { quantity: 3, unit_price: 9 }, "Línea modificada — quantity: 3, unit_price: 9", "Line updated — quantity: 3, unit_price: 9"],
  ["updated", null, "Líneas actualizadas (batch)", "Lines updated (batch)"],
  ["sent", null, "Cotización enviada", "Quote sent"],
  ["accepted", null, "Cotización aceptada — orden de venta creada", "Quote accepted — sales order created"],
  ["rejected", { reason: "Muy caro" }, "Cotización rechazada. Razón: Muy caro", "Quote rejected. Reason: Muy caro"],
];

describe("useQuoteEventText", () => {
  it.each(CASES)("%s, en español", async (type, meta, es) => {
    expect(await textOf("es", event(type, meta))).toBe(es);
  });

  it.each(CASES)("%s, en inglés", async (type, meta, _es, en) => {
    expect(await textOf("en", event(type, meta))).toBe(en);
  });

  it("el mismo evento sale en el idioma de la interfaz, no en el que lo escribio el servidor", async () => {
    const ev = event("sent", null, "Cotización enviada");
    expect(await textOf("en", ev)).toBe("Quote sent");
  });

  it("un rechazo sin motivo muestra un guion", async () => {
    expect(await textOf("en", event("rejected", { reason: null }))).toBe("Quote rejected. Reason: —");
    expect(await textOf("es", event("rejected", { reason: null }))).toBe("Cotización rechazada. Razón: —");
  });

  it("un evento anterior, sin los datos que su texto necesita, muestra lo que se guardo", async () => {
    for (const type of ["created", "line_added", "line_removed", "line_updated", "rejected"]) {
      expect(await textOf("en", event(type, null, "Línea agregada: Antiguo"))).toBe("Línea agregada: Antiguo");
    }
  });

  it("un evento antiguo que no necesita datos sí se traduce", async () => {
    expect(await textOf("en", event("sent", null, "Cotización enviada"))).toBe("Quote sent");
  });

  it("un tipo que el catálogo no conoce muestra lo que se guardo", async () => {
    expect(await textOf("en", event("archived", { x: 1 }, "Quote archived"))).toBe("Quote archived");
  });

  it("no inventa datos: un texto vacío en los datos cuenta como ausente", async () => {
    expect(await textOf("en", event("created", { quote_number: "" }, "stored"))).toBe("stored");
  });
});
