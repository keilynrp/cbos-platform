import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/lib/auth";

// Pages
import Login from "./pages/Login";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import CRM from "./pages/CRM";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import Documents from "./pages/Documents";
import Analytics from "./pages/Analytics";
import AIAgents from "./pages/AIAgents";
import Marketplace from "./pages/Marketplace";
import Settings from "./pages/Settings";
import PortalBuilder from "./pages/PortalBuilder";
import AccountManagement from "./pages/AccountManagement";
import ShopBuilder from "./pages/ShopBuilder";
import RevPathIntelligence from "./pages/RevPathIntelligence";
import ChatbotBuilder from "./pages/ChatbotBuilder";
import PersonaBuilder from "./pages/PersonaBuilder";
import Prospecting from "./pages/Prospecting";
import LeadMagnetBuilder from "./pages/LeadMagnetBuilder";
import EventBuilder from "./pages/EventBuilder";
import ExperienceMapper from "./pages/ExperienceMapper";
import AppointmentBuilder from "./pages/AppointmentBuilder";
import MCPIntegrationHub from "./pages/MCPIntegrationHub";
import POSBuilder from "./pages/POSBuilder";
import InventoryOrders from "./pages/InventoryOrders";
import WarehouseBuilder from "./pages/WarehouseBuilder";
import IoTBuilder from "./pages/IoTBuilder";
import SynapticModeler from "./pages/SynapticModeler";
import ContractStudio from "./pages/ContractStudio";
import SalesBuilder from "./pages/SalesBuilder";
import PlatformMap from "./pages/PlatformMap";
import TeamStructure from "./pages/TeamStructure";
import IntelligenceGraphOS from "./pages/IntelligenceGraphOS";
import Workflows from "./pages/Workflows";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000, // 30s
    },
  },
});

// ── Protected Route ────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null; // brief flash while restoring session
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ── App ────────────────────────────────────────────────────────────────────
const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected — all wrapped in AppLayout */}
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<Index />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/knowledge" element={<KnowledgeGraph />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/ai-agents" element={<AIAgents />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/portal-builder" element={<PortalBuilder />} />
                <Route path="/accounts" element={<AccountManagement />} />
                <Route path="/shop-builder" element={<ShopBuilder />} />
                <Route path="/revpath" element={<RevPathIntelligence />} />
                <Route path="/chatbot-builder" element={<ChatbotBuilder />} />
                <Route path="/persona-builder" element={<PersonaBuilder />} />
                <Route path="/prospecting" element={<Prospecting />} />
                <Route path="/lead-magnets" element={<LeadMagnetBuilder />} />
                <Route path="/events" element={<EventBuilder />} />
                <Route path="/experience-mapper" element={<ExperienceMapper />} />
                <Route path="/appointments" element={<AppointmentBuilder />} />
                <Route path="/mcp-hub" element={<MCPIntegrationHub />} />
                <Route path="/pos-builder" element={<POSBuilder />} />
                <Route path="/inventory-orders" element={<InventoryOrders />} />
                <Route path="/warehouse" element={<WarehouseBuilder />} />
                <Route path="/iot-builder" element={<IoTBuilder />} />
                <Route path="/system-modeler" element={<SynapticModeler />} />
                <Route path="/contract-studio" element={<ContractStudio />} />
                <Route path="/sales-builder" element={<SalesBuilder />} />
                <Route path="/platform-map" element={<PlatformMap />} />
                <Route path="/team-structure" element={<TeamStructure />} />
                <Route path="/intelligence-graph" element={<IntelligenceGraphOS />} />
                <Route path="/workflows" element={<Workflows />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
