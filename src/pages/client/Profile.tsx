"use client";

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Settings } from 'lucide-react';
import ProfileSettings from '@/components/ProfileSettings';
import { showError } from '@/utils/toast';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';

const ClientProfile = () => {
  const { profile, loading: sessionLoading, refreshProfile } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'client') {
      showError('Acceso denegado.');
      navigate('/client', { replace: true });
    }
  }, [sessionLoading, profile, navigate]);

  const handleProfileUpdate = () => {
    // Forzar la recarga del perfil en el contexto para reflejar los cambios
    refreshProfile();
  };

  if (sessionLoading || profile?.role !== 'client') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <AppHeader title="Mi Perfil" />
      
      <main className="flex-grow p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/client')}
            className="flex items-center gap-2 text-white hover:text-gray-200 hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver al Dashboard
          </Button>

          <Card className="bg-white rounded-lg shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-text-carbon flex items-center gap-2">
                <Settings className="h-7 w-7 text-primary-blue" />
                Mi Perfil
              </CardTitle>
              <CardDescription>
                Actualiza tus datos personales.
              </CardDescription>
            </CardHeader>
            <div className="p-6 pt-0">
              <ProfileSettings onProfileUpdate={handleProfileUpdate} />
            </div>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ClientProfile;
