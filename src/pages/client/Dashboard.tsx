"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
// CORRECCIÓN: Se agrega Loader2 al import de lucide-react
import { Settings, LayoutDashboard, Star, Gift, ShoppingBag, Sparkles, DollarSign, Clock, Package, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ClientStats {
  points: number;
  total_orders: number;
  total_spent: number;
}

const ClientDashboard = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ClientStats>({
    points: 0,
    total_orders: 0,
    total_spent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && profile) {
      if (profile.role !== 'client') {
        navigate('/login');
        return;
      }
      fetchClientStats();
    }
  }, [sessionLoading, profile, navigate]);

  const fetchClientStats = async () => {
    try {
      if (!profile) return;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_price, points_earned')
        .eq('client_id', profile.id)
        .eq('status', 'completed'); // Solo contamos órdenes completadas para estadísticas

      if (error) throw error;

      const totalSpent = orders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      
      // Los puntos vienen directamente del perfil, pero podemos verificar contra el historial
      // Usaremos el perfil ya que es la fuente de la verdad para puntos actuales
      setStats({
        points: profile.points || 0,
        total_orders: totalOrders,
        total_spent: totalSpent
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      // No mostramos error invasivo aquí para no asustar al usuario en el dashboard
    } finally {
      setLoading(false);
    }
  };

  const getPointsProgress = () => {
    // Lógica simple de gamificación: cada 1000 puntos es un "nivel"
    const currentPoints = stats.points;
    const nextLevel = Math.ceil((currentPoints + 1) / 1000) * 1000;
    const progress = (currentPoints % 1000) / 1000 * 100;
    return { progress, nextLevel, remaining: nextLevel - currentPoints };
  };

  const { progress, nextLevel, remaining } = getPointsProgress();

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600">
        <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
        <p className="text-white text-lg">Cargando tu espacio...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-primary-blue to-blue-600 text-white p-6 pb-24 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 opacity-90">
               <LayoutDashboard className="h-5 w-5" />
               <span className="text-sm uppercase tracking-wider font-semibold">Panel de Cliente</span>
            </div>
            <h1 className="text-3xl font-bold">¡Hola, {profile?.first_name}! 👋</h1>
            <p className="text-blue-100 mt-1">Bienvenido a tu centro de control de impresiones.</p>
          </div>
          <Button 
            variant="secondary" 
            className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm"
            onClick={() => navigate('/client/profile')}
          >
            <Settings className="h-4 w-4 mr-2" /> Mi Perfil
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 space-y-8">
        
        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tarjeta de Puntos */}
          <Card className="shadow-xl border-none ring-1 ring-gray-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Star className="h-24 w-24 text-yellow-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary-blue" />
                Mis Puntos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-800">{stats.points}</span>
                <span className="text-sm text-gray-500">pts</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progreso nivel</span>
                  <span>Faltan {remaining} pts</span>
                </div>
                <Progress value={progress} className="h-2 bg-gray-100" indicatorClassName="bg-yellow-400" />
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta de Pedidos */}
          <Card className="shadow-xl border-none ring-1 ring-gray-100">
             <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-purple-500" />
                Pedidos Completados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-800">{stats.total_orders}</span>
                <span className="text-sm text-gray-500">pedidos</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Gracias por confiar en nosotros.
              </p>
            </CardContent>
          </Card>

          {/* Tarjeta de Ahorro/Gasto */}
          <Card className="shadow-xl border-none ring-1 ring-gray-100">
             <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Inversión Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-800">${stats.total_spent.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
                <Sparkles className="h-3 w-3" />
                <span>Cliente VIP</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-primary-blue to-blue-700 text-white border-none shadow-lg">
            <CardContent className="p-6 flex flex-col items-start justify-between h-full space-y-4">
              <div>
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-2">Nuevo</Badge>
                <h3 className="text-2xl font-bold mb-1">Nuevo Pedido</h3>
                <p className="text-blue-100 text-sm">Sube tus archivos PDF y retira en el local que prefieras.</p>
              </div>
              <Button 
                onClick={() => navigate('/client/new-order')}
                className="w-full bg-white text-primary-blue hover:bg-gray-100 font-bold"
              >
                <Package className="h-4 w-4 mr-2" /> Crear Pedido
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200" onClick={() => navigate('/client/orders')}>
             <CardContent className="p-6 flex items-center justify-between h-full">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">Mis Pedidos</h3>
                <p className="text-gray-500 text-sm">Revisa el estado de tus impresiones recientes.</p>
              </div>
              <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default ClientDashboard;