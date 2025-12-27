"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, UserPlus, Trash2, RefreshCw, Mail, CheckCircle, XCircle, Phone, Loader2 } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PageWrapper from '@/components/PageWrapper';
import AnimatedHeader from '@/components/AnimatedHeader';
import ContentCard from '@/components/ContentCard';

interface User {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  manager_id?: string | null;
  local_name?: string | null;
  email_confirmed_at?: string | null;
}

const Users = () => {
  const { profile, user, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [locals, setLocals] = useState<{id: string, name: string, manager_id: string | null}[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    role: 'client',
    first_name: '',
    last_name: '',
    phone_number: '',
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
    
    try {
      // Usar la función RPC para obtener todos los usuarios con sus emails
      const { data: userData, error: userError } = await supabase
        .rpc('get_all_users_with_emails');

      if (userError) {
        console.error('Error fetching users with RPC:', userError);
        showError('Error al cargar usuarios: ' + userError.message);
        setLoading(false);
        return;
      }

      console.log('User data from RPC:', userData);

      // Transformar los datos a nuestro formato de usuario
      const formattedUsers = userData.map((u: any) => ({
        id: u.id,
        email: u.email || 'Sin correo',
        role: u.role || 'client',
        first_name: u.first_name || null,
        last_name: u.last_name || null,
        phone_number: u.phone_number || null,
        manager_id: u.manager_id || null,
        local_name: u.local_name || null,
        email_confirmed_at: u.email_confirmed_at || null
      }));

      setUsers(formattedUsers);

      // Obtener información de locales
      const { data: localsData, error: localsError } = await supabase
        .from('locals')
        .select('id, name, manager_id');

      if (localsError) {
        console.error('Error fetching locals:', localsError);
      } else {
        // Guardar locales sin manager para asignación
        setLocals(localsData?.filter(l => !l.manager_id) || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching users:', error);
      showError('Error inesperado al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar datos
      if (!formData.email || !formData.role || !formData.first_name || !formData.last_name || !formData.phone_number) {
        showError('Por favor completa todos los campos obligatorios.');
        setLoading(false);
        return;
      }

      // Crear usuario con el método estándar
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: 'TempPass123!', // Contraseña temporal
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            is_admin_created: true,
            phone_number: formData.phone_number,
          },
          emailRedirectTo: window.location.origin + '/auth-callback',
        }
      });
      
      if (signUpError) {
        showError(`Error al crear usuario: ${signUpError.message}`);
        setLoading(false);
        return;
      }
      
      if (!signUpData.user) {
        showError('No se pudo crear el usuario.');
        setLoading(false);
        return;
      }

      // Esperar un momento para que se cree el perfil automáticamente mediante el trigger handle_new_user
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Verificar si el perfil se creó correctamente
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signUpData.user.id)
        .single();
        
      if (profileError && profileError.code === 'PGRST116') {
        // El perfil no existe, crearlo manualmente
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: signUpData.user.id,
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone_number: formData.phone_number,
            role: formData.role,
            password_changed: false
          });
          
        if (insertError) {
          console.error('Error creating profile manually:', insertError);
          showError('Error al crear el perfil del usuario. Intente nuevamente.');
        }
      } else if (profileData) {
        // Asegurarse de que el rol sea el correcto
        if (profileData.role !== formData.role) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: formData.role })
            .eq('id', signUpData.user.id);
            
          if (updateError) {
            console.error('Error updating role:', updateError);
          }
        }
      }

      // Si es un usuario local, asignar al local
      if (formData.role === 'local' && formData.local_id) {
        // Primero, desasignar el usuario de cualquier otro local (aunque es nuevo, es buena práctica)
        await supabase
          .from('locals')
          .update({ manager_id: null })
          .eq('manager_id', signUpData.user.id);
          
        const { error: localError } = await supabase
          .from('locals')
          .update({ manager_id: signUpData.user.id })
          .eq('id', formData.local_id);

        if (localError) {
          console.error('Error assigning local:', localError);
          showError('Error al asignar local al usuario.');
        }
      }

      showSuccess('Usuario creado correctamente.');
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
    if (userId === user?.id) {
      showError('No puedes eliminar tu propio usuario.');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) return;

    setLoading(true);
    
    try {
      // Usar la función RPC admin_delete_user
      const { error: deleteError } = await supabase.rpc('admin_delete_user', { 
        target_user_id: userId 
      });
      
      if (deleteError) {
        throw new Error(`Error eliminando usuario: ${deleteError.message}`);
      }

      showSuccess('Usuario eliminado correctamente.');
      // Actualizar la lista de usuarios localmente
      setUsers(users.filter(u => u.id !== userId));
      
    } catch (err) {
      console.error('Error deleting user:', err);
      showError(`Error al eliminar usuario: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      role: 'client',
      first_name: '',
      last_name: '',
      phone_number: '',
      local_id: '',
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Función para actualizar manualmente el rol de un usuario
  const updateUserRole = async (userId: string, newRole: string) => {
    const userItem = users.find(u => u.id === userId);
    if (!userItem) return;

    if (newRole === 'local' && !userItem.local_name) {
      // Permitir cambiar a 'local' si el usuario ya tiene un local asignado (local_name existe)
      // Si no tiene local asignado, advertir.
      const currentLocal = locals.find(l => l.manager_id === userId);
      if (!currentLocal) {
        showError('Para asignar el rol "Local", primero debes asignar un local a este usuario desde la sección de Gestión de Locales.');
        navigate('/admin/locals');
        return;
      }
    }

    if (!confirm(`¿Estás seguro de que deseas cambiar el rol de ${userItem.email} a ${newRole}?`)) return;
    
    setUpdatingRole(userId);
    
    try {
      console.log(`Actualizando rol de usuario ${userId} a ${newRole}`);
      
      // Usar la función RPC para manejar la lógica de desasignación de local si el rol cambia
      const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_update_user_role', {
        target_user_id: userId,
        new_role: newRole,
      });
      
      if (rpcError) {
        console.error('Error updating role with RPC:', rpcError);
        throw new Error(`Error actualizando rol: ${rpcError.message}`);
      }
      
      // Esperar un momento para que los cambios se propaguen
      await new Promise(resolve => setTimeout(resolve, 500));
      
      showSuccess(`Rol actualizado correctamente a ${newRole}. El usuario deberá volver a iniciar sesión para que el cambio surta efecto.`);
      
      // Recargar los datos para asegurarnos de que todo está actualizado
      setTimeout(() => {
        fetchData();
      }, 1000);
      
    } catch (err) {
      console.error('Error updating role:', err);
      showError(`Error al actualizar rol: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setUpdatingRole(null);
    }
  };

  // Función para reenviar el correo de verificación
  const resendVerificationEmail = async (userEmail: string) => {
    setResendingEmail(userEmail);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });
      
      if (error) {
        console.error('Error resending verification email:', error);
        showError(`Error al reenviar correo: ${error.message}`);
      } else {
        showSuccess(`Correo de verificación reenviado a ${userEmail}`);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      showError('Error inesperado al reenviar correo de verificación.');
    } finally {
      setResendingEmail(null);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
        <p className="text-white text-xl">Cargando usuarios...</p>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <PageWrapper showFooter={true} showMadeWithDyad={true}>
      <AnimatedHeader 
        title="Gestión de Usuarios" 
        showSignOut={true} 
        showBackButton={true} 
        backPath="/admin/dashboard"
      />
      
      <main className="p-4">
        <div className="max-w-6xl mx-auto pt-8 pb-12">
          <ContentCard>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-text-carbon">
                  Gestión de Usuarios
                </h1>
                <div className="flex gap-2">
                  <Button
                    onClick={fetchData}
                    variant="outline"
                    className="flex items-center gap-2 hover-scale"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Actualizar
                  </Button>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={openCreateDialog}
                        className="bg-primary-blue hover:bg-blue-700 text-white flex items-center gap-2 hover-scale btn-shimmer"
                      >
                        <UserPlus className="h-5 w-5" />
                        Nuevo Usuario
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                        <DialogDescription>
                          Completa los datos para crear un nuevo usuario. Se enviará un correo de verificación.
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
                          <Label htmlFor="first_name">Nombre *</Label>
                          <Input
                            id="first_name"
                            value={formData.first_name}
                            onChange={(e) =>
                              setFormData({ ...formData, first_name: e.target.value })
                            }
                            required
                            placeholder="Nombre"
                          />
                        </div>
                        <div>
                          <Label htmlFor="last_name">Apellido *</Label>
                          <Input
                            id="last_name"
                            value={formData.last_name}
                            onChange={(e) =>
                              setFormData({ ...formData, last_name: e.target.value })
                            }
                            required
                            placeholder="Apellido"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone_number">Número de Teléfono *</Label>
                          <Input
                            id="phone_number"
                            type="tel"
                            value={formData.phone_number}
                            onChange={(e) =>
                              setFormData({ ...formData, phone_number: e.target.value })
                            }
                            required
                            placeholder="Ej: 555-1234"
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
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <p className="text-sm text-yellow-800">
                            <strong>Nota:</strong> La contraseña temporal será "TempPass123!". 
                            El usuario deberá cambiarla en su primer inicio de sesión.
                          </p>
                        </div>
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
                            disabled={loading}
                            className="bg-primary-blue hover:bg-blue-700 text-white hover-scale"
                          >
                            {loading ? 'Creando...' : 'Crear Usuario'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
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
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Verificado</TableHead>
                      <TableHead>Local Asignado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userItem) => (
                      <TableRow key={userItem.id}>
                        <TableCell className="font-medium">
                          {userItem.email || 'Sin correo'}
                          {userItem.id === user?.id && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Tú
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {userItem.first_name || userItem.last_name 
                            ? `${userItem.first_name || ''} ${userItem.last_name || ''}`.trim()
                            : 'Sin nombre'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {userItem.phone_number || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={userItem.role}
                            onValueChange={(value) => updateUserRole(userItem.id, value)}
                            disabled={userItem.id === user?.id || updatingRole === userItem.id}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue>
                                {updatingRole === userItem.id ? (
                                  <div className="flex items-center">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Actualizando...
                                  </div>
                                ) : (
                                  <Badge 
                                    variant={
                                      userItem.role === 'admin' 
                                        ? 'destructive' 
                                        : userItem.role === 'local' 
                                        ? 'default' 
                                        : 'secondary'
                                    }
                                  >
                                    {userItem.role === 'admin' 
                                      ? 'Administrador' 
                                      : userItem.role === 'local' 
                                      ? 'Local' 
                                      : 'Cliente'}
                                  </Badge>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="client">Cliente</SelectItem>
                              <SelectItem value="local">Local</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center">
                                  {userItem.email_confirmed_at ? (
                                    <CheckCircle className="h-5 w-5 text-success-green" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-emphasis-red" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {userItem.email_confirmed_at 
                                  ? `Verificado el ${new Date(userItem.email_confirmed_at).toLocaleDateString()}` 
                                  : 'Email no verificado'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {userItem.local_name || 'No asignado'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {!userItem.email_confirmed_at && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendVerificationEmail(userItem.email)}
                                disabled={resendingEmail === userItem.email}
                                className="text-primary-blue hover:text-blue-700 hover-scale"
                              >
                                {resendingEmail === userItem.email ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(userItem.id)}
                              disabled={userItem.id === user?.id}
                              className="text-emphasis-red hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed hover-scale"
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
          </ContentCard>
        </div>
      </main>
    </PageWrapper>
  );
};

export default Users;