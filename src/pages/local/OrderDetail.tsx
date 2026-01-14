"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import OrderDetailsCard from '@/components/local/OrderDetailsCard';
import OrderFilesWizard from '@/components/local/OrderFilesWizard';
import { LocalOrder, OrderStatus } from '@/types/order';

const LocalOrderDetail = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<LocalOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!orderId || !profile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1. Obtener el ID del local del manager
      const { data: local, error: localError } = await supabase
        .from('locals')
        .select('id')
        .eq('manager_id', profile.id)
        .single();

      if (localError) {
        console.error('Error fetching local:', localError);
        showError('Error al cargar los datos del local.');
        setOrder(null);
        return;
      }

      const localId = local.id;

      // 2. Obtener el pedido, archivos y auditoría
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_files (*),
          order_audit (*)
        `)
        .eq('id', orderId)
        .eq('local_id', localId) // Asegurar que el pedido pertenece a este local
        .single();

      if (orderError) {
        console.error('Error fetching order details:', orderError);
        showError('Pedido no encontrado o no tienes permiso para verlo.');
        setOrder(null);
      } else {
        // 2.1 Obtener el perfil del cliente
        const { data: clientProfileData } = await supabase
          .from('profiles')
          .select('*') // Consulta corregida
          .eq('id', orderData.client_id)
          .maybeSingle(); // Usar maybeSingle para evitar 406 si el perfil no existe

        // LOG DE DEPURACIÓN AÑADIDO
        console.log('DEBUG_DATA:', { id: orderData.client_id, perfil: clientProfileData });

        // Determinar el nombre de respaldo si el perfil está incompleto o nulo
        let fallbackName = 'Cliente Desconocido';
        if (clientProfileData?.email) {
          fallbackName = clientProfileData.email;
        } else if (orderData.client_id) {
          // Si no hay email en profiles, usar el ID truncado como último recurso (aunque se pidió evitarlo, 
          // si no hay email, es el único identificador seguro)
          fallbackName = `ID: ${orderData.client_id.substring(0, 8)}...`;
        }

        // Asegurar que order_audit esté ordenado por created_at
        const sortedAudit = (orderData.order_audit || []).sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        const orderWithProfiles = {
          ...orderData,
          order_audit: sortedAudit,
          profiles: clientProfileData || {
            first_name: fallbackName,
            last_name: null // Aseguramos que last_name sea nulo si usamos el fallback
          }
        };
        
        setOrder(orderWithProfiles as LocalOrder);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al cargar el pedido.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, profile?.id]);

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'local') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/local/dashboard');
    }

    if (!sessionLoading && profile?.role === 'local' && orderId) {
      fetchOrder();
    }
  }, [sessionLoading, profile, navigate, orderId, fetchOrder]);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) {
        console.error('Error updating order status:', error);
        showError(`Error al actualizar el estado del pedido: ${error.message}`); // Mostrar error específico
        throw error;
      } else {
        showSuccess(`Estado del pedido actualizado a ${newStatus.replace('_', ' ')}.`);
        
        // Registrar en auditoría
        await supabase.from('order_audit').insert({
          order_id: order.id,
          user_id: profile?.id,
          action: 'status_change',
          details: { new_status: newStatus }
        });

        fetchOrder(); // Recargar datos
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al actualizar el estado.');
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
        <p className="text-white text-xl">Cargando detalles del pedido...</p>
      </div>
    );
  }

  if (profile?.role !== 'local' || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl mb-4">Pedido no encontrado o acceso denegado.</p>
        <Button onClick={() => navigate('/local/orders')} variant="outline">
          Volver a Pedidos
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Botón de Volver añadido aquí */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white hover:text-gray-200 hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
          Volver
        </Button>

        <OrderDetailsCard order={order} />
        
        <OrderFilesWizard 
          order={order} 
          onStatusUpdate={handleStatusUpdate} 
          onOrderRefresh={fetchOrder}
        />
      </div>
    </div>
  );
};

export default LocalOrderDetail;