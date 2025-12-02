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
import Locals from "./pages/admin/Locals";
import GlobalPrices from "./pages/admin/GlobalPrices";
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
            <Route 
              path="/admin/dashboard" 
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <AdminDashboard />
                </AuthGuard>
              } 
            />
            <Route 
              path="/admin/branding" 
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <BrandingSettings />
                </AuthGuard>
              } 
            />
            <Route 
              path="/admin/locals" 
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <Locals />
                </AuthGuard>
              } 
            />
            <Route 
              path="/admin/global-prices" 
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <GlobalPrices />
                </AuthGuard>
              } 
            />

            {/* Rutas protegidas para Local */}
            <Route 
              path="/local/dashboard" 
              element={
                <AuthGuard allowedRoles={['local']}>
                  <LocalDashboard />
                </AuthGuard>
              } 
            />

            {/* Rutas protegidas para Client */}
            <Route 
              path="/client" 
              element={
                <AuthGuard allowedRoles={['client']}>
                  <ClientDashboard />
                </AuthGuard>
              } 
            />

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