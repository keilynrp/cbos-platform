import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import i18n from "@/i18n";
import { useFormat } from "@/i18n/useFormat";

afterEach(async () => {
  await i18n.changeLanguage("es");
});

describe("useFormat", () => {
  it("formats with the region the product has always used for Spanish", () => {
    const { result } = renderHook(() => useFormat());

    expect(result.current.locale).toBe("es-MX");
    // U+00A0 entre el codigo y la cifra, como lo emite ICU.
    expect(result.current.formatCurrency(1234.5, "USD")).toBe("USD\u00a01,234.50");
  });

  it("re-renders with the new format when the language changes", async () => {
    const { result } = renderHook(() => useFormat());
    expect(result.current.formatNumber(1234567.891)).toBe("1,234,567.891");

    await act(async () => {
      await i18n.changeLanguage("es-ES");
    });

    // Sin la suscripcion al idioma, un componente seguiria con el formato viejo.
    expect(result.current.formatNumber(1234567.891)).toBe("1.234.567,891");
  });

  it("keeps the same functions between renders while the language is unchanged", () => {
    const { result, rerender } = renderHook(() => useFormat());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it("binds every formatter to the active language", () => {
    const { result } = renderHook(() => useFormat());

    expect(result.current.formatDate("2026-09-30", "short")).toBe("30/9/2026");
    expect(result.current.formatPercent(0.16)).toBe("16%");
    expect(result.current.formatDateTime(new Date(2026, 8, 30, 15, 7))).toContain("2026");
  });
});
