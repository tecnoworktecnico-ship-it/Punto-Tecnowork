"use client";

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import BrandingDisplay from './BrandingDisplay';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

interface AppHeaderProps {
  title: string;
  showSignOut?: boolean;
  showBackButton?: boolean;
  backPath?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  title, 
  showSignOut = true, 
  showBackButton = false, 
  backPath 
}) => {
  const { user, profile, signOut } = useSession();
  const navigate = useNavigate();
  
  const displayName = profile?.first_name || user?.email || 'Usuario';

  const getDashboardPath = () => {
    if (profile?.role === 'admin') return '/admin/dashboard';
    if (profile?.role === 'local') return '/local/dashboard';
    // Si es cliente o rol desconocido, ir a la raíz del cliente
    return '/client'; 
  };

  return (
    <header className="w-full bg-white shadow-md p-4 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
        
        {/* Logo y Título (Enlace Dinámico) */}
        <Link to={getDashboardPath()} className="flex items-center gap-4 min-w-0 cursor-pointer group">
          <BrandingDisplay type="main" className="h-10 w-auto flex-shrink-0 transition-opacity group-hover:opacity-80" />
          <h1 className="text-xl font-bold text-text-carbon truncate hidden sm:block">
            {title}
          </h1>
        </Link>

        {/* Acciones y Perfil */}
        <div className="flex items-center gap-3">
          {showSignOut && (
            <div className="flex flex-col items-end text-sm">
              <span className="font-medium text-text-carbon truncate max-w-[150px]">{displayName}</span>
              <span className="text-xs text-gray-500 capitalize">{profile?.role || 'Cargando...'}</span>
            </div>
          )}
          
          {showSignOut && (
            <Button 
              onClick={signOut} 
              variant="outline"
              size="icon"
              className="bg-emphasis-red hover:bg-red-700 text-white flex-shrink-0"
              title="Cerrar Sesión"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;