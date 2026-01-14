"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, TrendingUp, Gift, ShoppingBag } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UserReward {
  id: string;
  reward_id: string;
  redeemed_at: string;
  rewards: {
    name: string;
    points_cost: number;
  };
}

interface Order {
  id: string;
  points_earned: number;
  created_at: string;
  total_price: number;
}

const ClientPoints = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [userPoints, setUserPoints] = useState<number>(0);
  const [redeemedRewards, setRedeemedRewards] = useState<UserReward[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'client') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/client');
    }

    if (!sessionLoading && profile?.role === 'client') {
      fetchData();
    }
  }, [sessionLoading, profile, navigate]);

  const fetchData = async () => {
    setLoading(true);

    // Obtener puntos del perfil del usuario (ya los tenemos en profile.points)
    setUserPoints(profile?.points || 0);

    // Obtener recompensas canjeadas
    const { data: rewardsData, error: rewardsError } = await supabase
      .from('user_rewards')
      .select(`
        *,
        rewards (
          name,
          points_cost
        )
      `)
      .eq('user_id', profile?.id)
      .order('redeemed_at', { ascending: false });

    if (rewardsError) {
      console.error('Error fetching redeemed rewards:', rewardsError);
    } else {
      setRedeemedRewards(rewardsData || []);
    }

    // Obtener pedidos con puntos ganados
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, points_earned, created_at, total_price')
      .eq('client_id', profile?.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
    } else {
      setOrders(ordersData || []);
    }

    setLoading(false);
  };

  const calculateTotalEarned = () => {
    return orders.reduce((total, order) => total + order.points_earned, 0);
  };

  const calculateTotalSpent = () => {
    return redeemedRewards.reduce((total, reward) => total + reward.rewards.points_cost, 0);
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando información de puntos...</p>
      </div>
    );
  }

  if (profile?.role !== 'client') {
    return null;
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white rounded-lg shadow-lg mb-6">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/client')}
                className="flex items-center gap-2 text-text-carbon hover:text-primary-blue"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver al Dashboard
              </Button>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon">
              Mis Puntos
            </CardTitle>
            <CardDescription>
              Historial de puntos ganados y canjeados
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Resumen de Puntos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-secondary-yellow/10 border-secondary-yellow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Puntos Actuales</p>
                  <p className="text-4xl font-bold text-text-carbon">{userPoints}</p>
                </div>
                <Star className="h-12 w-12 text-secondary-yellow" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-success-green/10 border-success-green">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Ganados</p>
                  <p className="text-4xl font-bold text-text-carbon">{calculateTotalEarned()}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-success-green" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary-blue/10 border-primary-blue">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Canjeados</p>
                  <p className="text-4xl font-bold text-text-carbon">{calculateTotalSpent()}</p>
                </div>
                <Gift className="h-12 w-12 text-primary-blue" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historial de Puntos Ganados */}
        <Card className="bg-white rounded-lg shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-text-carbon flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-success-green" />
              Puntos Ganados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No has ganado puntos aún. ¡Realiza tu primer pedido!
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>ID Pedido</TableHead>
                    <TableHead>Total Pedido</TableHead>
                    <TableHead className="text-right">Puntos Ganados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {order.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        ${order.total_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-success-green/10 text-success-green">
                          +{order.points_earned} pts
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Historial de Recompensas Canjeadas */}
        <Card className="bg-white rounded-lg shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-text-carbon flex items-center gap-2">
              <Gift className="h-6 w-6 text-primary-blue" />
              Recompensas Canjeadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {redeemedRewards.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No has canjeado recompensas aún.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Recompensa</TableHead>
                    <TableHead className="text-right">Puntos Usados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redeemedRewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell>
                        {new Date(reward.redeemed_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {reward.rewards.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-primary-blue/10 text-primary-blue">
                          -{reward.rewards.points_cost} pts
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientPoints;
