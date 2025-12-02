import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import { SessionContextProvider } from "./contexts/SessionContext";
import AuthGuard from "./components/AuthGuard"; // Importar AuthGuard
import AdminDashboard from "./pages/admin/Dashboard"; // Importar AdminDashboard
import LocalDashboard from "./pages/local/Dashboard"; // Importar LocalDashboard
import ClientDashboard from "./pages/client/Dashboard"; // Importar ClientDashboard
import BrandingSettings from "./pages/admin/BrandingSettings"; // Importar BrandingSettings
import NotFound from "./pages/NotFound"; // Importar NotFound

const queryClient = new QueryClient();

const App = () => (
  <React.Fragment>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />

            {/* Rutas protegidas para Admin */}
            <Route element={<AuthGuard allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/branding" element={<BrandingSettings />} />
              {/* Agrega más rutas de admin aquí */}
            </Route>

            {/* Rutas protegidas para Local */}
            <Route element={<AuthGuard allowedRoles={['local']} />}>
              <Route path="/local/dashboard" element={<LocalDashboard />} />
              {/* Agrega más rutas de local aquí */}
            </Route>

            {/* Rutas protegidas para Client */}
            <Route element={<AuthGuard allowedRoles={['client']} />}>
              <Route path="/client" element={<ClientDashboard />} />
              {/* Agrega más rutas de cliente aquí */}
            </Route>

            {/* Ruta para 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </QueryClientProvider>
    <Toaster />
    <Sonner />
  </React.Fragment>
);

export default App;