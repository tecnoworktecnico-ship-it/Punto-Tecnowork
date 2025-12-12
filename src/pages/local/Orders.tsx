"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Store, RefreshCw } from 'lucide-react';
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

interface OrderWithClient {
  id: string;
  client_id: string;
  local_id: string;
  status: string;
  total_price: number;
  points_earned: number;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_email: string;
  file_count: number;
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

      // Obtener pedidos del local con información del cliente
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          client_id,
          local_id,
          status,
          total_price,
          points_earned,
          created_at,
          updated_at,
          profiles!orders_client_id_fkey (
            first_name,
            last_name
          ),
          order_files (
            id
          )
        `)
        .eq('local_id', local.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        showError('Error al cargar los pedidos.');
      } else {
        // Transformar los datos para incluir el nombre del cliente
        const transformedOrders: OrderWithClient[] = (ordersData || []).map(order => {
          const clientProfile = order.profiles as any;
          const firstName = clientProfile?.first_name || '';
          const lastName = clientProfile?.last_name || '';
          const clientName = firstName || lastName 
            ? `${firstName} ${lastName}`.trim() 
            : 'Cliente sin nombre';
          
          return {
            id: order.id,
            client_id: order.client_id,
            local_id: order.local_id,
            status: order.status,
            total_price: order.total_price,
            points_earned: order.points_earned,
            created_at: order.created_at,
            updated_at: order.updated_at,
            client_name: clientName,
            client_email: '', // No tenemos acceso al email desde profiles
            file_count: Array.isArray(order.order_files) ? order.order_files.length : 0,
          };
        });

        setOrders(transformedOrders);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al cargar datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
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
        showError('Error al actualizar el estado del pedido.');
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendiente', variant: 'secondary' },
      in_progress: { label: 'En Proceso', variant: 'default' },
      ready: { label: 'Listo', variant: 'outline' },
      completed: { label: 'Completado', variant: 'default' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
        <Card className="bg-white rounded-lg shadow-lg">
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
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </Button>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="in_progress">En Proceso</SelectItem>
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
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-text-carbon">
                            {order.client_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ID: {order.id.substring(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary-blue/10">
                          {order.file_count} archivo{order.file_count !== 1 ? 's' : ''}
                        </Badge>
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
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            {getStatusBadge(order.status)}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="in_progress">En Proceso</SelectItem>
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
                          onClick={() => navigate(`/local/orders/${order.id}`)}
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