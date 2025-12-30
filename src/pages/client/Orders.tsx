"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getStatusBadge } from '@/utils/order-status';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrderFile {
  id: string;
  file_name: string;
  file_path: string;
  copies: number;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_price: number;
  points_earned: number;
  local_id: string;
  local_name: string; // Mapped from locals.name
  order_files: OrderFile[];
}

const ClientOrders = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && profile?.role === 'client') {
      fetchOrders();
    } else if (!sessionLoading && profile?.role !== 'client') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/client');
    }
  }, [sessionLoading, profile, navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Consulta optimizada para obtener archivos y nombre del local en una sola llamada
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, 
          created_at, 
          status, 
          total_price, 
          points_earned, 
          local_id, 
          locals ( name ),
          order_files ( id, file_name, file_path, copies )
        `)
        .eq('client_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Mapear los datos para aplanar el nombre del local
      const formattedOrders: Order[] = (data || []).map((order: any) => ({
        ...order,
        local_name: order.locals?.name || 'Local desconocido',
      }));
      
      setOrders(formattedOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      showError('Error al cargar tus pedidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      if (filePath.includes('DELETED')) {
        showError('Este archivo ha expirado o fue eliminado.');
        return;
      }

      const { data, error } = await supabase.storage
        .from('order-files')
        .download(filePath);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      showError('No se pudo descargar el archivo.');
    }
  };

  const renderFilesList = (files: OrderFile[]) => {
    if (!files || files.length === 0) return 'Sin archivos';

    return (
      <div className="space-y-1">
        {files.map((file) => {
          // ESTA ES LA LÓGICA QUE FALTABA
          const isDeleted = file.file_path && file.file_path.includes('DELETED');
          return (
            <div key={file.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded border border-gray-100">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="h-4 w-4 text-primary-blue shrink-0" />
                <span className="truncate max-w-[150px] md:max-w-[200px]" title={file.file_name}>
                  {file.file_name}
                </span>
                <span className="text-xs text-gray-500 shrink-0">({file.copies}x)</span>
              </div>
              {isDeleted ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-gray-400 border-gray-200 text-[10px] h-6 flex gap-1 items-center">
                        <AlertCircle className="w-3 h-3" /> Expirado
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este archivo fue eliminado por privacidad.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-500 hover:text-primary-blue"
                  onClick={() => handleDownload(file.file_path, file.file_name)}
                  title="Descargar"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
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
                        {renderFilesList(order.order_files)}
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