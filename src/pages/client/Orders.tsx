"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, FileText, Loader2, Store } from 'lucide-react';
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
  id: string; // Usar 'id' en lugar de 'order_id' para la consulta directa
  client_id: string;
  local_id: string;
  status: OrderStatus;
  total_price: number;
  points_earned: number;
  created_at: string;
  updated_at: string;
  // Propiedad para el join de Supabase
  locals: {
    name: string;
  } | null;
  files: OrderFile[]; 
}

const ClientOrders = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'client') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/client');
    }

    if (!sessionLoading && profile?.role === 'client') {
      fetchOrders();
    }
  }, [sessionLoading, profile, navigate]);

  const fetchOrders = async () => {
    setLoading(true);

    try {
      if (!profile?.id) {
        setOrders([]);
        setLoading(false);
        return;
      }
      
      // 1. Consultar la tabla 'orders' directamente, filtrando por client_id
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          locals ( name )
        `)
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching client orders:', ordersError);
        showError('Error al cargar tus pedidos: ' + ordersError.message);
        setLoading(false);
        return;
      }

      // 2. Para cada pedido, obtener los archivos
      const ordersWithFiles = await Promise.all(
        (ordersData || []).map(async (order: OrderWithDetails) => {
          const { data: filesData, error: filesError } = await supabase
            .from('order_files')
            .select('file_name, copies')
            .eq('order_id', order.id);

          if (filesError) {
            console.error(`Error fetching files for order ${order.id}:`, filesError);
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
        <p className="text-white text-xl">Cargando tus pedidos...</p>
      </div>
    );
  }

  if (profile?.role !== 'client') {
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
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-text-carbon hover:text-primary-blue"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver
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
              Mis Pedidos
            </CardTitle>
            <CardDescription>
              Revisa el estado y los detalles de tus pedidos de impresión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {filterStatus === 'all' 
                  ? 'No tienes pedidos registrados.'
                  : 'No hay pedidos con este estado.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Pedido</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Archivos</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Puntos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium flex items-center gap-1">
                        <Store className="h-4 w-4 text-gray-500" />
                        {order.locals?.name || 'Local Eliminado'}
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
                        {getStatusBadge(order.status)}
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

export default ClientOrders;