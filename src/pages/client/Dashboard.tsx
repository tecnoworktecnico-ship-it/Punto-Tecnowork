"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Settings, Star, Gift, ShoppingBag, Sparkles, DollarSign, Clock, Package, Loader2, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';

interface ClientStats {
  points: number;
  total_orders: number;
  total_spent: number;
}

const ClientDashboard = () => {
  const { profile, loading: sessionLoading, refreshProfile } = useSession();
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

      // Obtener estadísticas de pedidos completados
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_price, points_earned')
        .eq('client_id', profile.id)
        .eq('status', 'completed'); 

      if (error) {
        console.error('Error fetching orders:', error);
      }

      const totalSpent = orders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      
      // Los puntos vienen del perfil (ya están cargados en el contexto)
      setStats({
        points: profile.points || 0,
        total_orders: totalOrders,
        total_spent: totalSpent
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar puntos cuando cambie el perfil
  useEffect(() => {
    if (profile) {
      setStats(prev => ({
        ...prev,
        points: profile.points || 0
      }));
    }
  }, [profile?.points]);

  const getPointsProgress = () => {
    const currentPoints = stats.points;
    const nextLevel = Math.ceil((currentPoints + 1) / 1000) * 1000;
    const progress = (currentPoints % 1000) / 1000 * 100;
    return { progress, nextLevel, remaining: nextLevel - currentPoints };
  };

  const { progress, nextLevel, remaining } = getPointsProgress();
  
  // Verificar si faltan datos clave
  const needsDataUpdate = !profile?.first_name || !profile?.phone_number;

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600">
        <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
        <p className="text-white text-lg">Cargando tu espacio...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header con AppHeader */}
      <AppHeader title="Mi Panel" />

      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-primary-blue to-blue-600 text-white p-6 pb-24 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold">¡Hola, {profile?.first_name || 'Cliente'}! 👋</h1>
          <p className="text-blue-100 mt-1">Bienvenido a tu centro de control de impresiones.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 space-y-8 flex-grow pb-8">
        
        {/* Alerta de Datos Incompletos */}
        {needsDataUpdate && (
          <Alert className="bg-secondary-yellow/10 border-secondary-yellow text-secondary-yellow">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-bold">¡Información Incompleta!</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span>
                Por favor, completa tu nombre y número de teléfono en tu perfil para una mejor experiencia.
              </span>
              <Button 
                onClick={() => navigate('/client/profile')} 
                className="bg-secondary-yellow hover:bg-yellow-600 text-text-carbon ml-0 sm:ml-4 mt-2 sm:mt-0"
              >
                Ir a Perfil
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
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

        {/* Acciones adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200" onClick={() => navigate('/client/profile')}>
            <CardContent className="p-6 flex items-center justify-between h-full">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">Mi Perfil</h3>
                <p className="text-gray-500 text-sm">Actualiza tus datos personales.</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Settings className="h-6 w-6 text-primary-blue" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200" onClick={() => navigate('/client/rewards')}>
            <CardContent className="p-6 flex items-center justify-between h-full">
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">Canjear Puntos</h3>
                <p className="text-gray-500 text-sm">Descubre los premios disponibles.</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Gift className="h-6 w-6 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ClientDashboard;
