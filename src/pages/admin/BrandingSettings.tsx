"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BrandingSettings = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [mainLogoUrl, setMainLogoUrl] = useState('');
  const [poweredByLogoUrl, setPoweredByLogoUrl] = useState('');
  const [poweredByLogoUrl2, setPoweredByLogoUrl2] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'admin') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/admin/dashboard');
    }

    const fetchBranding = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('branding')
        .select('main_logo_url, powered_by_logo_url, powered_by_logo_url_2')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching branding settings:', error);
        showError('Error al cargar la configuración de branding.');
      } else if (data) {
        setMainLogoUrl(data.main_logo_url || '');
        setPoweredByLogoUrl(data.powered_by_logo_url || '');
        setPoweredByLogoUrl2(data.powered_by_logo_url_2 || '');
      }
      setLoading(false);
    };

    if (!sessionLoading && profile?.role === 'admin') {
      fetchBranding();
    }
  }, [sessionLoading, profile, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: existingBranding, error: fetchError } = await supabase
      .from('branding')
      .select('id')
      .single();

    let error;
    if (existingBranding) {
      const { error: updateError } = await supabase
        .from('branding')
        .update({ 
          main_logo_url: mainLogoUrl, 
          powered_by_logo_url: poweredByLogoUrl,
          powered_by_logo_url_2: poweredByLogoUrl2,
          updated_at: new Date().toISOString() 
        })
        .eq('id', existingBranding.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('branding')
        .insert({ 
          main_logo_url: mainLogoUrl, 
          powered_by_logo_url: poweredByLogoUrl,
          powered_by_logo_url_2: poweredByLogoUrl2
        });
      error = insertError;
    }

    if (error) {
      console.error('Error saving branding settings:', error);
      showError('Error al guardar la configuración de branding.');
    } else {
      showSuccess('Configuración de branding guardada correctamente.');
    }
    setLoading(false);
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando configuración de branding...</p>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <Card className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2 text-text-carbon hover:text-primary-blue"
            >
              <ArrowLeft className="h-5 w-5" />
              Volver al Dashboard
            </Button>
          </div>
          <CardTitle className="text-3xl font-bold text-text-carbon text-center">Configuración de Branding</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <Label htmlFor="mainLogoUrl" className="text-lg font-medium text-text-carbon mb-2 block">URL del Logo Principal</Label>
              <Input
                id="mainLogoUrl"
                type="url"
                value={mainLogoUrl}
                onChange={(e) => setMainLogoUrl(e.target.value)}
                placeholder="https://ejemplo.com/logo_principal.png"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary-blue focus:border-primary-blue"
              />
              {mainLogoUrl && (
                <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Vista previa del Logo Principal:</p>
                  <div className="flex justify-center">
                    <img src={mainLogoUrl} alt="Logo Principal" className="h-20 object-contain" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="poweredByLogoUrl" className="text-lg font-medium text-text-carbon mb-2 block">URL del Logo "Powered By" #1</Label>
              <Input
                id="poweredByLogoUrl"
                type="url"
                value={poweredByLogoUrl}
                onChange={(e) => setPoweredByLogoUrl(e.target.value)}
                placeholder="https://ejemplo.com/powered_by_logo_1.png"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary-blue focus:border-primary-blue"
              />
              {poweredByLogoUrl && (
                <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Vista previa del Logo "Powered By" #1:</p>
                  <div className="flex justify-center">
                    <img src={poweredByLogoUrl} alt="Powered By Logo 1" className="h-12 object-contain" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="poweredByLogoUrl2" className="text-lg font-medium text-text-carbon mb-2 block">URL del Logo "Powered By" #2</Label>
              <Input
                id="poweredByLogoUrl2"
                type="url"
                value={poweredByLogoUrl2}
                onChange={(e) => setPoweredByLogoUrl2(e.target.value)}
                placeholder="https://ejemplo.com/powered_by_logo_2.png"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary-blue focus:border-primary-blue"
              />
              {poweredByLogoUrl2 && (
                <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Vista previa del Logo "Powered By" #2:</p>
                  <div className="flex justify-center">
                    <img src={poweredByLogoUrl2} alt="Powered By Logo 2" className="h-12 object-contain" />
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-primary-blue hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md">
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandingSettings;