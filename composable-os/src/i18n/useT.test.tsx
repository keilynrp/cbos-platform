import { act, renderHook } from "@testing-library/react";
import i18next from "i18next";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";

import { buildI18nOptions, resources } from "@/i18n";
import { useT } from "@/i18n/useT";

async function instance(lng = "es") {
  const i18n = i18next.createInstance();
  await i18n.init(
    buildI18nOptions(
      {
        ...resources,
        en: { auth: { login: { title: "Sign in" } }, workflows: { card: { toggle: "Toggle {{name}}" } } },
      } as never,
      lng,
    ),
  );
  return i18n;
}

const wrapper = (i18n: Awaited<ReturnType<typeof instance>>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
  };

/**
 * `useTranslation().t` no tipa las llamadas con opciones cuando el proyecto
 * compila con `strict: false` (el namespace del hook colapsa a `common`).
 * `useT` devuelve `i18n.t`, que si tipa, y sigue suscrito al idioma.
 */
describe("useT", () => {
  it("resolves qualified keys", async () => {
    const i18n = await instance();
    const { result } = renderHook(() => useT(), { wrapper: wrapper(i18n) });

    expect(result.current("auth:login.title")).toBe("Iniciar sesión");
  });

  it("interpolates values and resolves plurals", async () => {
    const i18n = await instance();
    const { result } = renderHook(() => useT(), { wrapper: wrapper(i18n) });

    expect(result.current("workflows:card.toggle", { name: "Alta de leads" })).toBe("Activar o desactivar Alta de leads");
    expect(result.current("workflows:card.runs", { count: 1 })).toBe("1 ejecución");
    expect(result.current("workflows:card.runs", { count: 3 })).toBe("3 ejecuciones");
  });

  it("re-renders the component when the language changes", async () => {
    const i18n = await instance();
    const { result } = renderHook(() => useT(), { wrapper: wrapper(i18n) });
    expect(result.current("auth:login.title")).toBe("Iniciar sesión");

    await act(async () => {
      await i18n.changeLanguage("en");
    });

    // Sin la suscripcion, el componente seguiria pintando el idioma anterior.
    expect(result.current("auth:login.title")).toBe("Sign in");
  });

  it("returns the same function between renders while the language is unchanged", async () => {
    const i18n = await instance();
    const { result, rerender } = renderHook(() => useT(), { wrapper: wrapper(i18n) });
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});
