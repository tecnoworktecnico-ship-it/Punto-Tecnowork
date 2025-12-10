"use client";

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading, profile } = useSession();

  useEffect(() => {
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const error = hashParams.get('error');
    const errorCode = hashParams.get('error_code');
    const type = hashParams.get('type');
    
    // 1. Manejar errores de verificación (expiración, etc.)
    if (error && (errorCode === 'otp_expired' || error === 'access_denied')) {
      navigate('/verification-error', { replace: true });
      return;
    }
    
    // Nota: El flujo de 'recovery' ahora se maneja directamente en LandingPage/Login
    // para evitar conflictos de redirección.

    // 2. Si la sesión está cargada y es válida, redirigir al dashboard
    if (!loading && session && profile) {
      if (profile.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (profile.role === 'local') {
        navigate('/local/dashboard', { replace: true });
      } else {
        navigate('/client', { replace: true });
      }
      return;
    }
    
    // 3. Si la carga finaliza y no hay sesión/perfil, ir al login
    if (!loading && !session) {
      navigate('/login', { replace: true });
      return;
    }

  }, [session, loading, profile, navigate, location.hash]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="flex items-center text-white text-xl">
        <Loader2 className="h-6 w-6 animate-spin mr-3" />
        Procesando autenticación...
      </div>
    </div>
  );
};

export default AuthCallback;