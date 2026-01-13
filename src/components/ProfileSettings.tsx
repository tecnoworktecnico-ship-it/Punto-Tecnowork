"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { User, Phone, Mail } from 'lucide-react';

interface ProfileSettingsProps {
  onProfileUpdate: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onProfileUpdate }) => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
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

  if (sessionLoading) return null;

  return (
    <div className="max-w-xl mx-auto">
      {/* Tarjeta de Actualización de Datos */}
      <Card className="bg-gray-50 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-primary-blue" />
            <CardTitle className="text-primary-blue">Datos Personales</CardTitle>
          </div>
          <CardDescription>Modifica tu nombre, apellido y número de teléfono.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            {/* Email (solo lectura) */}
            <div>
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="h-4 w-4 text-gray-500" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-100 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">El email está vinculado a tu cuenta de Google.</p>
            </div>
            
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
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings;
