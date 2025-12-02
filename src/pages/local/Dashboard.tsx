"use client";

import React from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const LocalDashboard = () => {
  const { user, profile, signOut } = useSession();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <div className="w-full max-w-4xl p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-text-carbon">Dashboard de Local</h1>
          <Button onClick={signOut} className="bg-emphasis-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Cerrar Sesión
          </Button>
        </div>
        <p className="text-xl text-gray-600 mb-6">Bienvenido, {profile?.first_name || user?.email}! Aquí puedes gestionar tus pedidos y precios locales.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-50 shadow-md">
            <CardHeader>
              <CardTitle className="text-primary-blue">Gestión de Pedidos</CardTitle>
              <CardDescription>Revisa y actualiza el estado de los pedidos de tu local.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button variant="outline" className="w-full" onClick={() => navigate('/local/orders')}>
                Ver Pedidos Pendientes
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/local/order-history')}>
                Historial de Pedidos
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 shadow-md">
            <CardHeader>
              <CardTitle className="text-primary-blue">Precios y Servicios</CardTitle>
              <CardDescription>Gestiona los precios específicos de tu local.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button variant="outline" className="w-full" onClick={() => navigate('/local/prices')}>
                Gestionar Precios Locales
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/local/services')}>
                Configurar Servicios
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LocalDashboard;