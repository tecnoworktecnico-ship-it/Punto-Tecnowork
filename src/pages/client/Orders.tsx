"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
// IMPORTANTE: Aquí se agregan Loader2 y RefreshCw para evitar el error de pantalla blanca
import { ArrowLeft, FileText, Download, AlertCircle, Calendar, Loader2, RefreshCw } from 'lucide-react';
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
  local_name: string;
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
      navigate('/client');
    }
  }, [sessionLoading, profile, navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Usamos selects anidados para traer el nombre del local directamente
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
          order_files (
            id,
            file_name,
            file_path,
            copies
          )
        `)
        .eq('client_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapeo seguro de datos
      const formattedOrders: Order[] = (data || []).map((order: any) => ({
        id: order.id,
        created_at: order.created_at,
        status: order.status,
        total_price: order.total_price,
        points_earned: order.points_earned,
        local_name: order.locals?.name || 'Local desconocido',
        order_files: order.order_files || []
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
      // BLINDAJE: Si el archivo tiene la marca DELETED, detenemos la descarga
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
    if (!files || files.length === 0) return <span className="text-gray-400 text-sm">Sin archivos</span>;

    return (
      <div className="space-y-1">
        {files.map((file) => {
          // Detectar si el archivo fue borrado por el Admin
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
                      <Badge variant="outline" className="text-gray-400 border-gray-200 text-[10px] h-6 flex gap-1 items-center bg-gray-100">
                        <AlertCircle className="w-3 h-3" /> Expirado
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este archivo fue eliminado por privacidad o antigüedad.</p>
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
        <p className="text-white text-xl">Cargando tus pedidos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg">
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
              <div className="flex gap-2">
                 <Button 
                   variant="outline"
                   onClick={fetchOrders}
                   disabled={loading}
                   className="gap-2"
                 >
                   <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                   Actualizar
                 </Button>
                 <Button onClick={() => navigate('/client/new-order')} className="bg-primary-blue hover:bg-blue-700 text-white">
                   Nuevo Pedido
                 </Button>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary-blue" />
              Mis Pedidos
            </CardTitle>
            <CardDescription>
              Historial de tus solicitudes de impresión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                <p className="mb-4 text-lg">Aún no has realizado ningún pedido.</p>
                <Button onClick={() => navigate('/client/new-order')}>
                  ¡Haz tu primer pedido ahora!
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                        <TableCell className="min-w-[200px]">
                          {renderFilesList(order.order_files)}
                        </TableCell>
                        <TableCell className="font-bold text-success-green">
                          ${order.total_price.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            +{order.points_earned} pts
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-gray-500">
                           {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientOrders;