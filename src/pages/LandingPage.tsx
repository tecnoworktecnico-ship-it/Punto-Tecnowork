"use client";

import { useEffect } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from "@/contexts/SessionContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BrandingDisplay from "@/components/BrandingDisplay";

const LandingPage = () => {
  const { loading, session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('LandingPage - Full URL:', window.location.href);
    console.log('LandingPage - Hash:', location.hash);
    
    // Si hay un hash en la URL, procesarlo
    if (location.hash) {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const type = hashParams.get('type');
      const error = hashParams.get('error');
      const errorCode = hashParams.get('error_code');
      const accessToken = hashParams.get('access_token');
      
      console.log('LandingPage - Hash detected', { type, error, errorCode, hasToken: !!accessToken });
      
      // Manejar errores de verificación
      if (error && (errorCode === 'otp_expired' || error === 'access_denied')) {
        navigate('/verification-error', { replace: true });
        return;
      }
      
      // Si es un flujo de recuperación con token, ir DIRECTAMENTE a reset-password
      // IMPORTANTE: Preservar el hash completo
      if (type === 'recovery' && accessToken) {
        console.log('LandingPage - Recovery flow detected, redirecting to reset-password with hash');
        navigate('/reset-password' + location.hash, { replace: true });
        return;
      }
      
      // Para cualquier otro tipo de autenticación con token, ir a auth-callback
      if (accessToken && type !== 'recovery') {
        console.log('LandingPage - Auth flow detected, redirecting to auth-callback');
        navigate('/auth-callback' + location.hash, { replace: true });
        return;
      }
    }
  }, [location.hash, navigate]);

  // Si hay sesión activa, no redirigir automáticamente desde aquí
  useEffect(() => {
    if (!loading && session) {
      // Dejar que SessionContext maneje la redirección
      return;
    }
  }, [loading, session]);

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
          className="bg-primary-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
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