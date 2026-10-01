import "@testing-library/jest-dom";
// Inicializa i18next como lo hace main.tsx: sin esto, cualquier codigo que llame
// a `t()` o a translateApiError devolveria la clave cruda.
import "@/i18n";

// jsdom no implementa ResizeObserver y el ResponsiveContainer de recharts lo
// necesita para montarse. Sin tamano real no dibuja el grafico, que es lo que
// se quiere: los tests miran el texto de la pagina, no los ejes.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;

// Tampoco implementa scrollIntoView, que usan los chats al llegar un mensaje.
window.HTMLElement.prototype.scrollIntoView ??= () => {};

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
