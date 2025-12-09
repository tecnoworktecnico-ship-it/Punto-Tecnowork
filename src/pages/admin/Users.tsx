// Reemplazar solo la función updateUserRole en el archivo src/pages/admin/Users.tsx

  // Función para actualizar manualmente el rol de un usuario
  const updateUserRole = async (userId: string, newRole: string) => {
    const userItem = users.find(u => u.id === userId);
    if (!userItem) return;

    if (newRole === 'local' && !userItem.local_name) {
      showError('Para asignar el rol "Local", primero debes asignar un local a este usuario desde la sección de Gestión de Locales.');
      navigate('/admin/locals');
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas cambiar el rol de ${userItem.email} a ${newRole}?`)) return;
    
    setLoading(true);
    
    try {
      // Usar la función RPC específica para actualizar roles
      const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_update_user_role', {
        target_user_id: userId,
        new_role: newRole,
      });
      
      if (rpcError) {
        console.error('Error updating role with RPC:', rpcError);
        throw new Error(`Error actualizando rol: ${rpcError.message}`);
      }
      
      // Actualizar también los metadatos del usuario en auth.users
      try {
        // Esto solo funcionará si el usuario actual es el mismo que se está actualizando
        // o si se tienen permisos de administrador especiales
        if (userId === user?.id) {
          const { error: metadataError } = await supabase.auth.updateUser({
            data: { role: newRole }
          });
          
          if (metadataError) {
            console.error('Error updating user metadata:', metadataError);
          }
        }
      } catch (metaErr) {
        console.error('Error updating user metadata:', metaErr);
        // No lanzar error aquí, ya que la actualización principal ya se realizó
      }
      
      showSuccess(`Rol actualizado correctamente a ${newRole}. El usuario deberá volver a iniciar sesión para que el cambio surta efecto.`);
      
      // Actualizar la lista de usuarios localmente
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      
      // Si el usuario actual es el que se está actualizando, forzar un refresh de sesión
      if (userId === user?.id) {
        await supabase.auth.refreshSession();
      }
      
    } catch (err) {
      console.error('Error updating role:', err);
      showError(`Error al actualizar rol: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
    
    setLoading(false);
  };