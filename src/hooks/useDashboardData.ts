"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface Stat {
  name: string;
  value: number;
}

interface OrderTrend {
  date: string;
  count: number;
}

interface LocalStat {
  local_name: string;
  total_revenue: number;
  completed_orders: number;
}

interface DashboardData {
  totalOrders: number;
  totalRevenue: number;
  totalClients: number;
  orderStatusStats: Stat[];
  orderTrends: OrderTrend[];
  localPerformance: LocalStat[];
  loading: boolean;
}

const initialData: DashboardData = {
  totalOrders: 0,
  totalRevenue: 0,
  totalClients: 0,
  orderStatusStats: [],
  orderTrends: [],
  localPerformance: [],
  loading: true,
};

// Función auxiliar para obtener el inicio del mes
const getStartOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

// Función auxiliar para obtener el inicio de la semana (Lunes)
const getStartOfWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que Lunes sea el día 1
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

const fetchAdminData = async (setLoading: (l: boolean) => void, setData: (d: DashboardData) => void) => {
  setLoading(true);

  try {
    // 1. Total de Clientes (Usuarios con rol 'client')
    const { count: totalClients, error: clientsError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'client');

    if (clientsError) throw clientsError;

    // 2. Estadísticas de Pedidos (Total, Ingresos, Estado)
    // MODIFICADO: Incluir join con locals(name) y local_id para calcular localPerformance
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total_price, created_at, local_id, locals(name)');

    if (ordersError) throw ordersError;

    // Total Pedidos: Contar todos los registros que NO estén 'cancelled'
    const nonCancelledOrders = ordersData.filter(o => o.status !== 'cancelled');
    const totalOrders = nonCancelledOrders.length;
    
    // Ingresos Totales: Solo pedidos completados
    const totalRevenue = ordersData
      .filter(o => o.status === 'completed')
      .reduce((sum, order) => sum + order.total_price, 0);

    const statusCounts = ordersData.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const orderStatusStats: Stat[] = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value,
    }));

    // 3. Tendencia de Pedidos (Últimos 7 días)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentOrders = ordersData.filter(o => new Date(o.created_at) >= oneWeekAgo);
    
    const trendCounts = recentOrders.reduce((acc, order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const orderTrends: OrderTrend[] = Object.entries(trendCounts).map(([date, count]) => ({
      date,
      count,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Rendimiento por Local (Ingresos y Pedidos Completados) - Lógica corregida
    const localStatsMap = new Map<string, { total_revenue: number, completed_orders: number, local_name: string }>();

    ordersData.forEach(order => {
        if (order.local_id) {
            // Acceso seguro al nombre del local (Join de Supabase)
            const localName = (order.locals as { name: string } | null)?.name || 'Local Desconocido';
            
            if (!localStatsMap.has(localName)) {
                localStatsMap.set(localName, { local_name: localName, total_revenue: 0, completed_orders: 0 });
            }
            
            const stats = localStatsMap.get(localName)!;
            
            // Contar solo pedidos completados para revenue y completed_orders
            if (order.status === 'completed') {
                stats.total_revenue += order.total_price;
                stats.completed_orders += 1;
            }
        }
    });

    const localPerformance: LocalStat[] = Array.from(localStatsMap.values()).map(stats => ({
        local_name: stats.local_name,
        total_revenue: stats.total_revenue,
        completed_orders: stats.completed_orders,
    }));
    
    // Ordenar por ingresos totales
    localPerformance.sort((a, b) => b.total_revenue - a.total_revenue);


    setData({
      totalOrders,
      totalRevenue,
      totalClients: totalClients || 0,
      orderStatusStats,
      orderTrends,
      localPerformance,
      loading: false,
    });

  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    showError('Error al cargar las estadísticas del administrador.');
    setData({ ...initialData, loading: false });
  }
};

const fetchLocalData = async (localId: string, setLoading: (l: boolean) => void, setData: (d: DashboardData) => void) => {
  setLoading(true);

  try {
    // 1. Estadísticas de Pedidos (Total, Ingresos, Estado)
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total_price, created_at')
      .eq('local_id', localId);

    if (ordersError) throw ordersError;

    // Total Pedidos: Contar todos los registros que NO estén 'cancelled'
    const nonCancelledOrders = ordersData.filter(o => o.status !== 'cancelled');
    const totalOrders = nonCancelledOrders.length;
    
    // Ingresos Totales: Solo pedidos completados
    const totalRevenue = ordersData
      .filter(o => o.status === 'completed')
      .reduce((sum, order) => sum + order.total_price, 0);

    const statusCounts = ordersData.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const orderStatusStats: Stat[] = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value,
    }));

    // 2. Tendencia de Pedidos (Últimos 7 días)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentOrders = ordersData.filter(o => new Date(o.created_at) >= oneWeekAgo);
    
    const trendCounts = recentOrders.reduce((acc, order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const orderTrends: OrderTrend[] = Object.entries(trendCounts).map(([date, count]) => ({
      date,
      count,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    setData({
      totalOrders,
      totalRevenue,
      totalClients: 0, // No relevante para el dashboard local
      orderStatusStats,
      orderTrends,
      localPerformance: [], // No relevante para el dashboard local
      loading: false,
    });

  } catch (error) {
    console.error('Error fetching local dashboard data:', error);
    showError('Error al cargar las estadísticas del local.');
    setData({ ...initialData, loading: false });
  }
};


export const useAdminDashboardData = () => {
  const [data, setData] = useState<DashboardData>(initialData);
  
  const refreshData = useCallback(() => {
    fetchAdminData(l => setData(prev => ({ ...prev, loading: l })), setData);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return { ...data, refreshData };
};

export const useLocalDashboardData = (localId: string | null) => {
  const [data, setData] = useState<DashboardData>(initialData);
  
  const refreshData = useCallback(() => {
    if (localId) {
      fetchLocalData(localId, l => setData(prev => ({ ...prev, loading: l })), setData);
    } else {
      setData({ ...initialData, loading: false });
    }
  }, [localId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return { ...data, refreshData };
};