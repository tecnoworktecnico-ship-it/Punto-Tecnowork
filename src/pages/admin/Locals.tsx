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
import { ArrowLeft, Plus, Edit, Trash2, UserCog } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Local {
  id: string;
  name: string;
  address: string | null;
  has_photo_print: boolean;
  manager_id: string | null;
  can_edit_prices: boolean;
  created_at: string;
  manager_email?: string;
  manager_name?: string;
}

interface LocalUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

const Locals = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [locals, setLocals] = useState<Local[]>([]);
  const [localUsers, setLocalUsers] = useState<LocalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingLocal, setEditingLocal] = useState<Local | null>(null);
  const [selectedLocalForAssign, setSelectedLocalForAssign] = useState<Local | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
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
      fetchData();
    }
  }, [sessionLoading, profile, navigate]);

  const fetchData = async () => {
    setLoading(true);

    // Obtener locales con información del manager
    const { data: localsData, error: localsError } = await supabase
      .rpc('get_users_with_emails');

    if (localsError) {
      console.error('Error fetching users:', localsError);
    }

    // Obtener locales
    const { data: localsRawData, error: localsRawError } = await supabase
      .from('locals')
      .select('*')
      .order('created_at', { ascending: false });

    if (localsRawError) {
      console.error('Error fetching locals:', localsRawError);
      showError('Error al cargar los locales.');
      setLoading(false);
      return;
    }

    // Combinar datos de locales con información de managers
    const localsWithManagers = localsRawData?.map(local => {
      const manager = localsData?.find((u: any) => u.id === local.manager_id);
      return {
        ...local,
        manager_email: manager?.email,
        manager_name: manager?.first_name || manager?.last_name 
          ? `${manager?.first_name || ''} ${manager?.last_name || ''}`.trim()
          : undefined,
      };
    });

    setLocals(localsWithManagers || []);

    // Obtener usuarios con rol 'local' que no tienen local asignado
    const usersWithLocal = localsData?.filter((u: any) => u.role === 'local') || [];
    setLocalUsers(usersWithLocal);

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const localData = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        has_photo_print: formData.has_photo_print,
        can_edit_prices: formData.can_edit_prices,
        manager_id: null,
      };

      if (editingLocal) {
        const { error } = await supabase
          .from('locals')
          .update(localData)
          .eq('id', editingLocal.id);

        if (error) {
          console.error('Error updating local:', error);
          showError(`Error al actualizar el local: ${error.message}`);
        } else {
          showSuccess('Local actualizado correctamente.');
          setDialogOpen(false);
          setEditingLocal(null);
          resetForm();
          fetchData();
        }
      } else {
        const { data, error } = await supabase
          .from('locals')
          .insert([localData])
          .select();

        if (error) {
          console.error('Error creating local:', error);
          showError(`Error al crear el local: ${error.message}`);
        } else {
          console.log('Local creado:', data);
          showSuccess('Local creado correctamente.');
          setDialogOpen(false);
          resetForm();
          fetchData();
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      showError('Error inesperado al procesar la solicitud.');
    }

    setLoading(false);
  };

  const handleAssignManager = async () => {
    if (!selectedLocalForAssign || !selectedUserId) {
      showError('Por favor selecciona un usuario.');
      return;
    }

    setLoading(true);

    // Primero, desasignar el usuario de cualquier otro local
    const { error: unassignError } = await supabase
      .from('locals')
      .update({ manager_id: null })
      .eq('manager_id', selectedUserId);

    if (unassignError) {
      console.error('Error unassigning user:', unassignError);
    }

    // Asignar el usuario al local seleccionado
    const { error } = await supabase
      .from('locals')
      .update({ manager_id: selectedUserId })
      .eq('id', selectedLocalForAssign.id);

    if (error) {
      console.error('Error assigning manager:', error);
      showError(`Error al asignar manager: ${error.message}`);
    } else {
      showSuccess('Manager asignado correctamente al local.');
      setAssignDialogOpen(false);
      setSelectedLocalForAssign(null);
      setSelectedUserId('');
      fetchData();
    }

    setLoading(false);
  };

  const handleUnassignManager = async (localId: string) => {
    if (!confirm('¿Estás seguro de que deseas desasignar el manager de este local?')) return;

    setLoading(true);

    const { error } = await supabase
      .from('locals')
      .update({ manager_id: null })
      .eq('id', localId);

    if (error) {
      console.error('Error unassigning manager:', error);
      showError(`Error al desasignar manager: ${error.message}`);
    } else {
      showSuccess('Manager desasignado correctamente.');
      fetchData();
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
      showError(`Error al eliminar el local: ${error.message}`);
    } else {
      showSuccess('Local eliminado correctamente.');
      fetchData();
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

  const openAssignDialog = (local: Local) => {
    setSelectedLocalForAssign(local);
    setSelectedUserId(local.manager_id || '');
    setAssignDialogOpen(true);
  };

  const getAvailableUsers = () => {
    // Usuarios que no tienen local asignado o que tienen el local actual
    const assignedManagerIds = locals
      .filter(l => l.manager_id && l.id !== selectedLocalForAssign?.id)
      .map(l => l.manager_id);
    
    return localUsers.filter(u => !assignedManagerIds.includes(u.id));
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
                        disabled={loading}
                        className="bg-primary-blue hover:bg-blue-700 text-white"
                      >
                        {loading ? 'Procesando...' : (editingLocal ? 'Actualizar' : 'Crear')}
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
                    <TableHead>Manager</TableHead>
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
                        {local.manager_id ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {local.manager_name || 'Sin nombre'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {local.manager_email || 'Sin correo'}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            Sin asignar
                          </Badge>
                        )}
                      </TableCell>
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
                            onClick={() => openAssignDialog(local)}
                            title="Asignar/Cambiar Manager"
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
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

        {/* Dialog para asignar manager */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Asignar Manager al Local</DialogTitle>
              <DialogDescription>
                Selecciona un usuario con rol "local" para asignar como manager de {selectedLocalForAssign?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="manager">Usuario Manager</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {getAvailableUsers().map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name || user.last_name
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getAvailableUsers().length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    No hay usuarios con rol "local" disponibles. Crea uno desde Gestión de Usuarios.
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAssignDialogOpen(false);
                    setSelectedLocalForAssign(null);
                    setSelectedUserId('');
                  }}
                >
                  Cancelar
                </Button>
                {selectedLocalForAssign?.manager_id && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      handleUnassignManager(selectedLocalForAssign.id);
                      setAssignDialogOpen(false);
                    }}
                    className="text-emphasis-red hover:text-red-700"
                  >
                    Desasignar
                  </Button>
                )}
                <Button
                  onClick={handleAssignManager}
                  disabled={loading || !selectedUserId || selectedUserId === 'none'}
                  className="bg-primary-blue hover:bg-blue-700 text-white"
                >
                  {loading ? 'Asignando...' : 'Asignar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Locals;