import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // Importar QueryClient y QueryClientProvider

const queryClient = new QueryClient();

const App = () => (
  <React.Fragment>
    <QueryClientProvider client={queryClient}>
      {/* Contenido mínimo envuelto por QueryClientProvider */}
      <div className="min-h-screen flex items-center justify-center text-2xl font-bold">
        Aplicación Mínima con QueryClientProvider
      </div>
    </QueryClientProvider>
    <Toaster />
    <Sonner />
  </React.Fragment>
);

export default App;