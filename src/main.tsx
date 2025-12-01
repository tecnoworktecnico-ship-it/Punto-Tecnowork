import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import React from "react"; // Importar React para usar React.StrictMode y React.Fragment

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster />
    <Sonner />
  </React.StrictMode>
);