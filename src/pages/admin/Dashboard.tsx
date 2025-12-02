"use client";

import React from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Building2, DollarSign, Settings, Users } from 'lucide-react';

const AdminDashboard = () => {
  const { user, profile, signOut } = useSession();
  const navigate = useNavigate();

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">Gestión de Locales</CardTitle>
              </div>
              <CardDescription>Administra los locales y sus configuraciones.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/admin/locals')}
              >
                Ver y Gestionar Locales
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">Precios Globales</CardTitle>
              </div>
              <CardDescription>Define los precios base para todos los servicios.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/admin/global-prices')}
              >
                Gestionar Precios Globales
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">Configuración</CardTitle>
              </div>
              <CardDescription>Ajustes generales de la aplicación.</CardDescription>
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
                <Users className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">Usuarios</CardTitle>
              </div>
              <CardDescription>Gestiona usuarios y sus roles.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                disabled
              >
                Gestionar Usuarios (Próximamente)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;