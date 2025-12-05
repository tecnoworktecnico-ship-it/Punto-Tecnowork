"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Package, DollarSign, Clock, CheckCircle, Settings, LayoutDashboard } from 'lucide-react';
import ProfileSettings from '@/components/ProfileSettings';
import PasswordChangeAlert from '@/components/PasswordChangeAlert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const LocalDashboard = () => {
  const { user, profile, signOut } = useSession();
  const navigate = useNavigate();
  const [localData, setLocalData] = useState<any>(null);
  const [stats, setStats] = useState({
    pending: 0,
    in_progress: 0,
    ready: 0,
    completed_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (profile?.role === 'local') {
      fetchLocalData();
    }
  }, [profile]);

  const fetchLocalData = async () => {
    setLoading(true);

    // Obtener datos del local
    const { data: local, error: localError } = await supabase
      .from('locals')
      .select('*')
      .eq('manager_id', profile?.id)
      .single();

    if (localError) {
      console.error('Error fetching local:', localError);
      showError('Error al cargar los datos del local.');
      setLoading(false);
      return;
    }

    setLocalData(local);

    // Obtener estadísticas de pedidos
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('status, created_at')
      .eq('local_id', local.id);

    if (!ordersError && orders) {
      const today = new Date().toDateString();
      setStats({
        pending: orders.filter(o => o.status === 'pending').length,
        in_progress: orders.filter(o => o.status === 'in_progress').length,
        ready: orders.filter(o => o.status === 'ready').length,
        completed_today: orders.filter(o => 
          o.status === 'completed' && 
          new Date(o.created_at).toDateString() === today
        ).length,
      });
    }

    setLoading(false);
  };

  // Función para forzar la recarga del perfil después de una actualización
  const handleProfileUpdate = () => {
    // Forzar un refresh de sesión para obtener el perfil actualizado (incluyendo password_changed)
    // En este caso, confiamos en que SessionContext recargará el perfil.
  };

  const needsPasswordChange = profile && !profile.password_changed;

  if (loading) {
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
          <Button onClick={signOut} className="bg-emphasis-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Cerrar Sesión
          </Button>
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

          <TabsContent value="dashboard" className="mt-6">
            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-secondary-yellow/10 border-secondary-yellow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pendientes</p>
                      <p className="text-3xl font-bold text-text-carbon">{stats.pending}</p>
                    </div>
                    <Clock className="h-10 w-10 text-secondary-yellow" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary-blue/10 border-primary-blue">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">En Proceso</p>
                      <p className="text-3xl font-bold text-text-carbon">{stats.in_progress}</p>
                    </div>
                    <Package className="h-10 w-10 text-primary-blue" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-success-green/10 border-success-green">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Listos</p>
                      <p className="text-3xl font-bold text-text-carbon">{stats.ready}</p>
                    </div>
                    <CheckCircle className="h-10 w-10 text-success-green" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-100 border-gray-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Completados Hoy</p>
                      <p className="text-3xl font-bold text-text-carbon">{stats.completed_today}</p>
                    </div>
                    <CheckCircle className="h-10 w-10 text-gray-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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