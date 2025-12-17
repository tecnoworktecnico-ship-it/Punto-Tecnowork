"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2, Lock, CheckCircle } from 'lucide-react';
import BrandingDisplay from '@/components/BrandingDisplay';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const hasCheckedToken = useRef(false);

  useEffect(() => {
    // Evitar que se ejecute múltiples veces
    if (hasCheckedToken.current) {
      console.log('ResetPassword - Token already checked, skipping');
      return;
    }

    const checkAndSetSession = async () => {
      console.log('ResetPassword - Checking token...');
      console.log('ResetPassword - Full URL:', window.location.href);
      console.log('ResetPassword - Hash:', location.hash);
      
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      console.log('ResetPassword - Hash params:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken, 
        type,
        accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'none'
      });
      
      if (!accessToken || type !== 'recovery') {
        console.error('ResetPassword - No valid recovery token found');
        showError('No se encontró un enlace de recuperación válido.');
        setTokenValid(false);
        setCheckingToken(false);
        // Limpiar la bandera de recuperación si el token es inválido
        localStorage.removeItem('is_in_recovery_flow');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
      }

      try {
        console.log('ResetPassword - Setting session with recovery token');
        hasCheckedToken.current = true;
        
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        
        if (error) {
          console.error('ResetPassword - Error setting session:', error);
          showError('El enlace de recuperación es inválido o ha expirado.');
          setTokenValid(false);
          localStorage.removeItem('is_in_recovery_flow');
          setTimeout(() => navigate('/login', { replace: true }), 3000);
        } else {
          console.log('ResetPassword - Session set successfully:', !!data.session);
          setTokenValid(true);
        }
      } catch (err) {
        console.error('ResetPassword - Unexpected error:', err);
        showError('Error al validar el enlace de recuperación.');
        setTokenValid(false);
        localStorage.removeItem('is_in_recovery_flow');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      } finally {
        setCheckingToken(false);
      }
    };
    
    checkAndSetSession();
  }, [location.hash, navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Solo usar loading para prevenir múltiples clicks
    if (loading) {
      console.log('ResetPassword - Already updating, skipping');
      return;
    }
    
    if (newPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showError('Las contraseñas no coinciden.');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('ResetPassword - Updating password...');
      
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (updateError) {
        console.error('ResetPassword - Error updating password:', updateError);
        showError(`Error al actualizar la contraseña: ${updateError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('ResetPassword - Password updated successfully, user:', updateData.user?.id);
      
      // Actualizar el campo password_changed en el perfil
      if (updateData.user) {
        try {
          console.log('ResetPassword - Updating profile password_changed flag');
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              password_changed: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', updateData.user.id);
            
          if (profileError) {
            console.error('ResetPassword - Error updating profile:', profileError);
          } else {
            console.log('ResetPassword - Profile updated successfully');
          }
        } catch (profileErr) {
          console.error('ResetPassword - Error updating profile (non-critical):', profileErr);
        }
      }
      
      console.log('ResetPassword - Setting passwordUpdated to true');
      setPasswordUpdated(true);
      showSuccess('¡Contraseña actualizada correctamente!');
      
      // Limpiar la bandera de recuperación antes de la redirección final
      localStorage.removeItem('is_in_recovery_flow');
      
      // Esperar 1.5 segundos y luego cerrar sesión de forma agresiva
      setTimeout(async () => {
        console.log('ResetPassword - Starting aggressive sign out...');
        
        try {
          // 1. Cerrar sesión en Supabase
          await supabase.auth.signOut();
          console.log('ResetPassword - Supabase sign out completed');
          
          // 2. Limpiar localStorage (ya limpiamos la bandera, pero por si acaso)
          // No limpiamos todo localStorage aquí para no borrar otras configuraciones, solo la bandera.
          
          // 3. Limpiar sessionStorage
          sessionStorage.clear();
          console.log('ResetPassword - sessionStorage cleared');
          
          // 4. Esperar un momento para que se complete
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // 5. Forzar recarga completa de la página para limpiar todo el estado
          console.log('ResetPassword - Forcing full page reload...');
          window.location.href = '/login';
          
        } catch (err) {
          console.error('ResetPassword - Error during cleanup:', err);
          // Si hay error, forzar recarga de todas formas
          window.location.href = '/login';
        }
      }, 1500);
      
    } catch (err) {
      console.error('ResetPassword - Unexpected error:', err);
      showError('Error inesperado al actualizar la contraseña.');
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
        <p className="text-white text-xl">Verificando enlace de recuperación...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Card className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
          <CardContent className="text-center py-8">
            <p className="text-emphasis-red text-lg mb-4">
              El enlace de recuperación es inválido o ha expirado.
            </p>
            <p className="text-gray-600">
              Serás redirigido al login en unos segundos...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (passwordUpdated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Card className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
          <CardContent className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-success-green mx-auto mb-4" />
            <p className="text-success-green text-2xl font-bold mb-4">
              ¡Contraseña Actualizada!
            </p>
            <p className="text-gray-600 mb-2">
              Tu contraseña ha sido cambiada exitosamente.
            </p>
            <p className="text-gray-500 text-sm">
              Redirigiendo al login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <Card className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex justify-center mb-4">
            <BrandingDisplay type="main" className="h-16" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-text-carbon">
            Restablecer Contraseña
          </CardTitle>
          <CardDescription className="text-center">
            Ingresa tu nueva contraseña para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                required
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary-blue hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando contraseña...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Guardar Nueva Contraseña
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;