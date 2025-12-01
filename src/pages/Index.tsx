"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from "@/contexts/SessionContext";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import { Button } from "@/components/ui/button";
import BrandingDisplay from "@/components/BrandingDisplay";
import { useEffect } from "react"; // Import useEffect

const Index = () => {
  const { session, loading, profile } = useSession();
  const navigate = useNavigate(); // Get navigate hook

  useEffect(() => {
    if (!loading && session && profile) {
      // If session exists and profile is loaded, redirect based on role
      if (profile.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (profile.role === 'local') {
        navigate('/local/dashboard', { replace: true });
      } else if (profile.role === 'client') {
        navigate('/client', { replace: true });
      } else {
        // Fallback for unrecognized roles, redirect to client dashboard as a safe default
        navigate('/client', { replace: true });
      }
    }
  }, [loading, session, profile, navigate]); // Depend on loading, session, profile, navigate

  // Show loading state if session is being loaded or if a redirection is pending
  if (loading || (session && profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    );
  }

  // Only render the public landing page if no session
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="mb-6">
          <BrandingDisplay type="main" className="h-20 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-text-carbon">Bienvenido a Punto Tecnowork</h1>
        </div>
        <p className="text-xl text-gray-600 mb-6">Tu solución integral para gestión de pedidos y recompensas.</p>
        <Link to="/login">
          <Button className="bg-primary-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Iniciar Sesión / Registrarse
          </Button>
        </Link>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;