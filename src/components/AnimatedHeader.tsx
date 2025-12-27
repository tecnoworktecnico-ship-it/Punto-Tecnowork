"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import BrandingDisplay from './BrandingDisplay';
import { Button } from '@/components/ui/button';
import { LogOut, User, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedHeaderProps {
  title: string;
  showSignOut?: boolean;
  showBackButton?: boolean;
  backPath?: string;
}

const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({ 
  title, 
  showSignOut = true, 
  showBackButton = false, 
  backPath 
}) => {
  const { user, profile, signOut } = useSession();
  const navigate = useNavigate();
  
  const displayName = profile?.first_name || user?.email || 'Usuario';

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <header 
      className={cn(
        "w-full p-4 sticky top-0 z-20 glass-card-subtle shadow-md",
        "animate-slide-in-right"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
        
        {/* Logo y Título */}
        <div className="flex items-center gap-4 min-w-0">
          {showBackButton && (
            <Button
              variant="ghost"
              onClick={handleBack}
              size="icon"
              className="flex-shrink-0 text-text-carbon hover:text-primary-blue"
              title="Volver"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          <BrandingDisplay type="main" className="h-10 w-auto flex-shrink-0 animate-slide-in-left animation-delay-100" />
          <h1 className="text-xl font-bold text-text-carbon truncate hidden sm:block animate-slide-in-right animation-delay-200">
            {title}
          </h1>
        </div>

        {/* Acciones y Perfil */}
        <div className="flex items-center gap-3 animate-slide-in-right animation-delay-300">
          {showSignOut && (
            <div className="flex flex-col items-end text-sm hidden sm:block">
              <span className="font-medium text-text-carbon truncate max-w-[150px]">{displayName}</span>
              <span className="text-xs text-gray-500 capitalize">{profile?.role || 'Cargando...'}</span>
            </div>
          )}
          
          {showSignOut && (
            <Button 
              onClick={signOut} 
              variant="outline"
              size="icon"
              className="bg-emphasis-red hover:bg-red-700 text-white flex-shrink-0 hover-scale"
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

export default AnimatedHeader;