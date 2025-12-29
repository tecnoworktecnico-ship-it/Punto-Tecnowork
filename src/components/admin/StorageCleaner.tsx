"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';
import { Trash2, Archive, Loader2, AlertTriangle } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Constantes para marcadores de eliminación
const DELETED_CANCELLED_MARKER = 'DELETED_CANCELLED';
const DELETED_EXPIRED_MARKER = 'DELETED_EXPIRED';

// Función auxiliar para simular la eliminación de archivos en Storage
// Nota: Supabase Storage no tiene una API para eliminar múltiples archivos por filtro,
// por lo que necesitamos obtener las rutas de los archivos primero.
const deleteFilesFromStorage = async (filePaths: string[]): Promise<{ deletedCount: number, totalSizeMB: number }> => {
  if (filePaths.length === 0) {
    return { deletedCount: 0, totalSizeMB: 0 };
  }

  // Supabase Storage API requiere un array de rutas
  const { data, error } = await supabase.storage
    .from('order-files')
    .remove(filePaths);

  if (error) {
    console.error('Error deleting files from storage:', error);
    throw new Error(`Error al eliminar archivos del almacenamiento: ${error.message}`);
  }

  // Simulación de tamaño liberado (asumiendo un promedio de 5MB por archivo)
  const deletedCount = data?.length || 0;
  const totalSizeMB = deletedCount * 5; 

  return { deletedCount, totalSizeMB };
};

