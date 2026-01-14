import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, HardDrive, AlertCircle, CheckCircle2, Loader2, Search, FileText, User, Clock, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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

interface FileRecord {
  id: string;
  file_name: string;
  file_path: string;
  order_id: string;
  created_at?: string;
  orders?: {
    status: string;
    created_at: string;
    client_id: string; // Simplificado para evitar errores de tipo
  } | null;
  // Propiedad extendida para UI
  client_name?: string;
}

export default function StorageCleaner() {
  const [loading, setLoading] = useState<'cancelled' | 'old' | 'search' | string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [showExplorer, setShowExplorer] = useState(false);
  const [autoPurge, setAutoPurge] = useState(false);

  // Cargar preferencia de Auto-Purga al iniciar
  useEffect(() => {
    const savedAutoPurge = localStorage.getItem('auto_purge_enabled') === 'true';
    setAutoPurge(savedAutoPurge);
    
    // Si está activado, ejecutar limpieza silenciosa al montar el componente
    if (savedAutoPurge) {
      runSilentAutoPurge();
    }
  }, []);

  const toggleAutoPurge = (enabled: boolean) => {
    setAutoPurge(enabled);
    localStorage.setItem('auto_purge_enabled', String(enabled));
    if (enabled) {
      showSuccess('Limpieza automática activada. Se ejecutará al entrar a esta página.');
      runSilentAutoPurge();
    } else {
      showSuccess('Limpieza automática desactivada.');
    }
  };

  const runSilentAutoPurge = async () => {
    console.log('Ejecutando Auto-Purga silenciosa...');
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const isoDate = cutoffDate.toISOString();

      const { data: oldFiles } = await supabase
        .from('order_files')
        .select('id, file_path')
        .lt('created_at', isoDate);

      const targetFiles = (oldFiles || []).filter((f: any) => !f.file_path.includes('DELETED'));

      if (targetFiles.length > 0) {
        let count = 0;
        for (const file of targetFiles) {
          await supabase.storage.from('order-files').remove([file.file_path]);
          await supabase.from('order_files').update({ file_path: `DELETED_OLD_${new Date().toISOString()}` }).eq('id', file.id);
          count++;
        }
        if (count > 0) {
          showSuccess(`Auto-Purga: Se eliminaron ${count} archivos antiguos.`);
        }
      }
    } catch (e) {
      console.error('Error en auto-purga:', e);
    }
  };

  // --- 1. FUNCIÓN DE LIMPIEZA MASIVA ---
  const handleCleanCancelled = async () => {
    if (!confirm('¿Eliminar archivos de pedidos CANCELADOS?')) return;
    setLoading('cancelled');
    setResult(null);
    
    try {
      const { data: orders } = await supabase.from('orders').select('id').eq('status', 'cancelled');
      if (!orders?.length) throw new Error('No hay pedidos cancelados.');

      await supabase
        .from('order_files')
        .update({ file_path: 'DELETED_CANCELLED' })
        .in('order_id', orders.map(o => o.id));
      
      showSuccess(`Proceso finalizado para ${orders.length} pedidos.`);
      setResult({ type: 'success', text: `Limpieza de cancelados ejecutada.` });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(null);
    }
  };

  // --- 2. FUNCIÓN DE LIMPIEZA POR ANTIGÜEDAD (MANUAL) ---
  const handleCleanOldFiles = async () => {
    if (!confirm('¿Buscar y eliminar archivos de hace MÁS DE 30 DÍAS?')) return;
    setLoading('old');
    setResult(null);

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const isoDate = cutoffDate.toISOString();

      const { data: oldFiles, error } = await supabase
        .from('order_files')
        .select('id, file_path, file_name')
        .lt('created_at', isoDate);

      if (error) throw error;

      const targetFiles = (oldFiles || []).filter((f: any) => !f.file_path.includes('DELETED'));

      if (targetFiles.length === 0) {
        showSuccess('No hay archivos antiguos activos.');
        setResult({ type: 'success', text: 'No se encontraron archivos mayores a 30 días.' });
        return;
      }

      if (!confirm(`Se encontraron ${targetFiles.length} archivos antiguos. ¿Eliminarlos?`)) return;

      let successCount = 0;
      for (const file of targetFiles) {
        await supabase.storage.from('order-files').remove([file.file_path]);
        await supabase.from('order_files').update({ file_path: `DELETED_OLD_${new Date().toISOString()}` }).eq('id', file.id);
        successCount++;
      }

      showSuccess(`Se eliminaron ${successCount} archivos antiguos.`);
      setResult({ type: 'success', text: `Limpieza de antigüedad completada (${successCount} archivos).` });

    } catch (err: any) {
      showError('Error: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  // --- 3. FUNCIONES DEL EXPLORADOR ---
  const handleListRecentFiles = async () => {
    setLoading('search');
    try {
      const { data, error } = await supabase
        .from('order_files')
        .select(`
          id, file_name, file_path, order_id, created_at, 
          orders ( status, created_at, client_id )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const activeFiles = (data || []).filter((f: any) => !f.file_path.includes('DELETED'));
      
      const clientIds = [...new Set(activeFiles.map((f: any) => f.orders?.client_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      
      if (clientIds.length > 0) {
        // CORREGIDO: Usar select('*') para evitar errores 406
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', clientIds);
        if (profiles) profiles.forEach(p => profilesMap[p.id] = p);
      }

      const enrichedFiles = activeFiles.map((f: any) => ({
        ...f,
        client_name: f.orders?.client_id && profilesMap[f.orders.client_id] 
          ? `${profilesMap[f.orders.client_id].first_name || ''} ${profilesMap[f.orders.client_id].last_name || ''}`.trim()
          : 'Desconocido'
      }));

      setFiles(enrichedFiles);
      if (enrichedFiles.length === 0) setResult({ type: 'error', text: 'No se encontraron archivos activos.' });
      else setResult(null);

    } catch (err: any) {
      showError('Error al listar: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteSingle = async (file: FileRecord) => {
    if (!confirm(`¿ELIMINAR ARCHIVO FÍSICO?\n"${file.file_name}"`)) return;
    
    setLoading(file.id);
    try {
      await supabase.storage.from('order-files').remove([file.file_path]);
      await supabase
        .from('order_files')
        .update({ file_path: `DELETED_MANUAL_${new Date().toISOString()}` })
        .eq('id', file.id);

      showSuccess('Archivo eliminado.');
      setFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (err: any) {
      showError('Error: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  const filteredFiles = files.filter(f => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    const name = f.client_name?.toLowerCase() || '';
    return f.file_name?.toLowerCase().includes(t) || name.includes(t);
  });

  return (
    <Card className="shadow-md bg-white">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><HardDrive className="w-6 h-6" /></div>
          <div><CardTitle className="text-lg font-bold text-gray-800">Gestor de Archivos</CardTitle><CardDescription>Mantenimiento de almacenamiento.</CardDescription></div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. Limpieza Masiva */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-100 flex flex-col justify-between gap-3">
            <div>
              <span className="text-sm font-bold text-red-800 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Cancelados</span>
              <p className="text-xs text-red-600 mt-1">Limpia archivos de pedidos cancelados.</p>
            </div>
            <Button size="sm" variant="destructive" onClick={handleCleanCancelled} disabled={!!loading} className="w-full">
              {loading === 'cancelled' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Purgar Cancelados'}
            </Button>
          </div>

          {/* 2. Limpieza por Antigüedad + Switch */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex flex-col justify-between gap-3">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-blue-800 flex items-center gap-2"><Clock className="w-4 h-4" /> Antigüedad (+30d)</span>
                <div className="flex items-center space-x-2">
                  <Switch id="auto-purge" checked={autoPurge} onCheckedChange={toggleAutoPurge} />
                  <Label htmlFor="auto-purge" className="text-xs text-blue-700 font-semibold cursor-pointer">Auto</Label>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {autoPurge ? 'Automático: Se limpia al entrar.' : 'Manual: Presiona para limpiar.'}
              </p>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full" onClick={handleCleanOldFiles} disabled={!!loading}>
              {loading === 'old' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Purgar Manual'}
            </Button>
          </div>
        </div>

        {result && !showExplorer && (
          <div className={`text-xs flex items-center gap-1 p-2 rounded ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{result.text}
          </div>
        )}

        {/* 3. Explorador */}
        <div className="border-t pt-4">
          <div className="flex justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Search className="w-4 h-4" /> Explorador Manual</h4>
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
                        <TableCell className="py-2"><div className="flex flex-col"><span className="text-xs font-semibold text-gray-600 flex gap-1"><User className="w-3 h-3"/>{f.client_name}</span><Badge variant="outline" className="text-[10px] w-fit">{f.orders?.status}</Badge></div></TableCell>
                        <TableCell className="text-right py-2"><Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" onClick={() => handleDeleteSingle(f)} disabled={!!loading}>{loading === f.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Trash2 className="w-4 h-4"/>}</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}