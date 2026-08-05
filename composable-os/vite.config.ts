import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Bajo Docker en Windows el codigo llega por bind mount desde NTFS y los
    // eventos inotify no cruzan al contenedor: chokidar nunca ve los cambios
    // y el HMR queda mudo (el WebSocket conecta, pero no llega ningun update).
    // El polling lo resuelve, a costa de CPU, asi que solo se activa cuando
    // docker-compose.override.yml exporta VITE_USE_POLLING=true. El dev
    // nativo en WSL (ext4) usa inotify normal.
    watch:
      process.env.VITE_USE_POLLING === "true"
        ? { usePolling: true, interval: 300 }
        : undefined,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