const StorageCleaner: React.FC = () => {
  const { profile } = useSession();
  const [loadingCancelled, setLoadingCancelled] = useState(false);
  const [loadingExpired, setLoadingExpired] = useState(false);

  const checkAdmin = () => {
    if (profile?.role !== 'admin') {
      showError('Acceso denegado. Solo administradores pueden realizar esta acción.');
      return false;
    }
    return true;
  };

  // 1. Limpiar Pedidos Cancelados
  const handleCleanCancelled = async () => {
    if (!checkAdmin() || loadingCancelled) return;

    if (!confirm('ADVERTENCIA: ¿Estás seguro de que deseas eliminar permanentemente los archivos de TODOS los pedidos cancelados?')) {
      return;
    }

    setLoadingCancelled(true);

    try {
      // 1. Obtener todos los archivos de pedidos cancelados que aún no han sido marcados como eliminados
      const { data: filesToClean, error: filesError } = await supabase
        .from('order_files')
        .select(`
          id,
          file_path,
          orders!inner ( status )
        `)
        .eq('orders.status', 'cancelled')
        .neq('file_path', DELETED_CANCELLED_MARKER)
        .neq('file_path', DELETED_EXPIRED_MARKER);

      if (filesError) throw new Error(`Error al buscar archivos: ${filesError.message}`);

      const filePaths = filesToClean.map(f => f.file_path).filter((p): p is string => !!p);
      const fileIds = filesToClean.map(f => f.id);
      
      if (filePaths.length === 0) {
        showSuccess('No se encontraron archivos de pedidos cancelados pendientes de limpieza.');
        setLoadingCancelled(false);
        return;
      }

      // 2. Eliminar archivos del Storage
      const { deletedCount, totalSizeMB } = await deleteFilesFromStorage(filePaths);

      // 3. Marcar los registros en la base de datos
      const { error: updateError } = await supabase
        .from('order_files')
        .update({ file_path: DELETED_CANCELLED_MARKER })
        .in('id', fileIds);

      if (updateError) {
        console.error('Error marking files as deleted in DB:', updateError);
        showError('Archivos eliminados del storage, pero hubo un error al actualizar la base de datos.');
        return;
      }

      showSuccess(`Limpieza de Cancelados completada. Se eliminaron ${deletedCount} archivo(s) y se liberaron aproximadamente ${totalSizeMB.toFixed(2)} MB.`);

    } catch (error) {
      console.error('Error cleaning cancelled files:', error);
      showError(error instanceof Error ? error.message : 'Error inesperado al limpiar archivos cancelados.');
    } finally {
      setLoadingCancelled(false);
    }
  };

  // 2. Archivar Pedidos Completados Antiguos (> 30 días)
  const handleArchiveExpired = async () => {
    if (!checkAdmin() || loadingExpired) return;

    if (!confirm('ADVERTENCIA: ¿Estás seguro de que deseas eliminar permanentemente los archivos de pedidos completados hace más de 30 días?')) {
      return;
    }

    setLoadingExpired(true);

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString();

      // 1. Obtener todos los archivos de pedidos completados antiguos que aún no han sido marcados como eliminados
      const { data: filesToArchive, error: filesError } = await supabase
        .from('order_files')
        .select(`
          id,
          file_path,
          orders!inner ( status, created_at )
        `)
        .eq('orders.status', 'completed')
        .lt('orders.created_at', cutoffDate)
        .neq('file_path', DELETED_CANCELLED_MARKER)
        .neq('file_path', DELETED_EXPIRED_MARKER);

      if (filesError) throw new Error(`Error al buscar archivos: ${filesError.message}`);

      const filePaths = filesToArchive.map(f => f.file_path).filter((p): p is string => !!p);
      const fileIds = filesToArchive.map(f => f.id);

      if (filePaths.length === 0) {
        showSuccess('No se encontraron archivos de pedidos completados antiguos pendientes de archivar.');
        setLoadingExpired(false);
        return;
      }

      // 2. Eliminar archivos del Storage
      const { deletedCount, totalSizeMB } = await deleteFilesFromStorage(filePaths);

      // 3. Marcar los registros en la base de datos
      const { error: updateError } = await supabase
        .from('order_files')
        .update({ file_path: DELETED_EXPIRED_MARKER })
        .in('id', fileIds);

      if (updateError) {
        console.error('Error marking files as deleted in DB:', updateError);
        showError('Archivos eliminados del storage, pero hubo un error al actualizar la base de datos.');
        return;
      }

      showSuccess(`Archivado de Antiguos completado. Se eliminaron ${deletedCount} archivo(s) y se liberaron aproximadamente ${totalSizeMB.toFixed(2)} MB.`);

    } catch (error) {
      console.error('Error archiving expired files:', error);
      showError(error instanceof Error ? error.message : 'Error inesperado al archivar archivos.');
    } finally {
      setLoadingExpired(false);
    }
  };

  return (
    <Card className="bg-white border-l-4 border-l-emphasis-red border-y-gray-200 border-r-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg border border-red-100">
            <AlertTriangle className="h-6 w-6 text-emphasis-red" />
          </div>
          <div>
            <CardTitle className="text-gray-800 text-lg">Limpieza de Almacenamiento</CardTitle>
            <CardDescription className="text-gray-500">Elimina archivos innecesarios de Supabase Storage.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        
        {/* Limpiar Cancelados */}
        <Button
          onClick={handleCleanCancelled}
          disabled={loadingCancelled || loadingExpired}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 h-auto min-h-[44px] bg-emphasis-red hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-md whitespace-normal leading-tight"
        >
          {loadingCancelled ? (
            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
          ) : (
            <Trash2 className="w-5 h-5 shrink-0" />
          )}
          <span className="text-center">
            {loadingCancelled ? 'Buscando y Borrando...' : 'Limpiar Archivos Cancelados (Basura Inmediata)'}
          </span>
        </Button>

        {/* Archivar Antiguos */}
        <Button
          onClick={handleArchiveExpired}
          disabled={loadingCancelled || loadingExpired}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 h-auto min-h-[44px] bg-primary-blue hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-md whitespace-normal leading-tight"
        >
          {loadingExpired ? (
            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
          ) : (
            <Archive className="w-5 h-5 shrink-0" />
          )}
          <span className="text-center">
            {loadingExpired ? 'Buscando y Archivando...' : 'Archivar Archivos Completados (>30 Días)'}
          </span>
        </Button>
        
      </CardContent>
    </Card>
  );
};

export default StorageCleaner;