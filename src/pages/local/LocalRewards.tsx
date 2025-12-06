"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Star, Loader2 } from 'lucide-react';

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  image_url: string | null;
  is_active: boolean;
}

const LocalRewards = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'local') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/local/dashboard');
    }

    if (!sessionLoading && profile?.role === 'local') {
      fetchRewards();
    }
  }, [sessionLoading, profile, navigate]);

  const fetchRewards = async () => {
    setLoading(true);

    // Obtener recompensas activas (son globales)
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

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
        <p className="text-white text-xl ml-2">Cargando recompensas...</p>
      </div>
    );
  }

  if (profile?.role !== 'local') {
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
                onClick={() => navigate('/local/dashboard')}
                className="flex items-center gap-2 text-text-carbon hover:text-primary-blue"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver al Dashboard
              </Button>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon flex items-center gap-2">
                <Gift className="h-7 w-7 text-primary-blue" />
                Catálogo de Recompensas
            </CardTitle>
            <CardDescription>
              Recompensas disponibles para canje por los clientes.
            </CardDescription>
          </CardHeader>
        </Card>

        {rewards.length === 0 ? (
          <Card className="bg-white rounded-lg shadow-lg">
            <CardContent className="py-12">
              <div className="text-center">
                <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No hay recompensas activas en el catálogo.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => (
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
                  </div>
                  <Button
                    disabled
                    className="w-full bg-gray-300 cursor-not-allowed text-gray-700"
                  >
                    Solo para Clientes
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalRewards;