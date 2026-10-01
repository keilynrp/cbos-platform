import { createRoot } from "react-dom/client";
// Antes que App: el primer render ya necesita los catalogos cargados.
import "./i18n";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
