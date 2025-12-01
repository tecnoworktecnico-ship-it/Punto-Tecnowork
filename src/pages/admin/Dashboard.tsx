"use client";

import React from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, profile, signOut } = useSession();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <div className="w-full max-w-4xl p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-text-carbon">Dashboard de Administrador</h1>
          <Button onClick={signOut} className="bg-emphasis-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Cerrar Sesión
          </Button>
        </div>
        <p className="text-xl text-gray-600 mb-6">Bienvenido, {profile?.first_name || user?.email}! Tienes control total sobre la plataforma.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-gray-50 shadow-md">
            <CardHeader>
              <CardTitle className="text-primary-blue">Gestión de Usuarios</CardTitle>
              <CardDescription>Administra las cuentas de clientes y locales.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button asChild variant="outline" className="w-full">
                <Link to="/admin/users">Ver Usuarios</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/admin/roles">Gestionar Roles</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 shadow-md">
            <CardHeader>
              <CardTitle className="text-primary-blue">Gestión de Pedidos</CardTitle>
              <CardDescription>Supervisa y gestiona todos los pedidos del sistema.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button asChild variant="outline" className="w-full">
                <Link to="/admin/orders">Ver Todos los Pedidos</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/admin/order-status">Actualizar Estados</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 shadow-md">
            <CardHeader>
              <CardTitle className="text-primary-blue">Configuración General</CardTitle>
              <CardDescription>Ajustes de la aplicación y precios globales.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button asChild variant="outline" className="w-full">
                <Link to="/admin/settings">Ajustes de la App</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/admin/global-prices">Gestionar Precios Globales</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;