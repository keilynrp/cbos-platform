import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/lib/auth";

// Pages — only API-backed, production-ready pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Index from "./pages/Index";
import CRM from "./pages/CRM";
import Sales from "./pages/Sales";
import InventoryOrders from "./pages/InventoryOrders";
import PortalBuilder from "./pages/PortalBuilder";
import Workflows from "./pages/Workflows";
import Discovery from "./pages/Discovery";
import Invoicing from "./pages/Invoicing";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import CustomerPortal from "./pages/CustomerPortal";
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
              <Route path="/register" element={<Register />} />
              <Route path="/portal/:token" element={<CustomerPortal />} />

              {/* Protected — all wrapped in AppLayout */}
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<Index />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/inventory" element={<InventoryOrders />} />
                <Route path="/portal-builder" element={<PortalBuilder />} />
                <Route path="/invoicing" element={<Invoicing />} />
                <Route path="/workflows" element={<Workflows />} />
                <Route path="/discovery" element={<Discovery />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
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
