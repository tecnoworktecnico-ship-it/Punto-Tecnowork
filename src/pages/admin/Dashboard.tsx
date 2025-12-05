"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSession } from '@/contexts/SessionContext';
import { 
  Package, 
  DollarSign, 
  Settings, 
  Users as UsersIcon, 
  Store,
  Clock
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useSession();
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Función para mostrar instrucciones sobre cómo extender el tiempo de verificación
  const showVerificationTimeInstructions = () => {
    setIsConfiguring(true);
    
    setTimeout(() => {
      setIsConfiguring(false);
      showSuccess('Instrucciones mostradas. Recuerda que necesitas acceso a la consola de Supabase.');
    }, 1500);
    
    // Mostrar instrucciones detalladas
    alert(`Para extender el tiempo de verificación de correo a 30 minutos:

1. Accede a la consola de Supabase (https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a Authentication > Settings > Email
4. Busca "Email Link Expiration"
5. Cambia el valor a 1800 (segundos = 30 minutos)
6. Guarda los cambios

Nota: Esta configuración solo puede cambiarse desde la consola de Supabase y requiere permisos de administrador.`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <div className="w-full max-w-6xl p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-text-carbon">Dashboard Admin</h1>
          <Button 
            onClick={signOut} 
            className="bg-emphasis-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Cerrar Sesión
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Store className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">Locales</CardTitle>
              </div>
              <CardDescription>Gestiona los locales de impresión.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/admin/locals')}
              >
                Gestionar Locales
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">Precios Globales</CardTitle>
              </div>
              <CardDescription>Configura precios base para servicios.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/admin/global-prices')}
              >
                Gestionar Precios
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <UsersIcon className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">Usuarios</CardTitle>
              </div>
              <CardDescription>Gestiona usuarios y sus roles.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/admin/users')}
              >
                Gestionar Usuarios
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">Branding</CardTitle>
              </div>
              <CardDescription>Configura la identidad visual.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/admin/branding')}
              >
                Configurar Branding
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">Tiempo de Verificación</CardTitle>
              </div>
              <CardDescription>Configura el tiempo de expiración para enlaces de verificación.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={showVerificationTimeInstructions}
                disabled={isConfiguring}
              >
                {isConfiguring ? 'Mostrando instrucciones...' : 'Extender a 30 minutos'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;