"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import ProfileSettings from '@/components/ProfileSettings';
import PasswordChangeAlert from '@/components/PasswordChangeAlert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, LayoutDashboard, Star, Gift, ShoppingBag, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import Footer from '@/components/Footer';
import AppHeader from '@/components/AppHeader'; // Importar AppHeader

interface FeaturedReward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  image_url: string | null;
}

const ClientDashboard = () => {
  const { user, profile, signOut, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [featuredRewards, setFeaturedRewards] = useState<FeaturedReward[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [totalRewardsCount, setTotalRewardsCount] = useState(0);

  const fetchUserPoints = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingPoints(true);

    const { data: pointsData, error: pointsError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', profile.id)
      .single();

    if (pointsError && pointsError.code !== 'PGRST116') {
      console.error('Error fetching user points:', pointsError);
      showError('Error al cargar tus puntos.');
      setUserPoints(0);
    } else {
      setUserPoints(pointsData?.points || 0);
    }
    setLoadingPoints(false);
  }, [profile?.id]);

  const fetchFeaturedRewards = useCallback(async () => {
    setLoadingRewards(true);

    // Obtener los 3 premios más económicos (más accesibles)
    const { data: rewardsData, error: rewardsError } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_cost', { ascending: true })
      .limit(3);

    if (rewardsError) {
      console.error('Error fetching featured rewards:', rewardsError);
    } else {
      setFeaturedRewards(rewardsData || []);
    }

    // Obtener el total de premios activos
    const { count, error: countError } = await supabase
      .from('rewards')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (!countError) {
      setTotalRewardsCount(count || 0);
    }

    setLoadingRewards(false);
  }, []);

  useEffect(() => {
    if (!sessionLoading && profile?.role === 'client') {
      fetchUserPoints();
      fetchFeaturedRewards();
    }
  }, [sessionLoading, profile, fetchUserPoints, fetchFeaturedRewards]);

  // Función para forzar la recarga del perfil después de una actualización
  const handleProfileUpdate = () => {
    // Confiar en SessionContext para recargar el perfil
  };

  // Condición estricta: solo si password_changed es false (creado por admin)
  const needsPasswordChange = profile && profile.password_changed === false;
  
  const displayName = profile?.first_name || user?.email;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <AppHeader title={`Bienvenido, ${displayName}!`} />
      
      <main className="flex-grow p-4">
        <div className="w-full max-w-6xl mx-auto p-8 space-y-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold text-text-carbon">Tu Centro de Cliente</h1>
          </div>
          
          {needsPasswordChange && (
            <PasswordChangeAlert onNavigateToSettings={() => setActiveTab('settings')} />
          )}

          {/* Tarjeta de Puntos Destacada */}
          <Card className="bg-secondary-yellow/20 border-secondary-yellow shadow-xl">
            <CardContent className="p-6 flex justify-between items-center flex-wrap gap-4">
              <div>
                <p className="text-xl font-semibold text-text-carbon mb-1">Tus Puntos Actuales</p>
                {loadingPoints ? (
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Star className="h-8 w-8 text-secondary-yellow fill-secondary-yellow" />
                    <span className="text-5xl font-extrabold text-text-carbon">
                      {userPoints}
                    </span>
                  </div>
                )}
              </div>
              <Button 
                onClick={() => navigate('/client/rewards')}
                className="bg-primary-blue hover:bg-blue-700 text-white text-lg px-6 py-3 flex items-center gap-2"
              >
                <Gift className="h-6 w-6" />
                Canjear Recompensas
              </Button>
            </CardContent>
          </Card>

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
              <p className="text-xl text-gray-600">Tu centro de gestión de pedidos y recompensas.</p>

              {/* Sección de Premios Destacados */}
              {!loadingRewards && featuredRewards.length > 0 && (
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-purple-700 flex items-center gap-2">
                      <Sparkles className="h-6 w-6" />
                      ¡Premios Destacados!
                    </CardTitle>
                    <CardDescription className="text-purple-600">
                      Canjea tus puntos por increíbles recompensas. {totalRewardsCount > 3 && `¡Hay ${totalRewardsCount} premios disponibles!`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {featuredRewards.map((reward) => {
                        const canAfford = userPoints !== null && userPoints >= reward.points_cost;
                        
                        return (
                          <Card 
                            key={reward.id} 
                            className={`overflow-hidden transition-all hover:shadow-xl ${canAfford ? 'border-success-green border-2' : 'border-gray-200'}`}
                          >
                            {reward.image_url && (
                              <div className="h-32 bg-gray-100 overflow-hidden">
                                <img 
                                  src={reward.image_url} 
                                  alt={reward.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <CardContent className="p-4">
                              <h4 className="font-bold text-lg text-text-carbon mb-2 line-clamp-1">
                                {reward.name}
                              </h4>
                              {reward.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                  {reward.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant={canAfford ? "default" : "secondary"}
                                  className={`${canAfford ? 'bg-success-green' : 'bg-gray-400'} text-white`}
                                >
                                  <Star className="h-3 w-3 mr-1" />
                                  {reward.points_cost} pts
                                </Badge>
                                {canAfford && (
                                  <span className="text-xs text-success-green font-semibold">
                                    ¡Puedes canjearlo!
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    <div className="mt-4 text-center">
                      <Button 
                        onClick={() => navigate('/client/rewards')}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Ver Todos los Premios ({totalRewardsCount})
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gray-50 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-primary-blue flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5" /> Mis Pedidos
                    </CardTitle>
                    <CardDescription>Revisa el estado de tus pedidos y tu historial.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col space-y-2">
                    <Button className="w-full" onClick={() => navigate('/client/new-order')}>
                      Realizar Nuevo Pedido
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => navigate('/client/orders')}>
                      Ver Mis Pedidos
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gray-50 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-primary-blue flex items-center gap-2">
                      <Star className="h-5 w-5" /> Puntos y Recompensas
                    </CardTitle>
                    <CardDescription>Consulta tu historial de puntos y canjes.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col space-y-2">
                    <Button variant="outline" className="w-full" onClick={() => navigate('/client/rewards')}>
                      Ver Recompensas Disponibles
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => navigate('/client/points')}>
                      Historial de Puntos
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <ProfileSettings onProfileUpdate={handleProfileUpdate} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ClientDashboard;