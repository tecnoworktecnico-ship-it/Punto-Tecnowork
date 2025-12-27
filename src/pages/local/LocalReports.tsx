"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, BarChart, DollarSign, Package, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useLocalDashboardData } from '@/hooks/useDashboardData';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import StatusPieChart from '@/components/dashboard/StatusPieChart';
import OrderTrendChart from '@/components/dashboard/OrderTrendChart';
import ClientRankingTable from '@/components/dashboard/ClientRankingTable';
import PageWrapper from '@/components/PageWrapper';
import AnimatedHeader from '@/components/AnimatedHeader';
import ContentCard from '@/components/ContentCard';
import StatCardAnimated from '@/components/dashboard/StatCardAnimated';

const LocalReports = () => {
  const navigate = useNavigate();
  const { profile, loading: sessionLoading } = useSession();
  const [localData, setLocalData] = useState<any>(null);
  const [localId, setLocalId] = useState<string | null>(null);
  const [loadingLocal, setLoadingLocal] = useState(true);

  useEffect(() => {
    if (profile?.role === 'local') {
      fetchLocalData();
    }
  }, [profile]);

  const fetchLocalData = async () => {
    setLoadingLocal(true);

    const { data: local, error: localError } = await supabase
      .from('locals')
      .select('id, name')
      .eq('manager_id', profile?.id)
      .single();

    if (localError) {
      console.error('Error fetching local:', localError);
      showError('Error al cargar los datos del local.');
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
    orderTrends, 
    loading: loadingStats, 
    refreshData 
  } = useLocalDashboardData(localId);

  if (sessionLoading || loadingLocal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando reportes...</p>
      </div>
    );
  }

  if (profile?.role !== 'local' || !localData) {
    return null;
  }

  const pendingOrders = orderStatusStats.find(s => s.name === 'PENDING')?.value || 0;
  const completedOrders = orderStatusStats.find(s => s.name === 'COMPLETED')?.value || 0;

  return (
    <PageWrapper showFooter={true} showMadeWithDyad={true}>
      <AnimatedHeader 
        title={`Reportes - ${localData.name}`} 
        showSignOut={true} 
        showBackButton={true} 
        backPath="/local/dashboard"
      />
      
      <main className="p-4">
        <div className="max-w-6xl mx-auto space-y-6 pt-8 pb-12">
          
          <ContentCard delay={100}>
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-text-carbon flex items-center gap-2">
                <BarChart className="h-7 w-7 text-primary-blue" />
                Reportes y Estadísticas - {localData.name}
              </CardTitle>
              <CardDescription>Análisis detallado del rendimiento de tu local.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={refreshData} 
                disabled={loadingStats}
                variant="outline"
                className="flex items-center gap-2 bg-white text-primary-blue border-primary-blue hover:bg-gray-100 hover-scale"
              >
                <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
                Actualizar Datos
              </Button>
            </CardContent>
          </ContentCard>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCardAnimated 
              title="Ingresos Totales"
              value={`$${totalRevenue.toFixed(2)}`}
              icon={DollarSign}
              color="text-success-green"
              description={`Pedidos completados: ${completedOrders}`}
              delay={200}
            />
            <StatCardAnimated 
              title="Total de Pedidos"
              value={totalOrders}
              icon={Package}
              color="text-primary-blue"
              description="Pedidos totales recibidos"
              delay={300}
            />
            <StatCardAnimated 
              title="Pedidos Pendientes"
              value={pendingOrders}
              icon={Clock}
              color="text-secondary-yellow"
              description="Pedidos esperando ser procesados"
              delay={400}
            />
          </div>

          {/* Gráficos de Tendencia y Estado */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ContentCard delay={500}>
                <OrderTrendChart data={orderTrends} loading={loadingStats} />
              </ContentCard>
            </div>
            <ContentCard delay={600}>
              <StatusPieChart data={orderStatusStats} loading={loadingStats} />
            </ContentCard>
          </div>
          
          {/* Ranking de Clientes Local */}
          <ContentCard delay={700}>
            <ClientRankingTable 
              localId={localId}
              title={`Top 10 Clientes de ${localData.name}`}
              description="Ranking de clientes con más puntos que han realizado pedidos en tu local."
            />
          </ContentCard>
        </div>
      </main>
    </PageWrapper>
  );
};

export default LocalReports;