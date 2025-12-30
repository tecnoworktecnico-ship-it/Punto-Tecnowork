import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, HardDrive, AlertCircle, CheckCircle2, Loader2, Search, FileText, User, Calendar } from 'lucide-react';
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
interface FileRecord { id: string; file_name: string; file_path: string; order_id: string; created_at?: string; orders?: { status: string; created_at: string; profiles?: { first_name: string; last_name: string; } | null; } | null; }

export default function StorageCleaner() { const [loading, setLoading] = useState<'cancelled' | 'search' | string | null>(null); const [result, setResult] = useState<{ type: 'success' | 'error', text: string } | null>(null); const [searchTerm, setSearchTerm] = useState(''); const [files, setFiles] = useState<FileRecord[]>([]); const [showExplorer, setShowExplorer] = useState(false);

// --- 1. FUNCIÓN DE LIMPIEZA MASIVA --- 
const handleCleanCancelled = async () => { 
  if (!confirm('¿Eliminar archivos de pedidos CANCELADOS? Esta acción es irreversible.')) return; 
  setLoading('cancelled'); 
  setResult(null);

  try {
    const { data: orders } = await supabase.from('orders').select('id').eq('status', 'cancelled');
    if (!orders?.length) throw new Error('No hay pedidos cancelados.');
    const { error } = await supabase
      .from('order_files')
      .update({ file_path: 'DELETED_CANCELLED' })
      .in('order_id', orders.map(o => o.id))
      .neq('file_path', 'DELETED_CANCELLED');
    if (error) throw error;
    
    showSuccess(`Se purgaron archivos de ${orders.length} pedidos cancelados.`);
    setResult({ type: 'success', text: `Limpieza de cancelados completada.` });
  } catch (err: any) {
    showError(err.message);
    setResult({ type: 'error', text: err.message });
  } finally {
    setLoading(null);
  }
};

// --- 2. FUNCIONES DEL EXPLORADOR --- 
const handleListRecentFiles = async () => { 
  setLoading('search'); 
  try { 
    const { data, error } = await supabase 
      .from('order_files') 
      .select(`id, file_name, file_path, order_id, created_at, orders ( status, created_at, profiles ( first_name, last_name ) )`) 
      .order('created_at', { ascending: false }) 
      .limit(50);

    if (error) throw error;
    // @ts-ignore
    const activeFiles = (data || []).filter((f: any) => !f.file_path.includes('DELETED'));
    // @ts-ignore
    setFiles(activeFiles);
    
    if (activeFiles.length === 0) setResult({ type: 'error', text: 'No se encontraron archivos activos.' });
    else setResult(null);
  } catch (err: any) {
    console.error(err);
    showError('Error al listar: ' + err.message);
  } finally {
    setLoading(null);
  }
};

const handleDeleteSingle = async (file: FileRecord) => { 
  const p = file.orders?.profiles; 
  const clientName = p ? `${p.first_name} ${p.last_name}` : 'Desconocido';

  if (!confirm(`¿ELIMINAR "${file.file_name}" de ${clientName}?`)) return;
  setLoading(file.id); 
  try { 
    await supabase.storage.from('order-files').remove([file.file_path]); 
    const { error } = await supabase 
      .from('order_files') 
      .update({ file_path: `DELETED_MANUAL_${new Date().toISOString()}` }) 
      .eq('id', file.id);

    if (error) throw error;
    showSuccess('Archivo eliminado.');
    setFiles(prev => prev.filter(f => f.id !== file.id));
  } catch (err: any) {
    showError(err.message);
  } finally {
    setLoading(null);
  }
};

// Filtro local 
const filteredFiles = files.filter(f => { 
  if (!searchTerm) return true; 
  const t = searchTerm.toLowerCase(); 
  const p = f.orders?.profiles; 
  const name = p ? `${p.first_name} ${p.last_name}`.toLowerCase() : ''; 
  return f.file_name?.toLowerCase().includes(t) || name.includes(t); 
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
    <CardContent className="space-y-6 pt-6">
      {/* Masiva */}
      <div className="p-4 bg-red-50 rounded-lg border border-red-100 flex justify-between items-center gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-red-800 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Limpieza Masiva</span>
          <span className="text-xs text-red-600">Elimina archivos de pedidos CANCELADOS.</span>
        </div>
        <Button size="sm" variant="destructive" onClick={handleCleanCancelled} disabled={!!loading}>
          {loading === 'cancelled' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Purgar Todo'}
        </Button>
      </div>
      {result && !showExplorer && (
        <div className={`text-xs flex items-center gap-1 p-2 rounded ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {result.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{result.text}
        </div>
      )}
      {/* Quirúrgica */}
      <div className="border-t pt-4">
        <div className="flex justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Search className="w-4 h-4" /> Explorador</h4>
          <Button variant="outline" size="sm" onClick={() => { setShowExplorer(!showExplorer); if (!showExplorer && files.length === 0) handleListRecentFiles(); }}>
            {showExplorer ? 'Ocultar' : 'Ver Archivos'}
          </Button>
        </div>
        {showExplorer && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex gap-2">
              <Input placeholder="Buscar archivo o cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-9 text-sm" />
              <Button onClick={handleListRecentFiles} disabled={loading === 'search'} size="sm" variant="secondary">
                {loading === 'search' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              </Button>
            </div>
            <div className="border rounded-md max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader><TableRow className="bg-gray-50 sticky top-0"><TableHead>Archivo</TableHead><TableHead>Cliente</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading === 'search' ? <TableRow><TableCell colSpan={3} className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500"/></TableCell></TableRow> :
                   filteredFiles.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-4 text-sm text-gray-500">Sin resultados.</TableCell></TableRow> :
                   filteredFiles.map(f => (
                    <TableRow key={f.id} className="hover:bg-gray-50">
                      <TableCell className="py-2"><div className="flex flex-col"><span className="font-medium text-xs flex gap-1 text-gray-700"><FileText className="w-3 h-3 text-blue-500"/>{f.file_name}</span><span className="text-[10px] text-gray-400 ml-4">{new Date(f.created_at || '').toLocaleDateString()}</span></div></TableCell>
                      <TableCell className="py-2"><div className="flex flex-col"><span className="text-xs font-semibold text-gray-600 flex gap-1"><User className="w-3 h-3"/>{f.orders?.profiles ? `${f.orders.profiles.first_name} ${f.orders.profiles.last_name}` : 'Desconocido'}</span><Badge variant="outline" className="text-[10px] w-fit">{f.orders?.status}</Badge></div></TableCell>
                      <TableCell className="text-right py-2"><Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" onClick={() => handleDeleteSingle(f)} disabled={!!loading}>{loading === f.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Trash2 className="w-4 h-4"/>}</Button></TableCell>
                    </TableRow>
                  ))}
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
); }