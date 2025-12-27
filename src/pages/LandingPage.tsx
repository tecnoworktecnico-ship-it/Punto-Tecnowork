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
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden bg-black">
      {/* Fondo Animado (Luces) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-red-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-80 h-80 bg-yellow-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      {/* TARJETA DE CRISTAL INTERACTIVA */}
      <div className="glass-card p-10 rounded-3xl shadow-2xl max-w-md w-full relative z-10 border border-white/10 backdrop-blur-xl transition-all duration-500 ease-in-out hover:bg-white/10 hover:scale-[1.02] hover:border-blue-500/50 hover:shadow-blue-900/30">
        <div className="flex flex-col items-center text-center space-y-8">
          
          {/* Logo con efecto al pasar el mouse */}
          <div className="transform transition-transform duration-500 hover:rotate-6 hover:scale-110 p-2">
             <BrandingDisplay type="main" className="h-20 w-auto" /> 
          </div>
          {/* Texto con gradiente interactivo */}
          <div className="space-y-2 group cursor-default">
            <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-md transition-colors duration-300">
              Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-yellow-400 bg-[length:200%_auto] animate-gradient group-hover:from-blue-300 group-hover:to-yellow-300 transition-all">Punto Tecnowork</span>
            </h1>
            <p className="text-gray-300 text-lg group-hover:text-white transition-colors duration-300">
              Tu solución integral para gestión de pedidos y recompensas.
            </p>
          </div>
          {/* Botones de acción */}
          <div className="w-full space-y-4 pt-4">
            <button 
              onClick={() => navigate('/login')}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all duration-300 transform hover:-translate-y-1 border border-blue-400/30"
            >
              Iniciar Sesión / Registrarse
            </button>
          </div>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default LandingPage;