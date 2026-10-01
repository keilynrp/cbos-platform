import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Las pruebas de pagina completa (React Query, dialogos de Radix, graficos)
    // tardan 2-3 s en una maquina holgada y bastante mas en el runner de CI: el
    // limite por defecto de 5 s las hacia intermitentes.
    testTimeout: 15_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
