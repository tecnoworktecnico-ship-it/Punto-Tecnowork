import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import React from "react"; // Importar React para usar React.StrictMode y React.Fragment
import { Toaster } from "@/components/ui/toaster"; // Importar Toaster
import { Toaster as Sonner } from "@/components/ui/sonner"; // Importar Sonner

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <React.Fragment> {/* Este Fragment permite múltiples hijos para StrictMode */}
      <App />
      <Toaster />
      <Sonner />
    </React.Fragment>
  </React.StrictMode>
);