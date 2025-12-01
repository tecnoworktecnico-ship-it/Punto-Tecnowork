import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { SessionContextProvider } from "./contexts/SessionContext";
import AuthGuard from "./components/AuthGuard";
import ClientDashboard from "./pages/client/Dashboard";
import LocalDashboard from "./pages/local/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import BrandingSettings from "./pages/admin/BrandingSettings";
import React from "react"; // Necesario para React.Fragment
import { Toaster } from "@/components/ui/toaster"; // Importar Toaster
import { Toaster as Sonner } from "@/components/ui/sonner"; // Importar Sonner

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <SessionContextProvider>
        <TooltipProvider>
          {/* Envolvemos los componentes globales y las rutas en un Fragment */}
          <React.Fragment>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />

              {/* Protected Client Routes */}
              <Route element={<AuthGuard allowedRoles={['client']} />}>
                <Route path="/client" element={<ClientDashboard />} />
                {/* Add other client routes here */}
              </Route>

              {/* Protected Local Routes */}
              <Route element={<AuthGuard allowedRoles={['local']} />}>
                <Route path="/local/dashboard" element={<LocalDashboard />} />
                {/* Add other local routes here */}
              </Route>

              {/* Protected Admin Routes */}
              <Route element={<AuthGuard allowedRoles={['admin']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/branding" element={<BrandingSettings />} />
                {/* Add other admin routes here */}
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </React.Fragment>
        </TooltipProvider>
      </SessionContextProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;