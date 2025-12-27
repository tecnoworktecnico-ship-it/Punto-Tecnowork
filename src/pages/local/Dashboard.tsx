"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { DollarSign, Settings, LayoutDashboard, RefreshCw, Package, Clock, BarChart, Trophy, Gift, Edit, Loader2 } from 'lucide-react';
import ProfileSettings from '@/components/ProfileSettings';
import PasswordChangeAlert from '@/components/PasswordChangeAlert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocalDashboardData } from '@/hooks/useDashboardData';
import { useManagerLocalPrices } from '@/hooks/useLocalPrices';
import ClientRankingTable from '@/components/dashboard/ClientRankingTable';
import PriceList from '@/components/PriceList';
import PageWrapper from '@/components/PageWrapper';
import AnimatedHeader from '@/components/AnimatedHeader';
import ContentCard from '@/components/ContentCard';
import StatCardAnimated from '@/components/dashboard/StatCardAnimated';

const LocalDashboard = () => {
  const { user, profile, signOut } = useSession();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeRewardsCount, setActiveRewardsCount] = useState<number>(0);
  const [loadingRewards, setLoadingRewards] = useState(true);

  // Usar el hook para obtener precios del local del manager
  const { 
    prices, 
    localInfo, 
    loading: loadingPrices, 
    refreshPrices,
    localId 
  } = useManagerLocalPrices(profile?.id || null);

  const { 
    totalOrders, 
    totalRevenue, 
    orderStatusStats, 
    loading: loadingStats, 
    refreshData 
  } = useLocalDashboardData(localId);

  useEffect(() => {
    if (profile?.role === 'local') {
      fetchActiveRewards();
    }
  }, [profile]);

  const fetchActiveRewards = async () => {
    setLoadingRewards(true);

    const { count, error } = await supabase
      .from('rewards')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching active rewards:', error);
    } else {
      setActiveRewardsCount(count || 0);
    }

    setLoadingRewards(false);
  };

  // Función para forzar la recarga del perfil después de una actualización
  const handleProfileUpdate = () => {
    // Confiar en SessionContext para recargar el perfil
  };

  // Condición estricta: solo si password_changed es false (creado por admin)
  const needsPasswordChange = profile && profile.password_changed === false;
  const pendingOrders = orderStatusStats.find(s => s.name === 'PENDING')?.value || 0;

  if (loadingPrices && !localInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    );
  }

  // Si no tiene local asignado
  if (!localInfo && !loadingPrices) {
    return (
      <PageWrapper centerContent={true} showFooter={true} showMadeWithDyad={true}>
        <AnimatedHeader title="Dashboard de Local" showSignOut={true} />
        <ContentCard className="w-full max-w-md p-6 text-center mt-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-text-carbon">Local No Asignado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Tu cuenta de manager no está asignada a ningún local. Por favor, contacta al administrador para que te asigne un local.
            </p>
            <Button onClick={signOut} className="bg-emphasis-red hover:bg-red-700 text-white hover-scale">
              Cerrar Sesión
            </Button>
          </CardContent>
        </ContentCard>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper showFooter={true} showMadeWithDyad={true}>
      <AnimatedHeader title={`Dashboard - ${localInfo?.name || 'Local'}`} />
      
      <main className="p-4">
        <div className="w-full max-w-6xl mx-auto pt-8 pb-12 space-y-6">
          <ContentCard className="p-8 space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-4xl font-bold text-text-carbon">Gestión de {localInfo?.name || 'Local'}</h1>
              <Button 
                onClick={() => {
                  refreshData();
                  refreshPrices();
                  fetchActiveRewards();
                }} 
                disabled={loadingStats || loadingRewards || loadingPrices}
                variant="outline"
                className="flex items-center gap-2 bg-white text-primary-blue border-primary-blue hover:bg-gray-100 hover-scale"
              >
                <RefreshCw className={`h-4 w-4 ${(loadingStats || loadingRewards || loadingPrices) ? 'animate-spin' : ''}`} />
                Actualizar Datos
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

              <TabsContent value="dashboard" className="mt-6 space-y-6">
                {/* Estadísticas rápidas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCardAnimated 
                    title="Ingresos (Completados)"
                    value={`$${totalRevenue.toFixed(2)}`}
                    icon={DollarSign}
                    color="text-success-green"
                    description="Pedidos completados históricamente"
                    delay={100}
                  />
                  <StatCardAnimated 
                    title="Total de Pedidos"
                    value={totalOrders}
                    icon={Package}
                    color="text-primary-blue"
                    description="Pedidos totales de este local"
                    delay={200}
                  />
                  <StatCardAnimated 
                    title="Pedidos Pendientes"
                    value={pendingOrders}
                    icon={Clock}
                    color="text-secondary-yellow"
                    description="Pedidos esperando ser procesados"
                    delay={300}
                  />
                  <StatCardAnimated 
                    title="Premios Activos"
                    value={activeRewardsCount}
                    icon={Gift}
                    color="text-purple-600"
                    description="Recompensas disponibles para canje"
                    delay={400}
                  />
                </div>

                {/* Lista de Precios Activos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ContentCard delay={500}>
                    <PriceList 
                      prices={prices}
                      loading={loadingPrices}
                      title={`Precios Activos - ${localInfo?.name}`}
                      description={
                        localInfo?.can_edit_prices 
                          ? "Precios personalizados de tu local (los marcados como 'Global' usan el precio base)"
                          : "Precios estándar"
                      }
                      showCustomBadge={localInfo?.can_edit_prices || false}
                    />
                  </ContentCard>

                  {/* Acciones Rápidas */}
                  <div className="space-y-4">
                    <ContentCard delay={600} className="bg-primary-blue/10 border-primary-blue shadow-md">
                      <CardHeader>
                        <CardTitle className="text-primary-blue flex items-center gap-2">
                          <Package className="h-5 w-5" /> Gestión de Pedidos
                        </CardTitle>
                        <CardDescription>Revisa y actualiza el estado de los pedidos de tu local.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col space-y-2">
                        <Button 
                          className="w-full bg-primary-blue hover:bg-blue-700 text-white hover-scale" 
                          onClick={() => navigate('/local/orders')}
                        >
                          Ver Todos los Pedidos
                        </Button>
                      </CardContent>
                    </ContentCard>

                    {localInfo?.can_edit_prices && (
                      <ContentCard delay={700} className="bg-success-green/10 border-success-green shadow-md">
                        <CardHeader>
                          <CardTitle className="text-success-green flex items-center gap-2">
                            <Edit className="h-5 w-5" /> Editar Precios
                          </CardTitle>
                          <CardDescription>Personaliza los precios de los servicios en tu local.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col space-y-2">
                          <Button 
                            className="w-full bg-success-green hover:bg-green-700 text-white hover-scale" 
                            onClick={() => navigate('/local/prices')}
                          >
                            Gestionar Precios Locales
                          </Button>
                        </CardContent>
                      </ContentCard>
                    )}

                    <ContentCard delay={800} className="bg-secondary-yellow/10 border-secondary-yellow shadow-md">
                      <CardHeader>
                        <CardTitle className="text-secondary-yellow flex items-center gap-2">
                          <Trophy className="h-5 w-5" /> Ranking de Clientes
                        </CardTitle>
                        <CardDescription>Consulta el ranking de clientes con más puntos en tu local.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full text-secondary-yellow border-secondary-yellow hover:bg-secondary-yellow/20 hover-scale" 
                          onClick={() => navigate('/local/reports')}
                        >
                          Ver Ranking y Reportes
                        </Button>
                      </CardContent>
                    </ContentCard>

                    <ContentCard delay={900} className="bg-purple-100 border-purple-600 shadow-md">
                      <CardHeader>
                        <CardTitle className="text-purple-600 flex items-center gap-2">
                          <Gift className="h-5 w-5" /> Catálogo de Premios
                        </CardTitle>
                        <CardDescription>Consulta los premios disponibles para tus clientes.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full text-purple-600 border-purple-600 hover:bg-purple-100 hover-scale" 
                          onClick={() => navigate('/local/rewards')}
                        >
                          Ver Catálogo ({activeRewardsCount})
                        </Button>
                      </CardContent>
                    </ContentCard>
                  </div>
                </div>
                
                {/* Ranking de Clientes */}
                <ContentCard delay={1000} className="lg:col-span-2">
                  <ClientRankingTable 
                    localId={localId || undefined}
                    title={`Top 10 Clientes de ${localInfo?.name || 'Tu Local'}`}
                    description="Clientes con más puntos que han realizado pedidos aquí."
                  />
                </ContentCard>
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <ProfileSettings onProfileUpdate={handleProfileUpdate} />
              </TabsContent>
            </Tabs>
          </ContentCard>
        </div>
      </main>
    </PageWrapper>
  );
};

export default LocalDashboard;