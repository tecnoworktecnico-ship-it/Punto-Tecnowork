"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  image_url: string | null;
  is_active: boolean;
}

interface UserPoints {
  points: number;
}

const ClientRewards = () => {
  const { profile, loading: sessionLoading, refreshProfile } = useSession();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

    // Obtener recompensas activas
    const { data: rewardsData, error: rewardsError } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_cost', { ascending: true });

    if (rewardsError) {
      console.error('Error fetching rewards:', rewardsError);
      showError('Error al cargar las recompensas.');
    } else {
      setRewards(rewardsData || []);
    }

    setLoading(false);
  };

  const handleRedeemClick = (reward: Reward) => {
    if (userPoints < reward.points_cost) {
      showError('No tienes suficientes puntos para canjear esta recompensa.');
      return;
    }
    setSelectedReward(reward);
    setDialogOpen(true);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedReward) return;

    setLoading(true);

    try {
      // Crear registro de canje
      const { error: redeemError } = await supabase
        .from('user_rewards')
        .insert({
          user_id: profile?.id,
          reward_id: selectedReward.id,
        });

      if (redeemError) {
        console.error('Error redeeming reward:', redeemError);
        showError('Error al canjear la recompensa.');
        setLoading(false);
        return;
      }

      // Actualizar puntos del usuario en profiles
      const newPoints = userPoints - selectedReward.points_cost;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', profile?.id);

      if (updateError) {
        console.error('Error updating points:', updateError);
        showError('Error al actualizar los puntos.');
        setLoading(false);
        return;
      }

      showSuccess(`¡Recompensa canjeada! Te quedan ${newPoints} puntos.`);
      setDialogOpen(false);
      setSelectedReward(null);
      
      // Refrescar el perfil para actualizar los puntos en el contexto
      await refreshProfile();
      fetchData();
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al canjear la recompensa.');
    }

    setLoading(false);
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando recompensas...</p>
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
              <div className="flex items-center gap-2 bg-secondary-yellow/20 px-4 py-2 rounded-lg">
                <Star className="h-6 w-6 text-secondary-yellow" />
                <span className="text-2xl font-bold text-text-carbon">
                  {userPoints} puntos
                </span>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon">
              Recompensas Disponibles
            </CardTitle>
            <CardDescription>
              Canjea tus puntos por increíbles recompensas
            </CardDescription>
          </CardHeader>
        </Card>

        {rewards.length === 0 ? (
          <Card className="bg-white rounded-lg shadow-lg">
            <CardContent className="py-12">
              <div className="text-center">
                <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No hay recompensas disponibles en este momento
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => {
              const canRedeem = userPoints >= reward.points_cost;
              
              return (
                <Card key={reward.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  {reward.image_url && (
                    <div className="h-48 bg-gray-200 overflow-hidden">
                      <img 
                        src={reward.image_url} 
                        alt={reward.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-text-carbon mb-2">
                      {reward.name}
                    </h3>
                    {reward.description && (
                      <p className="text-gray-600 text-sm mb-4">
                        {reward.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        <Star className="h-4 w-4 mr-1 text-secondary-yellow" />
                        {reward.points_cost} puntos
                      </Badge>
                      {!canRedeem && (
                        <span className="text-xs text-gray-500">
                          Te faltan {reward.points_cost - userPoints} pts
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() => handleRedeemClick(reward)}
                      disabled={!canRedeem}
                      className={`w-full ${
                        canRedeem
                          ? 'bg-primary-blue hover:bg-blue-700'
                          : 'bg-gray-300 cursor-not-allowed'
                      } text-white`}
                    >
                      {canRedeem ? 'Canjear' : 'Puntos Insuficientes'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Canje</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas canjear esta recompensa?
              </DialogDescription>
            </DialogHeader>
            {selectedReward && (
              <div className="py-4">
                <p className="text-lg font-semibold mb-2">{selectedReward.name}</p>
                <p className="text-gray-600 mb-4">{selectedReward.description}</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>Costo:</span>
                    <span className="font-bold text-secondary-yellow">
                      {selectedReward.points_cost} puntos
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Puntos restantes:</span>
                    <span className="font-bold">
                      {userPoints - selectedReward.points_cost} puntos
                    </span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setSelectedReward(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmRedeem}
                disabled={loading}
                className="bg-primary-blue hover:bg-blue-700 text-white"
              >
                {loading ? 'Canjeando...' : 'Confirmar Canje'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ClientRewards;
