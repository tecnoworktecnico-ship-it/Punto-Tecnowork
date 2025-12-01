"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface BrandingDisplayProps {
  type: 'main' | 'poweredBy';
  className?: string;
}

const BrandingDisplay: React.FC<BrandingDisplayProps> = ({ type, className }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // No necesitamos un estado de error explícito para la UI si siempre mostramos el fallback
  // pero mantenemos el console.error para depuración.

  useEffect(() => {
    const fetchBranding = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('branding')
        .select(type === 'main' ? 'main_logo_url' : 'powered_by_logo_url')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 significa que no se encontraron filas, lo cual es esperado si no hay branding
        console.error('Error fetching branding:', error);
        setLogoUrl(null); // Asegurarse de que sea null para activar el fallback
      } else if (data) {
        const url = type === 'main' ? data.main_logo_url : data.powered_by_logo_url;
        setLogoUrl(url);
      } else {
        setLogoUrl(null); // No hay datos o error PGRST116, así que no hay logo
      }
      setLoading(false);
    };

    fetchBranding();
  }, [type]);

  if (loading) {
    return <Skeleton className={`h-12 w-32 ${className}`} />;
  }

  if (logoUrl) {
    return <img src={logoUrl} alt={type === 'main' ? "Main Logo" : "Powered By Logo"} className={className} />;
  }

  // Si no hay logoUrl (ya sea porque no se ha subido o hubo un error de carga),
  // mostramos "Tecnowork" como fallback.
  return (
    <div className={`flex items-center justify-center font-bold text-text-carbon text-xl ${className}`}>
      Tecnowork
    </div>
  );
};

export default BrandingDisplay;