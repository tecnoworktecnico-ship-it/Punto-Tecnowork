"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { User, Lock, Phone } from 'lucide-react';

interface ProfileSettingsProps {
  onProfileUpdate: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onProfileUpdate }) => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Actualizar datos del perfil (first_name, last_name, phone_number)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          first_name: firstName.trim(), 
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (profileError) {
        throw new Error(`Error al actualizar perfil: ${profileError.message}`);
      }

      // 2. Actualizar metadatos del usuario (para consistencia)
      const { error: userMetadataError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim() || null,
        }
      });

      if (userMetadataError) {
        throw new Error(`Error al actualizar metadatos: ${userMetadataError.message}`);
      }

      showSuccess('Datos de perfil actualizados correctamente.');
      onProfileUpdate(); // Refrescar sesión/perfil en el padre
    } catch (error) {
      console.error('Error updating profile:', error);
      showError(error instanceof Error ? error.message : 'Error inesperado al actualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        // Supabase requiere que el usuario haya iniciado sesión recientemente para cambiar la contraseña.
        if (error.message.includes('must be signed in')) {
          showError('Tu sesión ha expirado. Por favor, cierra sesión y vuelve a iniciarla para cambiar la contraseña.');
        } else {
          showError(`Error al cambiar la contraseña: ${error.message}`);
        }
        return;
      }

      // Si el cambio de contraseña es exitoso, marcamos que ya no necesita cambiarla
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ 
          password_changed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (profileUpdateError) {
        console.error('Error marking password as changed:', profileUpdateError);
      }
      
      showSuccess('Contraseña actualizada correctamente. Por favor, inicia sesión de nuevo con tu nueva contraseña.');
      await supabase.auth.signOut(); // Forzar cierre de sesión para usar la nueva contraseña
    } catch (error) {
      console.error('Error updating password:', error);
      showError(error instanceof Error ? error.message : 'Error inesperado al actualizar contraseña.');
    } finally {
      setLoading(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  if (sessionLoading) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tarjeta de Actualización de Datos */}
      <Card className="bg-gray-50 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-primary-blue" />
            <CardTitle className="text-primary-blue">Actualizar Datos Personales</CardTitle>
          </div>
          <CardDescription>Modifica tu nombre, apellido y número de teléfono.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Tu apellido"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber" className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-gray-500" /> Número de Teléfono (Opcional)
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Ej: 555-1234"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Guardando...' : 'Guardar Datos'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tarjeta de Cambio de Contraseña */}
      <Card className="bg-gray-50 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Lock className="h-6 w-6 text-primary-blue" />
            <CardTitle className="text-primary-blue">Cambiar Contraseña</CardTitle>
          </div>
          <CardDescription>Asegura tu cuenta con una nueva contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                required
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading || !newPassword || newPassword !== confirmPassword} 
              className="w-full bg-emphasis-red hover:bg-red-700"
            >
              {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings;