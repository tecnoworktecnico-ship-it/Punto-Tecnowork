"use client";

import React, { useState, useEffect } from 'react';
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
  const [tokenChecked, setTokenChecked] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    // Verificar si hay un token de recuperación en la URL
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    
    console.log('ResetPassword - Hash params:', { 
      accessToken: !!accessToken, 
      refreshToken: !!refreshToken, 
      type,
      fullHash: location.hash 
    });
    
    const checkToken = async () => {
      if (accessToken && type === 'recovery') {
        try {
          // Intentar establecer la sesión con el token
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (error) {
            console.error('Error validating reset token:', error);
            showError('El enlace de recuperación es inválido o ha expirado.');
            setTokenValid(false);
            setTimeout(() => {
              navigate('/login', { replace: true });
            }, 3000);
          } else {
            console.log('Token válido, usuario puede restablecer contraseña', data);
            setTokenValid(true);
          }
        } catch (err) {
          console.error('Unexpected error validating token:', err);
          showError('Error al validar el enlace de recuperación.');
          setTokenValid(false);
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        }
      } else if (!accessToken || type !== 'recovery') {
        console.error('No valid recovery token found in URL', { accessToken: !!accessToken, type });
        
        // Verificar si ya hay una sesión activa
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          console.log('Session already exists, token was already processed');
          setTokenValid(true);
        } else {
          showError('No se encontró un enlace de recuperación válido.');
          setTokenValid(false);
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        }
      }
      
      setTokenChecked(true);
    };
    
    checkToken();
  }, [location, navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      
      console.log('ResetPassword - Update result:', { 
        hasData: !!updateData, 
        error: updateError?.message 
      });
      
      if (updateError) {
        console.error('Error updating password:', updateError);
        showError(`Error al actualizar la contraseña: ${updateError.message}`);
        setLoading(false);
        return;
      }
      
      // Actualizar el campo password_changed en el perfil
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('ResetPassword - Updating profile for user:', user.id);
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            password_changed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }
      
      console.log('ResetPassword - Password updated successfully');
      setPasswordUpdated(true);
      showSuccess('¡Contraseña actualizada correctamente!');
      
      // Esperar 2 segundos antes de cerrar sesión y redirigir
      setTimeout(async () => {
        console.log('ResetPassword - Signing out...');
        await supabase.auth.signOut();
        
        // Cerrar esta pestaña si fue abierta desde un enlace
        if (window.opener) {
          window.close();
        } else {
          navigate('/login', { replace: true });
        }
      }, 2000);
      
    } catch (err) {
      console.error('Unexpected error:', err);
      showError('Error inesperado al actualizar la contraseña.');
      setLoading(false);
    }
  };

  if (!tokenChecked) {
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
              {window.opener 
                ? 'Esta ventana se cerrará automáticamente...' 
                : 'Serás redirigido al login...'}
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