import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showError, showSuccess } from '@/utils/toast';
import { 
  Printer, 
  Search, 
  Clock, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Download,
  RefreshCw
} from 'lucide-react';

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
  client: {
    first_name: string;
    last_name: string;
    email: string;
  };
  order_files: OrderFile[];
}

const LocalDashboard = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  
  // ESTADO PARA EL LOCAL CORRECTO
  const [activeLocal, setActiveLocal] = useState<{id: string, name: string} | null>(null);
  const [localCheckComplete, setLocalCheckComplete] = useState(false);

  // 1. RECUPERAR EL LOCAL BASADO EN EL MANAGER_ID (Lógica V16)
  useEffect(() => {
    const fetchLocalByManager = async () => {
      if (sessionLoading) return; // Esperar sesión
      if (!profile) {
        setLocalCheckComplete(true);
        return;
      }

      try {
        console.log("Buscando local donde manager_id =", profile.id);
        
        // AQUÍ ESTÁ LA CLAVE: Buscamos en 'locals' donde el manager sea el usuario actual
        const { data, error } = await supabase
          .from('locals')
          .select('id, name')
          .eq('manager_id', profile.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          console.log("Local encontrado:", data);
          setActiveLocal(data);
          // Una vez tenemos el ID, cargamos los pedidos
          fetchOrders(data.id);
          setupSubscription(data.id);
        } else {
          console.warn("No se encontró ningún local gestionado por este usuario.");
        }
      } catch (err) {
        console.error("Error buscando local del manager:", err);
      } finally {
        setLocalCheckComplete(true);
      }
    };

    fetchLocalByManager();
  }, [profile, sessionLoading]);

  // 2. CONFIGURAR SUSCRIPCIÓN
  const setupSubscription = (localId: string) => {
    const channel = supabase
      .channel('local-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `local_id=eq.${localId}`
        },
        () => fetchOrders(localId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // 3. CARGAR PEDIDOS
  const fetchOrders = async (localId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          total_price,
          profiles:client_id (
            first_name,
            last_name,
            email
          ),
          order_files (
            id,
            file_name,
            file_path,
            copies
          )
        `)
        .eq('local_id', localId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders = data.map((order: any) => ({
        id: order.id,
        created_at: order.created_at,
        status: order.status,
        total_price: order.total_price,
        client: order.profiles || { first_name: 'Usuario', last_name: 'Eliminado', email: '' },
        order_files: order.order_files || []
      }));

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showError('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      showSuccess(`Estado actualizado a: ${newStatus}`);
      
      setOrders(orders.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Error al actualizar estado');
    } finally {
      setUpdating(null);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      if (filePath.includes('DELETED')) {
        showError('Este archivo ha sido eliminado del servidor.');
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
      console.error('Error downloading:', error);
      showError('Error al descargar el archivo');
    }
  };

  const filteredOrders = orders.filter(order => 
    order.client.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.client.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.slice(0, 8).includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'printing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 1. CARGA INICIAL DE SESIÓN
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-blue" />
        <span className="ml-2 text-gray-500">Autenticando...</span>
      </div>
    );
  }

  // 2. BUSCANDO LOCAL DEL MANAGER
  if (!localCheckComplete) {
     return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="ml-2 text-gray-500">Buscando tu sucursal...</span>
      </div>
    );
  }

  // 3. NO SE ENCONTRÓ LOCAL (Error Real)
  if (!activeLocal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4 animate-in fade-in">
        <div className="bg-yellow-50 p-4 rounded-full mb-4">
          <AlertCircle className="w-12 h-12 text-yellow-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Local No Asignado</h2>
        <p className="text-gray-500 max-w-md">
          Tu usuario no figura como gerente de ninguna sucursal en la base de datos (tabla <code>locals</code>).
          <br /><br />
          Contacta al administrador para que asigne tu ID de usuario como <code>manager_id</code> en el local correspondiente.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Recargar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Printer className="w-6 h-6 text-primary-blue" />
            Panel: {activeLocal.name}
          </h1>
          <p className="text-gray-500">Gestionando pedidos de {activeLocal.name}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar cliente o ID..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => fetchOrders(activeLocal.id)} title="Recargar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cola de Pedidos</CardTitle>
          <CardDescription>
            Mostrando {filteredOrders.length} pedidos recientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID / Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Archivos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No hay pedidos que coincidan con la búsqueda.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-gray-600">
                            #{order.id.slice(0, 8)}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(order.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {order.client.first_name} {order.client.last_name}
                          </span>
                          <span className="text-xs text-gray-400">{order.client.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {order.order_files.map((file, idx) => {
                            const isDeleted = file.file_path && file.file_path.includes('DELETED');
                            
                            return (
                              <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 p-1.5 rounded border border-gray-100 max-w-[250px]">
                                <div className="flex items-center gap-1 overflow-hidden">
                                  <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span className="truncate" title={file.file_name}>{file.file_name}</span>
                                  <span className="font-bold text-gray-600 ml-1">x{file.copies}</span>
                                </div>
                                
                                {isDeleted ? (
                                  <Badge variant="destructive" className="text-[10px] h-5 px-1 bg-red-100 text-red-700 hover:bg-red-100 border-none shadow-none">
                                    Expirado
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-gray-400 hover:text-blue-600"
                                    onClick={() => handleDownload(file.file_path, file.file_name)}
                                    title="Descargar para imprimir"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(order.status)} border shadow-sm`}>
                          {order.status === 'pending' && 'Pendiente'}
                          {order.status === 'printing' && 'Imprimiendo'}
                          {order.status === 'completed' && 'Completado'}
                          {order.status === 'cancelled' && 'Cancelado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          defaultValue={order.status}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                          disabled={updating === order.id}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="printing">Imprimiendo</SelectItem>
                            <SelectItem value="completed">Completado</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocalDashboard;