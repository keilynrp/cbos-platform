import "@testing-library/jest-dom";
// Inicializa i18next como lo hace main.tsx: sin esto, cualquier codigo que llame
// a `t()` o a translateApiError devolveria la clave cruda.
import "@/i18n";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
