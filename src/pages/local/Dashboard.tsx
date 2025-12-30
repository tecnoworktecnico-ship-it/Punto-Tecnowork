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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  RefreshCw,
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  Package
} from 'lucide-react';
import PriceList from '@/components/PriceList'; // Componente de precios recuperado

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
  
  // Estado del Local
  const [activeLocal, setActiveLocal] = useState<{id: string, name: string} | null>(null);
  const [localCheckComplete, setLocalCheckComplete] = useState(false);

  // Estadísticas rápidas calculadas en el frontend
  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    completedOrders: orders.filter(o => o.status === 'completed').length,
    totalRevenue: orders
      .filter(o => o.status === 'completed')
      .reduce((acc, curr) => acc + (curr.total_price || 0), 0)
  };

  // 1. RECUPERAR EL LOCAL (Lógica corregida V16)
  useEffect(() => {
    const fetchLocalByManager = async () => {
      if (sessionLoading) return;
      if (!profile) {
        setLocalCheckComplete(true);
        return;
      }

      try {
        // console.log("Buscando local...");
        const { data, error } = await supabase
          .from('locals')
          .select('id, name')
          .eq('manager_id', profile.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setActiveLocal(data);
          fetchOrders(data.id);
          setupSubscription(data.id);
        }
      } catch (err) {
        console.error("Error buscando local:", err);
      } finally {
        setLocalCheckComplete(true);
      }
    };

    fetchLocalByManager();
  }, [profile, sessionLoading]);

  // 2. SUSCRIPCIÓN
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

  // 3. CARGAR PEDIDOS (Consulta Segura Anti-Error 400)
  const fetchOrders = async (localId: string) => {
    try {
      // setLoading(true); // Opcional: comentar si molesta el parpadeo en recargas automáticas
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          total_price,
          client_id,
          order_files (
            id,
            file_name,
            file_path,
            copies
          )
        `)
        .eq('local_id', localId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const clientIds = [...new Set((ordersData || []).map((o: any) => o.client_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};

      if (clientIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', clientIds);
        
        if (profilesData) {
          profilesData.forEach(p => profilesMap[p.id] = p);
        }
      }

      const formattedOrders = (ordersData || []).map((order: any) => ({
        id: order.id,
        created_at: order.created_at,
        status: order.status,
        total_price: order.total_price,
        client: profilesMap[order.client_id] || { first_name: 'Usuario', last_name: 'Desconocido', email: '' },
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
      showSuccess(`Estado actualizado`);
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
      console.error('Error updating status:', error);
      showError('Error al actualizar');
    } finally {
      setUpdating(null);
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      if (filePath.includes('DELETED')) {
        showError('Este archivo ha sido eliminado.');
        return;
      }
      const { data, error } = await supabase.storage.from('order-files').download(filePath);
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
      console.error('Download error:', error);
      showError('Error al descargar');
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

  // PANTALLAS DE CARGA Y ERROR
  if (sessionLoading) return <div className="flex justify-center h-[50vh] items-center"><Loader2 className="animate-spin text-primary-blue"/></div>;
  if (!localCheckComplete) return <div className="flex justify-center h-[50vh] items-center"><Loader2 className="animate-spin text-orange-500"/><span className="ml-2">Conectando...</span></div>;
  
  if (!activeLocal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Local No Asignado</h2>
        <p className="text-gray-500">No eres gerente de ninguna sucursal.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Recargar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Printer className="w-6 h-6 text-primary-blue" />
            {activeLocal.name}
          </h1>
          <p className="text-gray-500 text-sm">Panel de Administración de Sucursal</p>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex gap-1">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             En línea
           </Badge>
        </div>
      </div>

      {/* TARJETAS DE ESTADÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">En pedidos completados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Totales</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Pedidos completados</p>
          </CardContent>
        </Card>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="prices" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Lista de Precios
          </TabsTrigger>
        </TabsList>

        {/* CONTENIDO TAB PEDIDOS */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar cliente..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => fetchOrders(activeLocal.id)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Archivos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                       <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin inline mr-2"/>Cargando...</TableCell></TableRow>
                    ) : filteredOrders.length === 0 ? (
                       <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Sin resultados.</TableCell></TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs text-gray-600">
                             <div>#{order.id.slice(0, 6)}</div>
                             <div className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleDateString()}</div>
                          </TableCell>
                          <TableCell>
                             <div className="font-medium text-sm">{order.client.first_name} {order.client.last_name}</div>
                             <div className="text-xs text-gray-400">{order.client.email}</div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {order.order_files.map((file, idx) => {
                                const isDeleted = file.file_path && file.file_path.includes('DELETED');
                                return (
                                  <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 p-1 rounded border max-w-[200px]">
                                    <span className="truncate flex-1 mr-2" title={file.file_name}>{file.file_name}</span>
                                    <span className="font-bold mr-2">x{file.copies}</span>
                                    {isDeleted ? (
                                      <Badge variant="destructive" className="text-[9px] h-5 px-1">Expirado</Badge>
                                    ) : (
                                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDownload(file.file_path, file.file_name)}>
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
                            <Select defaultValue={order.status} onValueChange={(v) => handleStatusChange(order.id, v)} disabled={updating === order.id}>
                              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
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
        </TabsContent>

        {/* CONTENIDO TAB PRECIOS */}
        <TabsContent value="prices">
           <Card>
             <CardHeader>
               <CardTitle>Configuración de Precios</CardTitle>
               <CardDescription>Administra los costos de impresión para tu local.</CardDescription>
             </CardHeader>
             <CardContent>
               {/* Asumimos que PriceList maneja su propia lógica o le pasamos el localId si lo requiere */}
               <PriceList />
             </CardContent>
           </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default LocalDashboard;