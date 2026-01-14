"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

const PointsRepairButton: React.FC = () => {
  const { profile } = useSession();
  const [loading, setLoading] = useState(false);

  const handleRecalculate = async () => {
    if (profile?.role !== 'admin') {
      showError('Acceso denegado. Solo administradores pueden realizar esta acción.');
      return;
    }
    
    if (!confirm('ADVERTENCIA: ¿Estás seguro de que deseas recalcular los puntos de TODOS los usuarios? Esto sobrescribirá los puntos actuales basados en el historial de pedidos completados.')) {
      return;
    }

    setLoading(true);

    try {
      // 1. Descargar TODOS los pedidos completados
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('client_id, points_earned')
        .eq('status', 'completed');

      if (ordersError) {
        throw new Error(`Error al descargar pedidos: ${ordersError.message}`);
      }

      // 2. Calcular en memoria la suma total de puntos ganados por cada client_id
      const pointsByClient: Record<string, number> = {};
      
      orders.forEach(order => {
        if (order.client_id) {
          pointsByClient[order.client_id] = (pointsByClient[order.client_id] || 0) + (order.points_earned || 0);
        }
      });

      const clientIdsToUpdate = Object.keys(pointsByClient);
      let updatedUsersCount = 0;
      
      // 3. Recorrer cada cliente y actualizar su campo points en la tabla profiles
      
      for (const userId of clientIdsToUpdate) {
        const newPoints = pointsByClient[userId];
        
        // Actualizar puntos en profiles
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('id', userId);

        if (updateError) {
          console.error(`Error al actualizar puntos para el usuario ${userId}:`, updateError);
          // Continuar con el siguiente usuario a pesar del error
        } else {
          updatedUsersCount++;
        }
      }

      showSuccess(`¡Recálculo completado! Se actualizaron los puntos de ${updatedUsersCount} usuario(s).`);

    } catch (error) {
      console.error('Error durante el recálculo de puntos:', error);
      showError(error instanceof Error ? error.message : 'Error inesperado al recalcular puntos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRecalculate}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-3 py-3 h-auto min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-md whitespace-normal leading-tight"
    >
      {/* shrink-0 evita que el icono se aplaste si el texto ocupa mucho espacio */}
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin shrink-0" />
      ) : (
        <RefreshCw className="w-5 h-5 shrink-0" />
      )}
      
      {/* Texto adaptable */}
      <span className="text-center">
        {loading ? 'Sincronizando...' : 'Sincronizar Puntos'}
      </span>
    </button>
  );
};

export default PointsRepairButton;