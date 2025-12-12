"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Order {
  id: string;
  local_id: string;
  status: string;
  total_price: number;
  points_earned: number;
  created_at: string;
  locals: {
    name: string;
  };
  order_files: {
    file_name: string;
    created_at: string;
  }[];
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

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        locals (
          name
        ),
        order_files (
          file_name,
          created_at
        )
      `)
      .eq('client_id', profile?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      showError('Error al cargar los pedidos.');
    } else {
      setOrders(data || []);
    }

    setLoading(false);
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
  
  const getOrderTitle = (order: Order) => {
    if (order.order_files && order.order_files.length > 0) {
      // Ordenar por fecha de creación para obtener el primer archivo
      const sortedFiles = [...order.order_files].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return sortedFiles[0].file_name;
    }
    return `Pedido #${order.id.substring(0, 8)}...`;
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
              <Button
                onClick={() => navigate('/client/new-order')}
                className="bg-primary-blue hover:bg-blue-700 text-white"
              >
                Nuevo Pedido
              </Button>
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
                    <TableHead>Archivo Principal</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Puntos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">
                        {getOrderTitle(order)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.locals?.name}
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
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/client/orders/${order.id}`)}
                        >
                          <Eye className="h-4 w-4" />
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

export default ClientOrders;