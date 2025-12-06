"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { DollarSign, Settings, LayoutDashboard, RefreshCw, Package, Clock, BarChart } from 'lucide-react';
import ProfileSettings from '@/components/ProfileSettings';
import PasswordChangeAlert from '@/components/PasswordChangeAlert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocalDashboardData } from '@/hooks/useDashboardData';
import StatCard from '@/components/dashboard/StatCard';

const LocalDashboard = () => {
  const { user, profile, signOut } = useSession();
  const navigate = useNavigate();
  const [localData, setLocalData] = useState<any>(null);
  const [localId, setLocalId] = useState<string | null>(null);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (profile?.role === 'local') {
      fetchLocalData();
    }
  }, [profile]);

  const fetchLocalData = async () => {
    setLoadingLocal(true);

    // Obtener datos del local
    const { data: local, error: localError } = await supabase
      .from('locals')
      .select('*')
      .eq('manager_id', profile?.id)
      .single();

    if (localError) {
      console.error('Error fetching local:', localError);
      showError('Error al cargar los datos del local.');
      setLocalData(null);
      setLocalId(null);
      setLoadingLocal(false);
      return;
    }

    setLocalData(local);
    setLocalId(local.id);
    setLoadingLocal(false);
  };

  const { 
    totalOrders, 
    totalRevenue, 
    orderStatusStats, 
    loading: loadingStats, 
    refreshData 
  } = useLocalDashboardData(localId);

  // Función para forzar la recarga del perfil después de una actualización
  const handleProfileUpdate = () => {
    // Confiar en SessionContext para recargar el perfil
  };

  const needsPasswordChange = profile && !profile.password_changed;
  const pendingOrders = orderStatusStats.find(s => s.name === 'PENDING')?.value || 0;

  if (loadingLocal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <div className="w-full max-w-6xl p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-text-carbon">Dashboard de Local</h1>
            <p className="text-xl text-gray-600 mt-2">
              {localData?.name || 'Local'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={refreshData} 
              disabled={loadingStats}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
              Actualizar Datos
            </Button>
            <Button onClick={signOut} className="bg-emphasis-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
              Cerrar Sesión
            </Button>
          </div>
        </div>
        <p className="text-xl text-gray-600 mb-6">
          Bienvenido, {profile?.first_name || user?.email}! Aquí puedes gestionar tus pedidos y configuraciones.
        </p>

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

          <TabsContent value="dashboard" className="mt-6 space-y-6">
            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                title="Ingresos (Completados)"
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
                description="Pedidos totales de este local"
              />
              <StatCard 
                title="Pedidos Pendientes"
                value={pendingOrders}
                icon={Clock}
                color="text-secondary-yellow"
                description="Pedidos esperando ser procesados"
              />
            </div>

            {/* Gestión de Pedidos, Precios y Reportes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <Card className="bg-gray-50 shadow-md">
                <CardHeader>
                  <CardTitle className="text-primary-blue">Gestión de Pedidos</CardTitle>
                  <CardDescription>Revisa y actualiza el estado de los pedidos de tu local.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => navigate('/local/orders')}
                  >
                    Ver Todos los Pedidos
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="bg-primary-blue/10 border-primary-blue shadow-md">
                <CardHeader>
                  <CardTitle className="text-primary-blue">ESTADÍSTICAS</CardTitle>
                  <CardDescription>Análisis de rendimiento, tendencias y ranking de clientes.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col space-y-2">
                  <Button 
                    className="w-full bg-primary-blue hover:bg-blue-700 text-white" 
                    onClick={() => navigate('/local/reports')}
                  >
                    Ver Reportes Detallados
                  </Button>
                </CardContent>
              </Card>

              {localData?.can_edit_prices && (
                <Card className="bg-gray-50 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-primary-blue">Precios Locales</CardTitle>
                    <CardDescription>Gestiona los precios específicos de tu local.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => navigate('/local/prices')}
                    >
                      Gestionar Precios
                    </Button>
                  </CardContent>
                </Card>
              )}
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

export default LocalDashboard;