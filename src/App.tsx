import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // Importar BrowserRouter, Routes, Route
import LandingPage from "./pages/LandingPage"; // Importar LandingPage

const queryClient = new QueryClient();

const App = () => (
  <React.Fragment>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* BrowserRouter espera un único hijo, que será Routes */}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {/* Agrega otras rutas aquí si es necesario para probar, pero por ahora, solo la principal */}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    <Toaster />
    <Sonner />
  </React.Fragment>
);

export default App;