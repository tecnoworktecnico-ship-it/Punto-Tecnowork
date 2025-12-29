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
      
      // 3. Recorrer cada cliente y actualizar su campo points en la tabla user_points
      // Nota: La tabla de puntos es 'user_points', no 'profiles'.
      
      for (const userId of clientIdsToUpdate) {
        const newPoints = pointsByClient[userId];
        
        // Intentar actualizar (si existe) o insertar (si no existe)
        const { error: updateError } = await supabase
          .from('user_points')
          .upsert(
            { user_id: userId, points: newPoints, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          );

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
    <Button
      onClick={handleRecalculate}
      disabled={loading}
      variant="destructive"
      className="w-full bg-emphasis-red hover:bg-red-700 text-white flex items-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Recalculando Puntos...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Recalcular Puntos de Todos los Usuarios
        </>
      )}
    </Button>
  );
};

export default PointsRepairButton;