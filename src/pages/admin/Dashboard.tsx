"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSession } from '@/contexts/SessionContext';
import { 
  Package, 
  DollarSign, 
  Settings, 
  Users as UsersIcon, 
  Store 
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useSession();

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
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;