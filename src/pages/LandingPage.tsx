"use client";

import { useEffect } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from "@/contexts/SessionContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BrandingDisplay from "@/components/BrandingDisplay";

const LandingPage = () => {
  const { loading, session, profile } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Si hay un hash en la URL (callback de OAuth), redirigir a auth-callback
    if (location.hash && location.hash.includes('access_token')) {
      console.log('LandingPage - OAuth callback detected, redirecting to auth-callback');
      navigate('/auth-callback' + location.hash, { replace: true });
      return;
    }
  }, [location.hash, navigate]);

  // Si hay sesión activa, redirigir según rol
  useEffect(() => {
    if (!loading && session && profile) {
      console.log('LandingPage - Session found, redirecting based on role:', profile.role);
      if (profile.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (profile.role === 'local') {
        navigate('/local/dashboard', { replace: true });
      } else {
        navigate('/client', { replace: true });
      }
    }
  }, [loading, session, profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="mb-6">
          <BrandingDisplay type="main" className="h-20 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-text-carbon">Bienvenido a Punto Tecnowork</h1>
        </div>
        <p className="text-xl text-gray-600 mb-6">Tu solución integral para gestión de pedidos y recompensas.</p>
        <Button 
          className="bg-primary-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
          onClick={() => navigate('/login')}
        >
          Iniciar Sesión / Registrarse
        </Button>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default LandingPage;
