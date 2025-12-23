"use client";

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';

interface AuthGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ allowedRoles, children }) => {
  const { session, user, profile, loading } = useSession();

  if (loading) {
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