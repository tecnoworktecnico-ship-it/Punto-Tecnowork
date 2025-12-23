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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchBranding = async (currentAttempt: number) => {
      if (!isMounted) return;
      
      setLoading(true);
      
      const selectColumn = type === 'main' 
        ? 'main_logo_url' 
        : type === 'poweredBy' 
          ? 'powered_by_logo_url' 
          : 'powered_by_logo_url_2';

      try {
        const { data, error } = await supabase
          .from('branding')
          .select(selectColumn)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.error(`Error fetching branding (Attempt ${currentAttempt + 1}):`, error);
          
          if (currentAttempt < 1) { // Intentar una vez más
            timeoutId = setTimeout(() => {
              setAttempt(currentAttempt + 1);
            }, 1000);
            return;
          }
          
          setLogoUrl(null);
        } else if (data) {
          const url = data[selectColumn as keyof typeof data];
          setLogoUrl(url || null);
        } else {
          setLogoUrl(null);
        }
      } catch (err) {
        console.error(`Unexpected error fetching branding (Attempt ${currentAttempt + 1}):`, err);
        if (currentAttempt < 1) {
          timeoutId = setTimeout(() => {
            setAttempt(currentAttempt + 1);
          }, 1000);
          return;
        }
        setLogoUrl(null);
      } finally {
        if (isMounted && currentAttempt >= 1) {
          setLoading(false);
        } else if (isMounted && currentAttempt === 0 && !timeoutId) {
          // Si la primera carga fue exitosa
          setLoading(false);
        }
      }
    };

    fetchBranding(attempt);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [type, attempt]);

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