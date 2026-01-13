"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { ArrowLeft, Trash2, RefreshCw, CheckCircle, Loader2, Users as UsersIcon, Store } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';

interface User {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  manager_id?: string | null;
  local_name?: string | null;
  created_at?: string | null;
}

interface Local {
  id: string;
  name: string;
  manager_id: string | null;
}

const Users = () => {
  const { profile, user, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [locals, setLocals] = useState<Local[]>([]);
  const [allLocals, setAllLocals] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [assigningLocal, setAssigningLocal] = useState<string | null>(null);

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
        created_at: u.created_at || null
      }));

      setUsers(formattedUsers);

      // Obtener información de locales
      const { data: localsData, error: localsError } = await supabase
        .from('locals')
        .select('id, name, manager_id');

      if (localsError) {
        console.error('Error fetching locals:', localsError);
      } else {
        setAllLocals(localsData || []);
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

  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    
    try {
      // Si el usuario era 'local' y cambia a otro rol, desasignar del local
      const currentUser = users.find(u => u.id === userId);
      if (currentUser?.role === 'local' && newRole !== 'local') {
        // Desasignar de cualquier local
        const { error: unassignError } = await supabase
          .from('locals')
          .update({ manager_id: null })
          .eq('manager_id', userId);
          
        if (unassignError) {
          console.error('Error unassigning from local:', unassignError);
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      showSuccess('Rol actualizado correctamente.');
      await fetchData(); // Refrescar datos
    } catch (error) {
      console.error('Error updating role:', error);
      showError('Error al actualizar el rol del usuario.');
    } finally {
      setUpdatingRole(null);
    }
  };

  const assignLocalToManager = async (userId: string, localId: string) => {
    setAssigningLocal(userId);
    
    try {
      // Primero, desasignar el usuario de cualquier local anterior
      await supabase
        .from('locals')
        .update({ manager_id: null })
        .eq('manager_id', userId);

      if (localId && localId !== 'none') {
        // Asignar al nuevo local
        const { error } = await supabase
          .from('locals')
          .update({ manager_id: userId })
          .eq('id', localId);

        if (error) throw error;
      }

      showSuccess('Local asignado correctamente.');
      await fetchData();
    } catch (error) {
      console.error('Error assigning local:', error);
      showError('Error al asignar el local.');
    } finally {
      setAssigningLocal(null);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      // No permitir eliminar el usuario actual
      if (userId === user?.id) {
        showError('No puedes eliminarte a ti mismo.');
        return;
      }

      // Desasignar de cualquier local primero
      await supabase
        .from('locals')
        .update({ manager_id: null })
        .eq('manager_id', userId);

      // Eliminar perfil (esto activará cascada si está configurada)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      showSuccess('Usuario eliminado correctamente.');
      await fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('Error al eliminar el usuario.');
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'local': return 'default';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'local': return 'Local';
      default: return 'Cliente';
    }
  };

  const getAvailableLocalsForUser = (userId: string) => {
    // Mostrar locales sin manager + el local actual del usuario si tiene
    const userLocal = allLocals.find(l => l.manager_id === userId);
    const unassignedLocals = allLocals.filter(l => !l.manager_id);
    
    if (userLocal && !unassignedLocals.find(l => l.id === userLocal.id)) {
      return [userLocal, ...unassignedLocals];
    }
    return unassignedLocals;
  };

  const getUserAssignedLocal = (userId: string) => {
    return allLocals.find(l => l.manager_id === userId);
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600">
        <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
        <p className="text-white text-lg">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <AppHeader title="Gestión de Usuarios" />
      
      <main className="flex-grow p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-white hover:text-gray-200 hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver al Dashboard
          </Button>

          <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <UsersIcon className="h-8 w-8 text-primary-blue" />
                  <div>
                    <CardTitle className="text-3xl font-bold text-text-carbon">
                      Usuarios del Sistema
                    </CardTitle>
                    <CardDescription>
                      Los usuarios se registran automáticamente con Google. Aquí puedes gestionar sus roles.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={fetchData}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <UsersIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No hay usuarios registrados todavía.</p>
                  <p className="text-sm mt-2">Los usuarios aparecerán aquí cuando inicien sesión con Google.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Local Asignado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((userItem) => (
                        <TableRow key={userItem.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {userItem.first_name || userItem.last_name 
                                  ? `${userItem.first_name || ''} ${userItem.last_name || ''}`.trim()
                                  : 'Sin nombre'}
                              </span>
                              <span className="text-sm text-gray-500">{userItem.email}</span>
                              {userItem.id === user?.id && (
                                <Badge variant="outline" className="w-fit mt-1 text-xs">
                                  Tú
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {userItem.phone_number || 'No registrado'}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={userItem.role}
                              onValueChange={(value) => updateUserRole(userItem.id, value)}
                              disabled={userItem.id === user?.id || updatingRole === userItem.id}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue>
                                  {updatingRole === userItem.id ? (
                                    <div className="flex items-center">
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    </div>
                                  ) : (
                                    <Badge variant={getRoleBadgeVariant(userItem.role)}>
                                      {getRoleLabel(userItem.role)}
                                    </Badge>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="client">Cliente</SelectItem>
                                <SelectItem value="local">Local (Manager)</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {userItem.role === 'local' ? (
                              <Select
                                value={getUserAssignedLocal(userItem.id)?.id || 'none'}
                                onValueChange={(value) => assignLocalToManager(userItem.id, value)}
                                disabled={assigningLocal === userItem.id}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue>
                                    {assigningLocal === userItem.id ? (
                                      <div className="flex items-center">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      </div>
                                    ) : (
                                      <span className="flex items-center gap-2">
                                        <Store className="h-4 w-4" />
                                        {getUserAssignedLocal(userItem.id)?.name || 'Sin asignar'}
                                      </span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sin asignar</SelectItem>
                                  {getAvailableLocalsForUser(userItem.id).map((local) => (
                                    <SelectItem key={local.id} value={local.id}>
                                      {local.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-gray-400 text-sm">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={userItem.id === user?.id}
                                  className="text-emphasis-red hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará permanentemente a{' '}
                                    <strong>{userItem.email}</strong> del sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(userItem.id)}
                                    className="bg-emphasis-red hover:bg-red-700"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Info Box */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">💡 ¿Cómo funciona?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Los usuarios se registran automáticamente cuando inician sesión con Google</li>
                  <li>• Por defecto, todos los nuevos usuarios son <strong>Clientes</strong></li>
                  <li>• Puedes cambiar el rol de cualquier usuario desde esta pantalla</li>
                  <li>• Los usuarios con rol <strong>Local</strong> deben tener un local asignado</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Users;
