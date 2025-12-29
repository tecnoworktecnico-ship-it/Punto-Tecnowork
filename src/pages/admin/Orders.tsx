"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, RefreshCw, FileText, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getStatusBadge, OrderStatus } from '@/utils/order-status'; // Importar OrderStatus

interface OrderFile {
  file_name: string;
  copies: number;
}

interface OrderWithDetails {
  order_id: string;
  client_id: string;
  client_email: string;
  client_first_name: string | null;
  client_last_name: string | null;
  local_id: string;
  local_name: string;
  status: OrderStatus; // Usar OrderStatus tipado
  total_price: number;
  points_earned: number;
  created_at: string;
  updated_at: string;
  file_count: number;
  files: OrderFile[]; 
}

const AdminOrders = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'admin') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/admin/dashboard');
    }

    if (!sessionLoading && profile?.role === 'admin') {
      fetchOrders();
    }
  }, [sessionLoading, profile, navigate]);

  const fetchOrders = async () => {
    setLoading(true);

    try {
      // Usar la función RPC para obtener todos los pedidos con detalles
      const { data: ordersData, error: ordersError } = await supabase
        .rpc('get_all_orders_with_details');

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        showError('Error al cargar los pedidos: ' + ordersError.message);
        setLoading(false);
        return;
      }

      // Para cada pedido, obtener los archivos
      const ordersWithFiles = await Promise.all(
        (ordersData || []).map(async (order: OrderWithDetails) => {
          const { data: filesData, error: filesError } = await supabase
            .from('order_files')
            .select('file_name, copies')
            .eq('order_id', order.order_id);

          if (filesError) {
            console.error(`Error fetching files for order ${order.order_id}:`, filesError);
          }

          return {
            ...order,
            files: filesData || [],
          };
        })
      );

      setOrders(ordersWithFiles);
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al cargar datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    // Encontrar el pedido actual para obtener client_id y points_earned
    const currentOrder = orders.find(o => o.order_id === orderId);
    if (!currentOrder) {
      showError('Pedido no encontrado.');
      return;
    }
    
    // Prevenir la doble suma de puntos si ya estaba completado
    const wasCompleted = currentOrder.status === 'completed';
    const isCompleting = newStatus === 'completed';

    setLoading(true);

    try {
      // 1. Actualizar el estado del pedido
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order status:', updateError);
        showError(`Error al actualizar el estado del pedido: ${updateError.message}`);
        setLoading(false);
        return;
      }
      
      let pointsMessage = '';

      // 2. Lógica de Puntos: Sumar solo si pasa a 'completed' y no estaba completado antes
      if (isCompleting && !wasCompleted) {
        const points = currentOrder.points_earned;
        const clientId = currentOrder.client_id;
        
        // Obtener puntos actuales del usuario
        const { data: userPointsData, error: pointsFetchError } = await supabase
          .from('user_points')
          .select('points')
          .eq('user_id', clientId)
          .single();
          
        if (pointsFetchError && pointsFetchError.code !== 'PGRST116') {
          console.error('Error fetching user points for update:', pointsFetchError);
          // No lanzar error, solo registrar y continuar
        }
        
        const currentPoints = userPointsData?.points || 0;
        const newPoints = currentPoints + points;
        
        // Actualizar o insertar puntos
        const { error: pointsUpdateError } = await supabase
          .from('user_points')
          .upsert(
            { user_id: clientId, points: newPoints, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          );

        if (pointsUpdateError) {
          console.error('Error updating user points:', pointsUpdateError);
          pointsMessage = ` (Advertencia: Error al sumar ${points} puntos)`;
        } else {
          pointsMessage = ` (Se sumaron ${points} puntos al cliente)`;
        }
      }
      
      // 3. Registrar en auditoría
      await supabase.from('order_audit').insert({
        order_id: orderId,
        user_id: profile?.id,
        action: 'status_change_admin',
        details: { new_status: newStatus }
      });

      showSuccess(`Estado del pedido actualizado a ${newStatus.replace('_', ' ')}.${pointsMessage}`);
      
      // 4. Recargar datos
      fetchOrders();
      
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al actualizar el estado.');
    } finally {
      // El loading se maneja dentro de fetchOrders, pero lo aseguramos aquí si hay un error temprano
      if (loading) setLoading(false);
    }
  };

  const getClientDisplayName = (order: OrderWithDetails) => {
    const firstName = order.client_first_name || '';
    const lastName = order.client_last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (fullName) {
      return fullName;
    }
    
    return order.client_email || 'Cliente desconocido';
  };
  
  const renderFilesList = (files: OrderFile[]) => {
    if (files.length === 0) return 'Sin archivos';
    
    if (files.length === 1) {
      return (
        <div className="flex flex-col">
          <span className="font-medium truncate max-w-[150px]">{files[0].file_name}</span>
          <span className="text-xs text-gray-500">{files[0].copies} copia{files[0].copies > 1 ? 's' : ''}</span>
        </div>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col cursor-help">
              <span className="font-medium flex items-center gap-1">
                <FileText className="h-4 w-4 text-primary-blue" />
                {files.length} archivos
              </span>
              <span className="text-xs text-gray-500">Ver detalles</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              {files.map((file, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium">{file.file_name}</span>
                  <span className="text-gray-400 ml-2">({file.copies}x)</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };


  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === filterStatus);

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
        <p className="text-white text-xl">Cargando pedidos...</p>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="max-w-7xl mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg">
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={fetchOrders}
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="processing">En Proceso</SelectItem>
                    <SelectItem value="ready">Listos</SelectItem>
                    <SelectItem value="completed">Completados</SelectItem>
                    <SelectItem value="cancelled">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon">
              Gestión de Pedidos (Administrador)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {filterStatus === 'all' 
                  ? 'No hay pedidos registrados.'
                  : 'No hay pedidos con este estado.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Archivos</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.order_id}>
                      <TableCell className="font-mono text-sm">
                        {order.order_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-text-carbon">
                            {getClientDisplayName(order)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {order.client_email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.local_name || 'Local Eliminado'}
                      </TableCell>
                      <TableCell>
                        {renderFilesList(order.files)}
                      </TableCell>
                      <TableCell className="font-bold text-success-green">
                        ${order.total_price.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.order_id, value as OrderStatus)}
                          disabled={loading}
                        >
                          <SelectTrigger className="w-[140px]">
                            {getStatusBadge(order.status)}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="processing">En Proceso</SelectItem>
                            <SelectItem value="ready">Listo</SelectItem>
                            <SelectItem value="completed">Completado</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {new Date(order.created_at).toLocaleDateString('es-ES')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleTimeString('es-ES', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOrders;