"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface BrandingDisplayProps {
  type: 'main' | 'poweredBy' | 'poweredBy2';
  className?: string;
}

const BrandingDisplay: React.FC<BrandingDisplayProps> = ({ type, className }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      setLoading(true);
      
      const selectColumn = type === 'main' 
        ? 'main_logo_url' 
        : type === 'poweredBy' 
          ? 'powered_by_logo_url' 
          : 'powered_by_logo_url_2';

      const { data, error } = await supabase
        .from('branding')
        .select(selectColumn)
        .maybeSingle(); // Usar maybeSingle para manejar el caso de no haber filas

      if (error) {
        console.error('Error fetching branding:', error);
        setLogoUrl(null);
      } else if (data) {
        // La columna seleccionada es dinámica, accedemos a ella por su nombre
        const url = data[selectColumn as keyof typeof data];
        setLogoUrl(url || null);
      } else {
        setLogoUrl(null); // No hay datos
      }
      setLoading(false);
    };

    fetchBranding();
  }, [type]);

  if (loading) {
    return <Skeleton className={`h-12 w-32 ${className}`} />;
  }

  if (logoUrl) {
    return <img src={logoUrl} alt={type === 'main' ? "Main Logo" : `Powered By Logo ${type.slice(-1)}`} className={className} />;
  }

  // Si no hay logoUrl, mostramos "Tecnowork" como fallback.
  return (
    <div className={`flex items-center justify-center font-bold text-text-carbon text-xl ${className}`}>
      Tecnowork
    </div>
  );
};

export default BrandingDisplay;