import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login"; // Importar la página de Login
import { SessionContextProvider } from "./contexts/SessionContext";

const queryClient = new QueryClient();

const App = () => (
  <React.Fragment>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} /> {/* Nueva ruta para Login */}
            {/* Agrega otras rutas aquí si es necesario */}
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </QueryClientProvider>
    <Toaster />
    <Sonner />
  </React.Fragment>
);

export default App;