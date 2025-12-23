"use client";

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface AuthGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ allowedRoles, children }) => {
  const { session, user, profile, loading } = useSession();
  const isMobile = useIsMobile();
  const [isWaitingForSession, setIsWaitingForSession] = useState(false);

  useEffect(() => {
    if (loading) {
      // Reset waiting state while loading
      setIsWaitingForSession(false);
      return;
    }

    // Si la carga inicial terminó y la sesión falta, iniciamos un período de gracia en móvil.
    if (isMobile && !session && !isWaitingForSession) {
      console.log('AuthGuard: Mobile detected, session missing, starting grace period.');
      setIsWaitingForSession(true);
      
      const timer = setTimeout(() => {
        // Si después de 500ms, la sesión sigue faltando, permitimos la redirección.
        if (!session) {
          console.log('AuthGuard: Grace period expired, redirecting to login.');
          setIsWaitingForSession(false);
        }
      }, 500); // 500ms período de gracia

      return () => clearTimeout(timer);
    }
    
    // Si la sesión está presente, detenemos la espera.
    if (session && isWaitingForSession) {
      setIsWaitingForSession(false);
    }

  }, [loading, session, isMobile, isWaitingForSession]);


  // Mostrar cargando si la sesión está cargando O si estamos en el período de gracia móvil
  if (loading || (isMobile && !session && isWaitingForSession)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando autenticación...</p>
      </div>
    );
  }

  if (!session || !user) {
    showError('Necesitas iniciar sesión para acceder a esta página.');
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    showError('Perfil de usuario no encontrado. Por favor, inicia sesión de nuevo.');
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    showError('No tienes permiso para acceder a esta página.');
    
    if (profile.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (profile.role === 'local') {
      return <Navigate to="/local/dashboard" replace />;
    } else if (profile.role === 'client') {
      return <Navigate to="/client" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;