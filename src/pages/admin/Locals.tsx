"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Local {
  id: string;
  name: string;
  address: string | null;
  has_photo_print: boolean;
  manager_id: string | null;
  can_edit_prices: boolean;
  created_at: string;
}

const Locals = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [locals, setLocals] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocal, setEditingLocal] = useState<Local | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    has_photo_print: false,
    can_edit_prices: false,
  });

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'admin') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/admin/dashboard');
    }

    if (!sessionLoading && profile?.role === 'admin') {
      fetchLocals();
    }
  }, [sessionLoading, profile, navigate]);

  const fetchLocals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('locals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching locals:', error);
      showError('Error al cargar los locales.');
    } else {
      setLocals(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingLocal) {
      const { error } = await supabase
        .from('locals')
        .update(formData)
        .eq('id', editingLocal.id);

      if (error) {
        console.error('Error updating local:', error);
        showError('Error al actualizar el local.');
      } else {
        showSuccess('Local actualizado correctamente.');
        setDialogOpen(false);
        setEditingLocal(null);
        resetForm();
        fetchLocals();
      }
    } else {
      const { error } = await supabase
        .from('locals')
        .insert([formData]);

      if (error) {
        console.error('Error creating local:', error);
        showError('Error al crear el local.');
      } else {
        showSuccess('Local creado correctamente.');
        setDialogOpen(false);
        resetForm();
        fetchLocals();
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este local?')) return;

    setLoading(true);
    const { error } = await supabase
      .from('locals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting local:', error);
      showError('Error al eliminar el local.');
    } else {
      showSuccess('Local eliminado correctamente.');
      fetchLocals();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      has_photo_print: false,
      can_edit_prices: false,
    });
  };

  const openEditDialog = (local: Local) => {
    setEditingLocal(local);
    setFormData({
      name: local.name,
      address: local.address || '',
      has_photo_print: local.has_photo_print,
      can_edit_prices: local.can_edit_prices,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingLocal(null);
    resetForm();
    setDialogOpen(true);
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando locales...</p>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
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
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-2 text-text-carbon hover:text-primary-blue"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver al Dashboard
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={openCreateDialog}
                    className="bg-primary-blue hover:bg-blue-700 text-white flex items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Nuevo Local
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingLocal ? 'Editar Local' : 'Crear Nuevo Local'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingLocal
                        ? 'Modifica los datos del local.'
                        : 'Completa los datos para crear un nuevo local.'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nombre del Local *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                        placeholder="Ej: Local Centro"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Dirección</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        placeholder="Ej: Calle Principal 123"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="has_photo_print">
                        ¿Tiene impresión de fotos?
                      </Label>
                      <Switch
                        id="has_photo_print"
                        checked={formData.has_photo_print}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, has_photo_print: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="can_edit_prices">
                        ¿Puede editar precios?
                      </Label>
                      <Switch
                        id="can_edit_prices"
                        checked={formData.can_edit_prices}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, can_edit_prices: checked })
                        }
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false);
                          setEditingLocal(null);
                          resetForm();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="bg-primary-blue hover:bg-blue-700 text-white"
                      >
                        {editingLocal ? 'Actualizar' : 'Crear'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon">
              Gestión de Locales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay locales registrados. Crea uno nuevo para comenzar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Impresión Fotos</TableHead>
                    <TableHead>Editar Precios</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locals.map((local) => (
                    <TableRow key={local.id}>
                      <TableCell className="font-medium">{local.name}</TableCell>
                      <TableCell>{local.address || 'N/A'}</TableCell>
                      <TableCell>
                        {local.has_photo_print ? (
                          <span className="text-success-green">Sí</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {local.can_edit_prices ? (
                          <span className="text-success-green">Sí</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(local)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(local.id)}
                            className="text-emphasis-red hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

export default Locals;