import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import { SessionContextProvider } from "./contexts/SessionContext";
import AuthGuard from "./components/AuthGuard";
import AdminDashboard from "./pages/admin/Dashboard";
import LocalDashboard from "./pages/local/Dashboard";
import ClientDashboard from "./pages/client/Dashboard";
import BrandingSettings from "./pages/admin/BrandingSettings";
import NotFound from "./pages/NotFound";

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
            <Route path="/admin" element={<AuthGuard allowedRoles={['admin']} />}>
              <Route path="dashboard" element={<AdminDashboard />} /> {/* Ruta relativa: /admin/dashboard */}
              <Route path="branding" element={<BrandingSettings />} /> {/* Ruta relativa: /admin/branding */}
              {/* Agrega más rutas de admin aquí con path="nombre-ruta" */}
            </Route>

            {/* Rutas protegidas para Local */}
            <Route path="/local" element={<AuthGuard allowedRoles={['local']} />}>
              <Route path="dashboard" element={<LocalDashboard />} /> {/* Ruta relativa: /local/dashboard */}
              {/* Agrega más rutas de local aquí con path="nombre-ruta" */}
            </Route>

            {/* Rutas protegidas para Client */}
            <Route path="/client" element={<AuthGuard allowedRoles={['client']} />}>
              <Route index element={<ClientDashboard />} /> {/* Ruta index: se renderiza en /client */}
              {/* Agrega más rutas de cliente aquí con path="nombre-ruta" */}
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