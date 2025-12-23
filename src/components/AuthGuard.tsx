"use client";

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ allowedRoles, children }) => {
  const { session, user, profile, loading } = useSession();

  // Si loading es true, siempre mostrar el cargador.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
        <p className="text-white text-xl">Cargando autenticación...</p>
      </div>
    );
  }

  // Si loading es false y no hay sesión/usuario, redirigir al login.
  if (!session || !user) {
    showError('Necesitas iniciar sesión para acceder a esta página.');
    return <Navigate to="/login" replace />;
  }

  // Si loading es false y hay sesión pero no perfil (error de carga de perfil), redirigir al login.
  if (!profile) {
    showError('Perfil de usuario no encontrado. Por favor, inicia sesión de nuevo.');
    return <Navigate to="/login" replace />;
  }

  // Verificar roles.
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

  // Acceso concedido.
  return <>{children}</>;
};

export default AuthGuard;