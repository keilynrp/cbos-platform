import { renderHook } from "@testing-library/react";
import i18next from "i18next";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";

import { buildI18nOptions } from "@/i18n";
import { useEnumLabel } from "@/i18n/enumLabel";

async function withCatalogues(es: object, en: object = {}) {
  const instance = i18next.createInstance();
  await instance.init(buildI18nOptions({ es: { demo: es }, en: { demo: en } } as never, "es"));
  return instance;
}

const wrapper = (instance: ReturnType<typeof i18next.createInstance>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
  };

/**
 * Los estados llegan del backend como identificadores (`completed`, `draft`) y
 * hasta ahora se pintaban crudos. `useEnumLabel` los traduce cuando el catalogo
 * tiene la clave y, si no, muestra el valor tal cual: un estado nuevo en el
 * backend no debe dejar un hueco ni una clave a la vista.
 */
describe("useEnumLabel", () => {
  it("translates a value the catalogue knows", async () => {
    const instance = await withCatalogues({ status: { completed: "completada" } });
    const { result } = renderHook(() => useEnumLabel(), { wrapper: wrapper(instance) });

    expect(result.current("demo:status", "completed")).toBe("completada");
  });

  it("shows the raw value when the catalogue has no entry for it", async () => {
    const instance = await withCatalogues({ status: { completed: "completada" } });
    const { result } = renderHook(() => useEnumLabel(), { wrapper: wrapper(instance) });

    expect(result.current("demo:status", "brand_new_state")).toBe("brand_new_state");
  });

  it("returns an empty string for a missing value", async () => {
    const instance = await withCatalogues({ status: { completed: "completada" } });
    const { result } = renderHook(() => useEnumLabel(), { wrapper: wrapper(instance) });

    expect(result.current("demo:status", null)).toBe("");
    expect(result.current("demo:status", undefined)).toBe("");
    expect(result.current("demo:status", "")).toBe("");
  });

  it("follows the language", async () => {
    const instance = await withCatalogues({ status: { completed: "completada" } }, { status: { completed: "done" } });
    const { result, rerender } = renderHook(() => useEnumLabel(), { wrapper: wrapper(instance) });
    expect(result.current("demo:status", "completed")).toBe("completada");

    await instance.changeLanguage("en");
    rerender();

    expect(result.current("demo:status", "completed")).toBe("done");
  });

  it("does not treat a value with a dot as a nested path", async () => {
    // `keySeparator` es "." en i18next: un valor con punto buscaria una clave
    // anidada que no existe. Debe caer al valor crudo, no fallar.
    const instance = await withCatalogues({ status: { completed: "completada" } });
    const { result } = renderHook(() => useEnumLabel(), { wrapper: wrapper(instance) });

    expect(result.current("demo:status", "a.b")).toBe("a.b");
  });
});
