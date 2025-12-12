"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrderFile {
  file_name: string;
  copies: number;
}

interface Order {
  id: string;
  local_id: string;
  status: string;
  total_price: number;
  points_earned: number;
  created_at: string;
  local_name: string;
  files: OrderFile[];
}

const ClientOrders = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
      // Obtener pedidos
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, local_id, status, total_price, points_earned, created_at')
        .eq('client_id', profile?.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        showError('Error al cargar los pedidos.');
        setLoading(false);
        return;
      }

      // Para cada pedido, obtener el nombre del local y los archivos
      const ordersWithDetails = await Promise.all(
        (ordersData || []).map(async (order) => {
          // Obtener nombre del local
          const { data: localData } = await supabase
            .from('locals')
            .select('name')
            .eq('id', order.local_id)
            .single();

          // Obtener archivos del pedido
          const { data: filesData } = await supabase
            .from('order_files')
            .select('file_name, copies')
            .eq('order_id', order.id);

          return {
            ...order,
            local_name: localData?.name || 'Local desconocido',
            files: filesData || [],
          };
        })
      );

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al cargar pedidos.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendiente', variant: 'secondary' },
      in_progress: { label: 'En Proceso', variant: 'default' },
      ready: { label: 'Listo para Recoger', variant: 'outline' },
      completed: { label: 'Completado', variant: 'default' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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

    const filesList = files.map(f => `${f.file_name} (${f.copies}x)`).join('\n');
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col cursor-help">
              <span className="font-medium">{files.length} archivos</span>
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

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando pedidos...</p>
      </div>
    );
  }

  if (profile?.role !== 'client') {
    return null;
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white rounded-lg shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/client')}
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
                <Button
                  onClick={() => navigate('/client/new-order')}
                  className="bg-primary-blue hover:bg-blue-700 text-white"
                >
                  Nuevo Pedido
                </Button>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon">
              Mis Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-4">
                  No tienes pedidos aún
                </p>
                <Button
                  onClick={() => navigate('/client/new-order')}
                  className="bg-primary-blue hover:bg-blue-700 text-white"
                >
                  Crear Primer Pedido
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Local</TableHead>
                    <TableHead>Archivos</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Puntos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.local_name}
                      </TableCell>
                      <TableCell>
                        {renderFilesList(order.files)}
                      </TableCell>
                      <TableCell className="font-bold">
                        ${order.total_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-secondary-yellow font-medium">
                        +{order.points_earned} pts
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
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