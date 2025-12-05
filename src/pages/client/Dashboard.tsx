"use client";

import React, { useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import ProfileSettings from '@/components/ProfileSettings';
import PasswordChangeAlert from '@/components/PasswordChangeAlert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, LayoutDashboard } from 'lucide-react';

const ClientDashboard = () => {
  const { user, profile, signOut } = useSession();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Función para forzar la recarga del perfil después de una actualización
  const handleProfileUpdate = () => {
    // Forzar un refresh de sesión para obtener el perfil actualizado (incluyendo password_changed)
    // Aunque useSession ya maneja USER_UPDATED, forzamos un re-render si es necesario.
    // En este caso, confiamos en que SessionContext recargará el perfil.
  };

  const needsPasswordChange = profile && !profile.password_changed;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <div className="w-full max-w-6xl p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-text-carbon">Bienvenido, {profile?.first_name || user?.email}!</h1>
          <Button onClick={signOut} className="bg-emphasis-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Cerrar Sesión
          </Button>
        </div>
        
        {needsPasswordChange && (
          <PasswordChangeAlert onNavigateToSettings={() => setActiveTab('settings')} />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-1/3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> Configuración
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-6">
            <p className="text-xl text-gray-600 mb-6">Este es tu dashboard de cliente. Aquí puedes gestionar tus pedidos y recompensas.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-50 shadow-md">
                <CardHeader>
                  <CardTitle className="text-primary-blue">Mis Pedidos</CardTitle>
                  <CardDescription>Revisa el estado de tus pedidos y tu historial.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col space-y-2">
                  <Button className="w-full" onClick={() => navigate('/client/new-order')}>
                    Realizar Nuevo Pedido
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/client/orders')}>
                    Ver Mis Pedidos
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-50 shadow-md">
                <CardHeader>
                  <CardTitle className="text-primary-blue">Mis Recompensas</CardTitle>
                  <CardDescription>Consulta tus puntos y canjea recompensas.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col space-y-2">
                  <Button variant="outline" className="w-full" onClick={() => navigate('/client/rewards')}>
                    Ver Recompensas
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/client/points')}>
                    Mis Puntos
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <ProfileSettings onProfileUpdate={handleProfileUpdate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientDashboard;