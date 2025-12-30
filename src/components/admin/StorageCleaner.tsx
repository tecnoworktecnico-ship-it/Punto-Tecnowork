"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, HardDrive, AlertCircle, CheckCircle2, Loader2, Search, FileText, User, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { showSuccess, showError } from '@/utils/toast';

// Interfaz corregida para reflejar first_name y last_name de la tabla profiles
interface FileRecord { 
  id: string; 
  file_name: string; 
  file_path: string; 
  order_id: string; 
  created_at?: string; 
  orders?: { 
    status: string; 
    created_at: string; 
    profiles?: { 
      first_name: string; 
      last_name: string; 
      email: string;
    } | null; 
  } | null; 
}

export default function StorageCleaner() { 
  const [loading, setLoading] = useState<'cancelled' | 'search' | string | null>(null); 
  const [result, setResult] = useState<{ type: 'success' | 'error', text: string } | null>(null); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [files, setFiles] = useState<FileRecord[]>([]); 
  const [showExplorer, setShowExplorer] = useState(false);

  // --- 1. FUNCIÓN DE LIMPIEZA MASIVA (Zona de Peligro) ---
  const handleCleanCancelled = async () => { 
    if (!confirm('¿Purgar archivos de pedidos CANCELADOS? Esta acción es irreversible y solo marca los archivos en la BD como eliminados (DELETED_CANCELLED).')) return; 
    setLoading('cancelled'); 
    setResult(null);

    try {
      // 1. Buscar pedidos cancelados
      const { data: orders } = await supabase.from('orders').select('id').eq('status', 'cancelled');
      if (!orders?.length) throw new Error('No hay pedidos cancelados para limpiar.');
      
      // 2. Marcar archivos como borrados en la BD
      const { error } = await supabase
        .from('order_files')
        .update({ file_path: 'DELETED_CANCELLED' })
        .in('order_id', orders.map(o => o.id))
        .neq('file_path', 'DELETED_CANCELLED'); // Evitar re-procesar los ya borrados
      
      if (error) throw error;
      
      showSuccess(`Se purgaron archivos de ${orders.length} pedidos cancelados.`);
      setResult({ type: 'success', text: `Limpieza de cancelados completada exitosamente.` });
    } catch (err: any) {
      showError(err.message);
      setResult({ type: 'error', text: err.message });
    } finally {
      setLoading(null);
    }
  };

  // --- 2. FUNCIONES DEL EXPLORADOR (Quirúrgicas) ---
  const handleListRecentFiles = async () => { 
    setLoading('search'); 
    try { 
      // Consulta con JOINs profundos para obtener datos legibles (Cliente, Estado) 
      const { data, error } = await supabase
        .from('order_files')
        .select(`
          id, 
          file_name, 
          file_path, 
          order_id, 
          created_at, 
          orders ( 
            status, 
            created_at, 
            profiles ( first_name, last_name, email ) 
          )
        `)
        .order('created_at', { ascending: false }) // Los más nuevos primero 
        .limit(50);

      if (error) throw error;
      
      // Filtramos localmente los que ya tienen la marca 'DELETED' en el path
      // @ts-ignore - Supabase a veces infiere tipos genéricos que causan conflicto en IDEs estrictos
      const activeFiles = (data || []).filter((f: any) => !f.file_path.includes('DELETED'));
      
      // @ts-ignore
      setFiles(activeFiles);
      
      if (activeFiles.length === 0) {
        setResult({ type: 'error', text: 'No se encontraron archivos activos recientes.' });
      } else {
        setResult(null);
      }
    } catch (err: any) {
      console.error(err);
      showError('Error al listar archivos: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteSingle = async (file: FileRecord) => { 
    const clientName = `${file.orders?.profiles?.first_name || ''} ${file.orders?.profiles?.last_name || ''}`.trim() || 'Desconocido';
    
    if (!confirm(`¿Estás seguro de ELIMINAR el archivo:\n"${file.file_name}"\nDel cliente: ${clientName}?`)) return;

    setLoading(file.id);
    try {
      // A. Borrado Físico del Storage
      const { error: storageError } = await supabase.storage
        .from('order-files')
        .remove([file.file_path]);
      
      if (storageError) {
        console.warn('Advertencia Storage (puede que el archivo ya no existiera):', storageError);
      }
      
      // B. Borrado Lógico en Base de Datos (Marca para el cliente)
      const { error: dbError } = await supabase
        .from('order_files')
        .update({ file_path: `DELETED_MANUAL_${new Date().toISOString()}` })
        .eq('id', file.id);
      
      if (dbError) throw dbError;
      
      showSuccess('Archivo eliminado correctamente.');
      
      // Actualizar la lista visualmente sin recargar
      setFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(null);
    }
  };

  // Filtro local para búsqueda instantánea 
  const filteredFiles = files.filter(f => { 
    if (!searchTerm) return true; 
    const term = searchTerm.toLowerCase(); 
    const fileName = f.file_name?.toLowerCase() || ''; 
    
    const clientFirstName = f.orders?.profiles?.first_name?.toLowerCase() || '';
    const clientLastName = f.orders?.profiles?.last_name?.toLowerCase() || '';
    const clientEmail = f.orders?.profiles?.email?.toLowerCase() || '';

    return fileName.includes(term) || clientFirstName.includes(term) || clientLastName.includes(term) || clientEmail.includes(term);
  });

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <HardDrive className="w-6 h-6 text-orange-600" />
          <CardTitle className="text-lg font-bold text-gray-800">Gestor de Archivos</CardTitle>
        </div>
        <CardDescription>Mantenimiento de almacenamiento y limpieza.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Panel de Acciones Masivas */}
        <div className="p-4 bg-red-50 rounded-lg border border-red-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-red-800 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Zona de Limpieza Masiva
            </span>
            <span className="text-xs text-red-600">Marca archivos de pedidos CANCELADOS como eliminados.</span>
          </div>
          <Button 
            size="sm" 
            variant="destructive"
            onClick={handleCleanCancelled}
            disabled={!!loading}
          >
            {loading === 'cancelled' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Purgar Cancelados
          </Button>
        </div>
        
        {/* Mensajes de Resultado Masivo */}
        {result && !showExplorer && (
          <div className={`text-xs flex items-center gap-1 p-2 rounded ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {result.text}
          </div>
        )}
        
        {/* Explorador de Archivos (Bisturí Digital) */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Search className="w-4 h-4" /> Explorador de Archivos Recientes
            </h4>
            <Button 
              variant="outline" 
              size="sm" 
              className={showExplorer ? "bg-gray-100" : ""}
              onClick={() => {
                setShowExplorer(!showExplorer);
                if (!showExplorer && files.length === 0) handleListRecentFiles();
              }}
            >
              {showExplorer ? 'Ocultar Lista' : 'Ver Archivos'}
            </Button>
          </div>
          {showExplorer && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              {/* Barra de Búsqueda */}
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input 
                    placeholder="Buscar por nombre de archivo, cliente..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <Button onClick={handleListRecentFiles} disabled={loading === 'search'} size="sm" variant="secondary">
                  <RefreshCw className="w-4 h-4 mr-2" /> Recargar
                </Button>
              </div>
              {/* Tabla de Resultados */}
              <div className="border rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 sticky top-0 shadow-sm">
                      <TableHead>Archivo / Fecha</TableHead>
                      <TableHead>Cliente / Estado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading === 'search' ? (
                       <TableRow>
                         <TableCell colSpan={3} className="text-center py-8">
                           <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-blue mb-2" />
                           <span className="text-xs text-gray-500">Cargando archivos del sistema...</span>
                         </TableCell>
                       </TableRow>
                    ) : filteredFiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-gray-500 text-sm">
                          {searchTerm ? 'No se encontraron coincidencias.' : 'No hay archivos recientes activos.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFiles.map((file) => {
                        const clientName = `${file.orders?.profiles?.first_name || ''} ${file.orders?.profiles?.last_name || ''}`.trim() || 'Desconocido';
                        
                        return (
                          <TableRow key={file.id} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="py-3">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-xs flex items-center gap-2 text-gray-700" title={file.file_name}>
                                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                  <span className="truncate max-w-[200px]">{file.file_name}</span>
                                </span>
                                <span className="text-[10px] text-gray-400 flex items-center gap-1 ml-6">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(file.created_at || '').toLocaleDateString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {clientName}
                                </span>
                                <div>
                                  <Badge variant="outline" className="text-[10px] py-0 h-5 font-normal">
                                    {file.orders?.status || 'N/A'}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                onClick={() => handleDeleteSingle(file)}
                                disabled={loading === file.id}
                                title="Eliminar este archivo"
                              >
                                {loading === file.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-[10px] text-gray-400 text-center italic">
                * Eliminar un archivo aquí impedirá su descarga por parte del cliente y del administrador.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}