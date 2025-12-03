"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Edit, Trash2 } from 'lucide-react';
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

interface User {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  local?: {
    name: string;
  };
}

const Users = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [locals, setLocals] = useState<{id: string, name: string, manager_id: string | null}[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    role: 'client',
    first_name: '',
    last_name: '',
    local_id: '',
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

    // Fetch users with their local info
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select(`
        *,
        locals (
          name
        )
      `)
      .order('role', { ascending: true });

    // Fetch locals without a manager
    const { data: localsData, error: localsError } = await supabase
      .from('locals')
      .select('id, name, manager_id')
      .is('manager_id', null);

    if (usersError || localsError) {
      console.error('Error fetching data:', usersError || localsError);
      showError('Error al cargar usuarios y locales.');
    } else {
      setUsers(usersData || []);
      setLocals(localsData || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Crear usuario en auth.users y profiles
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: 'TempPass123!', // Temporal password, user should change
        options: {
          data: {
            role: formData.role
          }
        }
      });

      if (signUpError) {
        console.error('Error signing up:', signUpError);
        showError(`Error al crear usuario: ${signUpError.message}`);
        setLoading(false);
        return;
      }

      // Insertar en profiles con información adicional
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role
        })
        .eq('id', signUpData.user?.id);

      // Si es un usuario local, asignar al local
      if (formData.role === 'local' && formData.local_id) {
        const { error: localError } = await supabase
          .from('locals')
          .update({ manager_id: signUpData.user?.id })
          .eq('id', formData.local_id);

        if (localError) {
          console.error('Error assigning local:', localError);
          showError('Error al asignar local al usuario.');
        }
      }

      if (profileError) {
        console.error('Error updating profile:', profileError);
        showError('Error al actualizar perfil de usuario.');
      }

      showSuccess('Usuario creado correctamente. Se ha enviado un correo de verificación.');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Unexpected error:', err);
      showError('Error inesperado al crear usuario.');
    }

    setLoading(false);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

    setLoading(true);
    
    // Eliminar usuario de auth.users
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deleting user:', error);
      showError(`Error al eliminar usuario: ${error.message}`);
    } else {
      showSuccess('Usuario eliminado correctamente.');
      fetchData();
    }

    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      role: 'client',
      first_name: '',
      last_name: '',
      local_id: '',
    });
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    resetForm();
    setDialogOpen(true);
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando usuarios...</p>
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
                    <UserPlus className="h-5 w-5" />
                    Nuevo Usuario
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    <DialogDescription>
                      Completa los datos para crear un nuevo usuario.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Correo Electrónico *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                        placeholder="usuario@ejemplo.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="first_name">Nombre</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) =>
                          setFormData({ ...formData, first_name: e.target.value })
                        }
                        placeholder="Nombre"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Apellido</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) =>
                          setFormData({ ...formData, last_name: e.target.value })
                        }
                        placeholder="Apellido"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Rol *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) =>
                          setFormData({ ...formData, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Cliente</SelectItem>
                          <SelectItem value="local">Local</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.role === 'local' && locals.length > 0 && (
                      <div>
                        <Label htmlFor="local_id">Asignar Local</Label>
                        <Select
                          value={formData.local_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, local_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un local" />
                          </SelectTrigger>
                          <SelectContent>
                            {locals.map((local) => (
                              <SelectItem key={local.id} value={local.id}>
                                {local.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="bg-primary-blue hover:bg-blue-700 text-white"
                      >
                        Crear Usuario
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon">
              Gestión de Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay usuarios registrados. Crea uno nuevo para comenzar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Correo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Local Asignado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            user.role === 'admin' 
                              ? 'destructive' 
                              : user.role === 'local' 
                              ? 'default' 
                              : 'secondary'
                          }
                        >
                          {user.role === 'admin' 
                            ? 'Administrador' 
                            : user.role === 'local' 
                            ? 'Local' 
                            : 'Cliente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.local?.name || 'No asignado'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Implementar edición de usuario
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
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

export default Users;