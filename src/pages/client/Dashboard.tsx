"use client";

import React from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const ClientDashboard = () => {
  const { user, profile, signOut } = useSession();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <div className="w-full max-w-4xl p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-text-carbon">Bienvenido, {profile?.first_name || user?.email}!</h1>
          <Button onClick={signOut} className="bg-emphasis-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Cerrar Sesión
          </Button>
        </div>
        <p className="text-xl text-gray-600 mb-6">Este es tu dashboard de cliente. Aquí puedes gestionar tus pedidos y recompensas.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-50 shadow-md">
            <CardHeader>
              <CardTitle className="text-primary-blue">Mis Pedidos</CardTitle>
              <CardDescription>Revisa el estado de tus pedidos y tu historial.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button asChild className="w-full">
                <Link to="/client/new-order">Realizar Nuevo Pedido</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/client/orders">Ver Mis Pedidos</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 shadow-md">
            <CardHeader>
              <CardTitle className="text-primary-blue">Mis Recompensas</CardTitle>
              <CardDescription>Consulta tus puntos y canjea recompensas.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button asChild variant="outline" className="w-full">
                <Link to="/client/rewards">Ver Recompensas</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/client/points">Mis Puntos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;