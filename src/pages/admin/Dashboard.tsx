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
  Package,
  User,
  RefreshCw,
  BarChart,
  Gift, 
  Wrench // Usar Wrench para mantenimiento
} from 'lucide-react';
import { useAdminDashboardData } from '@/hooks/useDashboardData';
import StatCard from '@/components/dashboard/StatCard';
import Footer from '@/components/Footer';
import AppHeader from '@/components/AppHeader'; 

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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <AppHeader title="Dashboard de Administración" />
      
      <main className="flex-grow p-4">
        <div className="w-full max-w-7xl mx-auto p-8 space-y-8 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold text-text-carbon">Resumen General</h1>
            <Button 
              onClick={refreshData} 
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2 bg-white text-primary-blue border-primary-blue hover:bg-gray-100"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar Datos
            </Button>
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
              description="Pedidos totales en el sistema (no cancelados)"
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
            
            {/* Tarjeta de Recompensas */}
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

            {/* Nueva Tarjeta de Mantenimiento (Enlace) */}
            <Card 
              className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-secondary-yellow cursor-pointer group" 
              onClick={() => navigate('/admin/maintenance')}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Wrench className="h-8 w-8 text-secondary-yellow group-hover:scale-110 transition-transform" />
                  <CardTitle className="text-gray-800">Mantenimiento</CardTitle>
                </div>
                <CardDescription>Limpieza, reparación y ajustes técnicos.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full justify-start pl-0 hover:bg-transparent text-secondary-yellow font-medium">
                  Ir al Panel Técnico →
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;