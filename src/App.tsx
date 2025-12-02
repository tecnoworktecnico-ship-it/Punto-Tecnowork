import React from "react";
import { Toaster } from "@/components/ui/toaster"; // Importar Toaster de shadcn/ui
import { Toaster as Sonner } from "@/components/ui/sonner"; // Importar Toaster de sonner

const App = () => (
  <React.Fragment>
    {/* Contenido mínimo para probar si el error persiste */}
    <div className="min-h-screen flex items-center justify-center text-2xl font-bold">
      Aplicación Mínima
    </div>
    <Toaster />
    <Sonner />
  </React.Fragment>
);

export default App;