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
import React from "react"; // Necesario para JSX
import { Toaster } from "@/components/ui/toaster"; // Importar Toaster de shadcn/ui
import { Toaster as Sonner } from "@/components/ui/sonner"; // Importar Toaster de sonner

const queryClient = new QueryClient();

const App = () => (
  <React.Fragment>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionContextProvider>
          {/* TooltipProvider y su div envolvente han sido eliminados temporalmente para depuración.
              Si el error desaparece, TooltipProvider es el culpable. */}
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
        </SessionContextProvider>
      </BrowserRouter>
    </QueryClientProvider>
    {/* Los componentes Toaster se renderizan aquí, fuera de la cadena de proveedores principal. */}
    <Toaster />
    <Sonner />
  </React.Fragment>
);

export default App;