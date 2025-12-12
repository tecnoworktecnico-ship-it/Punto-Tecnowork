"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { PriceItem } from '@/components/PriceList';

interface LocalInfo {
  id: string;
  name: string;
  has_photo_print: boolean;
  can_edit_prices: boolean;
}

interface UseLocalPricesResult {
  prices: PriceItem[];
  localInfo: LocalInfo | null;
  loading: boolean;
  error: string | null;
  refreshPrices: () => void;
}

// Hook para obtener precios de un local específico (por ID)
export const useLocalPricesById = (localId: string | null): UseLocalPricesResult => {
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [localInfo, setLocalInfo] = useState<LocalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    if (!localId) {
      setPrices([]);
      setLocalInfo(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obtener información del local
      const { data: local, error: localError } = await supabase
        .from('locals')
        .select('id, name, has_photo_print, can_edit_prices')
        .eq('id', localId)
        .single();

      if (localError) {
        throw new Error('Error al obtener información del local');
      }

      setLocalInfo(local);

      // 2. Obtener precios globales
      const { data: globalPrices, error: globalError } = await supabase
        .from('global_prices')
        .select('service_name, base_price, is_photo_print')
        .order('service_name', { ascending: true });

      if (globalError) {
        throw new Error('Error al obtener precios globales');
      }

      // 3. Filtrar precios de fotos si el local no tiene impresión de fotos
      const filteredGlobalPrices = local.has_photo_print
        ? globalPrices
        : globalPrices?.filter(p => !p.is_photo_print);

      // 4. Si el local puede editar precios, obtener sus precios personalizados
      let localPricesMap: Record<string, number> = {};
      
      if (local.can_edit_prices) {
        const { data: localPrices, error: localPricesError } = await supabase
          .from('local_prices')
          .select('service_name, price')
          .eq('local_id', localId);

        if (localPricesError) {
          console.error('Error fetching local prices:', localPricesError);
        } else if (localPrices) {
          localPricesMap = localPrices.reduce((acc, lp) => {
            acc[lp.service_name] = lp.price;
            return acc;
          }, {} as Record<string, number>);
        }
      }

      // 5. Combinar precios: usar local si existe, sino global
      const combinedPrices: PriceItem[] = (filteredGlobalPrices || []).map(gp => {
        const hasLocalPrice = local.can_edit_prices && localPricesMap[gp.service_name] !== undefined;
        return {
          service_name: gp.service_name,
          price: hasLocalPrice ? localPricesMap[gp.service_name] : gp.base_price,
          is_photo_print: gp.is_photo_print,
          is_custom: hasLocalPrice,
        };
      });

      setPrices(combinedPrices);
    } catch (err) {
      console.error('Error fetching prices:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      showError('Error al cargar los precios.');
    } finally {
      setLoading(false);
    }
  }, [localId]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  return { prices, localInfo, loading, error, refreshPrices: fetchPrices };
};

// Hook para obtener precios del local del manager actual
export const useManagerLocalPrices = (managerId: string | null): UseLocalPricesResult & { localId: string | null } => {
  const [localId, setLocalId] = useState<string | null>(null);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [localInfo, setLocalInfo] = useState<LocalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    if (!managerId) {
      setPrices([]);
      setLocalInfo(null);
      setLocalId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obtener el local del manager
      const { data: local, error: localError } = await supabase
        .from('locals')
        .select('id, name, has_photo_print, can_edit_prices')
        .eq('manager_id', managerId)
        .single();

      if (localError) {
        if (localError.code === 'PGRST116') {
          setError('No tienes un local asignado');
          setLocalId(null);
          setLocalInfo(null);
          setPrices([]);
          setLoading(false);
          return;
        }
        throw new Error('Error al obtener información del local');
      }

      setLocalId(local.id);
      setLocalInfo(local);

      // 2. Obtener precios globales
      const { data: globalPrices, error: globalError } = await supabase
        .from('global_prices')
        .select('service_name, base_price, is_photo_print')
        .order('service_name', { ascending: true });

      if (globalError) {
        throw new Error('Error al obtener precios globales');
      }

      // 3. Filtrar precios de fotos si el local no tiene impresión de fotos
      const filteredGlobalPrices = local.has_photo_print
        ? globalPrices
        : globalPrices?.filter(p => !p.is_photo_print);

      // 4. Si el local puede editar precios, obtener sus precios personalizados
      let localPricesMap: Record<string, number> = {};
      
      if (local.can_edit_prices) {
        const { data: localPrices, error: localPricesError } = await supabase
          .from('local_prices')
          .select('service_name, price')
          .eq('local_id', local.id);

        if (localPricesError) {
          console.error('Error fetching local prices:', localPricesError);
        } else if (localPrices) {
          localPricesMap = localPrices.reduce((acc, lp) => {
            acc[lp.service_name] = lp.price;
            return acc;
          }, {} as Record<string, number>);
        }
      }

      // 5. Combinar precios: usar local si existe, sino global
      const combinedPrices: PriceItem[] = (filteredGlobalPrices || []).map(gp => {
        const hasLocalPrice = local.can_edit_prices && localPricesMap[gp.service_name] !== undefined;
        return {
          service_name: gp.service_name,
          price: hasLocalPrice ? localPricesMap[gp.service_name] : gp.base_price,
          is_photo_print: gp.is_photo_print,
          is_custom: hasLocalPrice,
        };
      });

      setPrices(combinedPrices);
    } catch (err) {
      console.error('Error fetching prices:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      showError('Error al cargar los precios.');
    } finally {
      setLoading(false);
    }
  }, [managerId]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  return { prices, localInfo, loading, error, refreshPrices: fetchPrices, localId };
};