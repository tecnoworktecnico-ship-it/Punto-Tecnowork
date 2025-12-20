"use client";

import React, { useState, useEffect } from 'react';
import { LocalOrder, OrderFile, OrderStatus } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Printer, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getStatusConfig } from '@/utils/order-status'; // Importar utilidad

interface OrderFilesWizardProps {
  order: LocalOrder;
  onStatusUpdate: (newStatus: OrderStatus) => void;
  onOrderRefresh: () => void;
}

const OrderFilesWizard: React.FC<OrderFilesWizardProps> = ({ order, onStatusUpdate, onOrderRefresh }) => {
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);

  // Sincronizar el estado local del Select con el estado del pedido cuando el prop cambie
  useEffect(() => {
    if (order.status !== newStatus) {
      setNewStatus(order.status);
    }
  }, [order.status]);

  const handleDownload = async (file: OrderFile) => {
    setLoadingFile(file.id);
    try {
      const { data, error } = await supabase.storage
        .from('order-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showSuccess(`Archivo ${file.file_name} descargado.`);
    } catch (error) {
      console.error('Error downloading file:', error);
      showError('Error al descargar el archivo.');
    } finally {
      setLoadingFile(null);
    }
  };

  const handleStatusChange = async (status: OrderStatus) => {
    // Usar el estado local para la verificación inicial
    if (status === order.status) return;
    
    setStatusLoading(true);
    try {
      // Llama a la función del padre que actualiza la DB y recarga el pedido (prop 'order')
      await onStatusUpdate(status); 
      
      // Ya no necesitamos llamar setNewStatus(status) aquí, ya que el useEffect se encargará
      // de sincronizar el estado local cuando el prop 'order.status' cambie después de la recarga del padre.
      
    } catch (error) {
      // Error handled by parent component (OrderDetail)
    } finally {
      setStatusLoading(false);
    }
  };

  const currentStatusConfig = getStatusConfig(order.status);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-text-carbon">
          Archivos y Gestión de Impresión
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sección de Archivos */}
        <div className="border rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary-blue">
            <FileText className="h-5 w-5" /> Archivos ({order.order_files.length})
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Copias</TableHead>
                <TableHead>Configuración</TableHead>
                <TableHead>Precio/Copia</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.order_files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium truncate max-w-[200px]">
                    {file.file_name}
                  </TableCell>
                  <TableCell>{file.copies}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {file.color_mode} / {file.size}
                  </TableCell>
                  <TableCell>${file.price_per_copy.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      disabled={loadingFile === file.id}
                      className="flex items-center gap-1"
                    >
                      {loadingFile === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Descargar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Sección de Gestión de Estado */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary-blue">
            <Printer className="h-5 w-5" /> Gestión de Estado
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">
                Estado Actual:
              </label>
              <Badge variant="outline" className={`mt-1 text-lg font-bold ${currentStatusConfig.className}`}>
                {currentStatusConfig.label}
              </Badge>
            </div>

            <div className="flex-1">
              <label htmlFor="status-select" className="text-sm font-medium text-gray-700">
                Cambiar a:
              </label>
              <Select value={newStatus} onValueChange={(value: OrderStatus) => setNewStatus(value)} disabled={statusLoading}>
                <SelectTrigger id="status-select" className="w-full mt-1">
                  <SelectValue placeholder="Seleccionar nuevo estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="processing">En Proceso</SelectItem>
                  <SelectItem value="ready">Listo para Recoger</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => handleStatusChange(newStatus)}
              disabled={statusLoading || newStatus === order.status}
              className="mt-6 bg-primary-blue hover:bg-blue-700 text-white flex items-center gap-2"
            >
              {statusLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Guardar Estado
            </Button>
          </div>
        </div>

        {/* Sección de Auditoría (Opcional, para mostrar el historial de cambios) */}
        <div className="border rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-4 text-text-carbon">
            Historial de Auditoría
          </h3>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {order.order_audit.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay registros de auditoría.</p>
            ) : (
              order.order_audit.map((audit, index) => (
                <div key={index} className="text-sm p-2 border-b last:border-b-0">
                  <span className="font-medium text-gray-700">{new Date(audit.created_at).toLocaleString('es-ES')}: </span>
                  <span className="text-gray-600">{audit.action}</span>
                  {audit.details?.new_status && (
                    <span className="ml-2 text-primary-blue font-semibold">
                      (Nuevo estado: {audit.details.new_status})
                    </span>
                  )}
                  {audit.details?.total_price && (
                    <span className="ml-2 text-success-green font-semibold">
                      (Total: ${audit.details.total_price.toFixed(2)})
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderFilesWizard;