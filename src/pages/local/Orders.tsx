"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Store, RefreshCw, FileText } from 'lucide-react';
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

interface OrderWithClient {
  order_id: string;
  client_id: string;
  client_email: string;
  client_first_name: string | null;
  client_last_name: string | null;
  local_id: string;
  status: OrderStatus; // Usar OrderStatus tipado
  total_price: number;
  points_earned: number;
  created_at: string;
  updated_at: string;
  file_count: number;
  // Nuevo campo para almacenar los archivos
  files: OrderFile[]; 
}

const LocalOrders = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithClient[]>([]);
  const [localId, setLocalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [localNotFound, setLocalNotFound] = useState(false);

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'local') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/local/dashboard');
    }

    if (!sessionLoading && profile?.role === 'local') {
      fetchLocalAndOrders();
    }
  }, [sessionLoading, profile, navigate]);

  const fetchLocalAndOrders = async () => {
    setLoading(true);
    setLocalNotFound(false);

    try {
      // Obtener el local del manager
      const { data: local, error: localError } = await supabase
        .from('locals')
        .select('id')
        .eq('manager_id', profile?.id)
        .single();

      if (localError) {
        if (localError.code === 'PGRST116') {
          setLocalNotFound(true);
          setLoading(false);
          return;
        }
        
        console.error('Error fetching local:', localError);
        showError('Error al cargar los datos del local.');
        setLoading(false);
        return;
      }

      setLocalId(local.id);

      // Usar la función RPC para obtener pedidos con información del cliente
      const { data: ordersData, error: ordersError } = await supabase
        .rpc('get_local_orders_with_client_info', { target_local_id: local.id });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        showError('Error al cargar los pedidos.');
        setLoading(false);
        return;
      }

      // Para cada pedido, obtener los archivos
      const ordersWithFiles = await Promise.all(
        (ordersData || []).map(async (order: OrderWithClient) => {
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
    setLoading(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        showError(`Error al actualizar el estado del pedido: ${error.message}`); // Mostrar error específico
      } else {
        showSuccess('Estado del pedido actualizado correctamente.');
        
        // Registrar en auditoría
        await supabase.from('order_audit').insert({
          order_id: orderId,
          user_id: profile?.id,
          action: 'status_change',
          details: { new_status: newStatus }
        });

        fetchLocalAndOrders();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al actualizar el estado.');
    } finally {
      setLoading(false);
    }
  };

  const getClientDisplayName = (order: OrderWithClient) => {
    const firstName = order.client_first_name || '';
    const lastName = order.client_last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (fullName) {
      return fullName;
    }
    
    // Si no hay nombre, mostrar el email
    return order.client_email || 'Cliente desconocido';
  };
  
  const renderFilesList = (files: OrderFile[]) => {
    if (files.length === 0) return 'Sin archivos';
    
    if (files.length === 1) {
      return (
        <div className="flex flex-col">
          <span className="font-medium truncate max-w-[200px]">{files[0].file_name}</span>
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
        <p className="text-white text-xl">Cargando pedidos...</p>
      </div>
    );
  }

  if (profile?.role !== 'local') {
    return null;
  }
  
  if (localNotFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Card className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg text-center">
          <Store className="h-16 w-16 text-emphasis-red mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-text-carbon mb-2">Local No Asignado</CardTitle>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Tu cuenta de manager no está asignada a ningún local. Por favor, contacta al administrador para que te asigne un local.
            </p>
            <Button 
              onClick={() => navigate('/local/dashboard')}
              className="bg-primary-blue hover:bg-blue-700 text-white"
            >
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/local/dashboard')}
                className="flex items-center gap-2 text-text-carbon hover:text-primary-blue"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver al Dashboard
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={fetchLocalAndOrders}
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
              Gestión de Pedidos
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
                    <TableHead>Cliente</TableHead>
                    <TableHead>Archivos</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Puntos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.order_id}>
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
                      <TableCell>
                        {renderFilesList(order.files)}
                      </TableCell>
                      <TableCell className="font-bold text-success-green">
                        ${order.total_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-secondary-yellow font-medium">
                        {order.points_earned} pts
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
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/local/orders/${order.order_id}`)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
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

export default LocalOrders;