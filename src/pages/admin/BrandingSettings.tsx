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
import { ArrowLeft, Trash2 } from 'lucide-react';

const BrandingSettings = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [mainLogoUrl, setMainLogoUrl] = useState('');
  const [poweredByLogoUrl, setPoweredByLogoUrl] = useState('');
  const [poweredByLogoUrl2, setPoweredByLogoUrl2] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'admin') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/admin/dashboard');
      return;
    }
    
    if (initialLoadDone) return;

    const fetchBranding = async () => {
      setLoading(true);
      try {
        // Usar maybeSingle() para manejar el caso de que no haya filas sin lanzar 406
        const { data, error } = await supabase
          .from('branding')
          .select('main_logo_url, powered_by_logo_url, powered_by_logo_url_2')
          .maybeSingle();

        if (error) {
          console.error('Error fetching branding settings:', error);
          showError('Error al cargar la configuración de branding.');
        } else if (data) {
          setMainLogoUrl(data.main_logo_url || '');
          setPoweredByLogoUrl(data.powered_by_logo_url || '');
          setPoweredByLogoUrl2(data.powered_by_logo_url_2 || '');
        }
      } catch (err) {
        console.error('Unexpected error fetching branding:', err);
        showError('Error inesperado al cargar la configuración.');
      } finally {
        setLoading(false);
        setInitialLoadDone(true);
      }
    };

    if (!sessionLoading && profile?.role === 'admin') {
      fetchBranding();
    }
  }, [sessionLoading, profile, navigate, initialLoadDone]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Verificar si existe una configuración de branding (usando maybeSingle)
      const { data: existingBranding, error: fetchError } = await supabase
        .from('branding')
        .select('id')
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Error al verificar existencia: ${fetchError.message}`);
      }

      // Asegurarse de que las cadenas vacías se conviertan a null para Supabase
      const brandingData = { 
        main_logo_url: mainLogoUrl || null, 
        powered_by_logo_url: poweredByLogoUrl || null,
        powered_by_logo_url_2: poweredByLogoUrl2 || null,
        updated_at: new Date().toISOString() 
      };

      let error;
      if (existingBranding) {
        // Actualizar
        const { error: updateError } = await supabase
          .from('branding')
          .update(brandingData)
          .eq('id', existingBranding.id);
        error = updateError;
      } else {
        // Insertar
        const { error: insertError } = await supabase
          .from('branding')
          .insert(brandingData);
        error = insertError;
      }

      if (error) {
        console.error('Error saving branding settings:', error);
        showError('Error al guardar la configuración de branding.');
      } else {
        showSuccess('Configuración de branding guardada correctamente.');
      }
      
      // 2. Recargar datos para asegurar que los estados locales se actualicen con la DB (usando maybeSingle)
      const { data: updatedData } = await supabase
        .from('branding')
        .select('main_logo_url, powered_by_logo_url, powered_by_logo_url_2')
        .maybeSingle();
        
      if (updatedData) {
        setMainLogoUrl(updatedData.main_logo_url || '');
        setPoweredByLogoUrl(updatedData.powered_by_logo_url || '');
        setPoweredByLogoUrl2(updatedData.powered_by_logo_url_2 || '');
      }
    } catch (err) {
      console.error('Error inesperado en handleSave:', err);
      showError(err instanceof Error ? err.message : 'Error inesperado al guardar el branding.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogo = (setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter('');
    showSuccess('URL limpiada. Haz clic en "Guardar Configuración" para aplicar el cambio.');
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
            {/* Logo Principal */}
            <div>
              <Label htmlFor="mainLogoUrl" className="text-lg font-medium text-text-carbon mb-2 block">URL del Logo Principal</Label>
              <div className="flex gap-2">
                <Input
                  id="mainLogoUrl"
                  type="url"
                  value={mainLogoUrl}
                  onChange={(e) => setMainLogoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/logo_principal.png"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary-blue focus:border-primary-blue"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  onClick={() => handleClearLogo(setMainLogoUrl)}
                  disabled={!mainLogoUrl}
                  title="Borrar Logo"
                >
                  <Trash2 className="h-4 w-4 text-emphasis-red" />
                </Button>
              </div>
              {mainLogoUrl && (
                <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Vista previa del Logo Principal:</p>
                  <div className="flex justify-center">
                    <img src={mainLogoUrl} alt="Logo Principal" className="h-20 object-contain" />
                  </div>
                </div>
              )}
            </div>

            {/* Logo Powered By #1 */}
            <div>
              <Label htmlFor="poweredByLogoUrl" className="text-lg font-medium text-text-carbon mb-2 block">URL del Logo "Powered By" #1</Label>
              <div className="flex gap-2">
                <Input
                  id="poweredByLogoUrl"
                  type="url"
                  value={poweredByLogoUrl}
                  onChange={(e) => setPoweredByLogoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/powered_by_logo_1.png"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary-blue focus:border-primary-blue"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  onClick={() => handleClearLogo(setPoweredByLogoUrl)}
                  disabled={!poweredByLogoUrl}
                  title="Borrar Logo"
                >
                  <Trash2 className="h-4 w-4 text-emphasis-red" />
                </Button>
              </div>
              {poweredByLogoUrl && (
                <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Vista previa del Logo "Powered By" #1:</p>
                  <div className="flex justify-center">
                    <img src={poweredByLogoUrl} alt="Powered By Logo 1" className="h-12 object-contain" />
                  </div>
                </div>
              )}
            </div>

            {/* Logo Powered By #2 */}
            <div>
              <Label htmlFor="poweredByLogoUrl2" className="text-lg font-medium text-text-carbon mb-2 block">URL del Logo "Powered By" #2</Label>
              <div className="flex gap-2">
                <Input
                  id="poweredByLogoUrl2"
                  type="url"
                  value={poweredByLogoUrl2}
                  onChange={(e) => setPoweredByLogoUrl2(e.target.value)}
                  placeholder="https://ejemplo.com/powered_by_logo_2.png"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-primary-blue focus:border-primary-blue"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  onClick={() => handleClearLogo(setPoweredByLogoUrl2)}
                  disabled={!poweredByLogoUrl2}
                  title="Borrar Logo"
                >
                  <Trash2 className="h-4 w-4 text-emphasis-red" />
                </Button>
              </div>
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