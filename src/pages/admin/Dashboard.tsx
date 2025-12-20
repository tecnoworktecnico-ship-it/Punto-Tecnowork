"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSession } from '@/contexts/SessionContext';
import { 
  DollarSign, 
  Settings, 
  Users as UsersIcon, 
  Store,
  Clock,
  Package,
  User,
  RefreshCw,
  BarChart,
  Loader2,
  Gift // Importar Gift para el nuevo botón
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useAdminDashboardData } from '@/hooks/useDashboardData';
import StatCard from '@/components/dashboard/StatCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Footer from '@/components/Footer';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useSession();
  const { 
    totalOrders, 
    totalRevenue, 
    totalClients, 
    localPerformance, 
    loading, 
    refreshData 
  } = useAdminDashboardData();
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Función para mostrar instrucciones sobre cómo extender el tiempo de verificación
  const showVerificationTimeInstructions = () => {
    setIsConfiguring(true);
    
    setTimeout(() => {
      setIsConfiguring(false);
      showSuccess('Instrucciones mostradas. Recuerda que necesitas acceso a la consola de Supabase.');
    } , 1500);
    
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
      <div className="w-full max-w-7xl p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-text-carbon">Dashboard Admin</h1>
          <div className="flex gap-3">
            <Button 
              onClick={refreshData} 
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar Datos
            </Button>
            <Button 
              onClick={signOut} 
              className="bg-emphasis-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Sección de Métricas Clave */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            title="Ingresos Totales (Completados)"
            value={`$${totalRevenue.toFixed(2)}`}
            icon={DollarSign}
            color="text-success-green"
            description="Pedidos completados históricamente"
          />
          <StatCard 
            title="Total de Pedidos"
            value={totalOrders}
            icon={Package}
            color="text-primary-blue"
            description="Pedidos totales en el sistema"
          />
          <StatCard 
            title="Clientes Registrados"
            value={totalClients}
            icon={User}
            color="text-secondary-yellow"
            description="Usuarios con rol 'client'"
          />
          <StatCard 
            title="Locales Activos"
            value={localPerformance.length}
            icon={Store}
            color="text-purple-600"
            description="Número de locales registrados"
          />
        </div>

        {/* Sección de Navegación y Configuración */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-8">
          
          {/* Botón de Reportes */}
          <Card className="bg-primary-blue/10 border-primary-blue shadow-md hover:shadow-lg transition-shadow lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <BarChart className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">ESTADÍSTICAS Y REPORTES</CardTitle>
              </div>
              <CardDescription>Análisis detallado de rendimiento, tendencias y ranking de clientes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                className="w-full bg-primary-blue hover:bg-blue-700 text-white" 
                onClick={() => navigate('/admin/reports')}
              >
                Ver Reportes Detallados
              </Button>
            </CardContent>
          </Card>

          {/* Gestión de Pedidos */}
          <Card className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">Pedidos</CardTitle>
              </div>
              <CardDescription>Gestiona y supervisa todos los pedidos.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/admin/orders')}
              >
                Ver Todos los Pedidos
              </Button>
            </CardContent>
          </Card>

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
                <CardTitle className="text-primary-blue">Configuración</CardTitle>
              </div>
              <CardDescription>Branding y precios globales.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start mb-2" 
                onClick={() => navigate('/admin/branding')}
              >
                Configurar Branding
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/admin/global-prices')}
              >
                Gestionar Precios
              </Button>
            </CardContent>
          </Card>
          
          {/* Nueva Tarjeta de Recompensas */}
          <Card className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Gift className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">Recompensas</CardTitle>
              </div>
              <CardDescription>Crea y gestiona los premios canjeables.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate('/admin/rewards')}
              >
                Gestionar Premios
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-primary-blue" />
                <CardTitle className="text-primary-blue">Verificación Email</CardTitle>
              </div>
              <CardDescription>Ajustes de seguridad de autenticación.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={showVerificationTimeInstructions}
                disabled={isConfiguring}
              >
                {isConfiguring ? 'Mostrando instrucciones...' : 'Extender tiempo de enlace'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;