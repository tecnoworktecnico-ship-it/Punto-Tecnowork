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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranding = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('branding')
        .select(type === 'main' ? 'main_logo_url' : 'powered_by_logo_url')
        .single();

      if (error) {
        console.error('Error fetching branding:', error);
        setError('Error al cargar el logo.');
        setLogoUrl(null);
      } else if (data) {
        const url = type === 'main' ? data.main_logo_url : data.powered_by_logo_url;
        setLogoUrl(url);
      } else {
        setLogoUrl(null);
      }
      setLoading(false);
    };

    fetchBranding();
  }, [type]);

  if (loading) {
    return <Skeleton className={`h-12 w-32 ${className}`} />;
  }

  if (error) {
    return <div className={`text-red-500 text-sm ${className}`}>{error}</div>;
  }

  if (logoUrl) {
    return <img src={logoUrl} alt={type === 'main' ? "Main Logo" : "Powered By Logo"} className={className} />;
  }

  return null; // No logo to display
};

export default BrandingDisplay;