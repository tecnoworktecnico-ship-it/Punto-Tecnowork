"use client";

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PasswordChangeAlertProps {
  onNavigateToSettings: () => void;
}

const PasswordChangeAlert: React.FC<PasswordChangeAlertProps> = ({ onNavigateToSettings }) => {
  return (
    <Alert className="bg-emphasis-red/10 border-emphasis-red text-emphasis-red mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-bold">¡Advertencia de Seguridad!</AlertTitle>
      <AlertDescription className="flex justify-between items-center">
        <span>
          Tu cuenta fue creada por un administrador con una contraseña temporal. Por favor, cambia tu contraseña inmediatamente.
        </span>
        <Button 
          onClick={onNavigateToSettings} 
          className="bg-emphasis-red hover:bg-red-700 text-white ml-4"
        >
          Cambiar Contraseña
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default PasswordChangeAlert;