import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext'; // Importamos el contexto
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useSession(); // Obtenemos la sesión actual
  
  // ESTADOS
  const [loading, setLoading] = useState(false);
  // request = pedir link | verify = procesando token | update = cambiar clave
  const [viewMode, setViewMode] = useState<'request' | 'verify' | 'update'>('request'); 
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const hasCheckedToken = useRef(false);

  // EFECTO 1: DETECTAR SI YA ESTAMOS LOGUEADOS (Lógica Homebanking / V5)
  // Si Supabase nos logueó automáticamente al hacer clic en el link,
  // el hash desaparece pero 'session' existe.
  useEffect(() => {
    if (session) {
      console.log('ResetPassword - Sesión activa detectada. Cambiando a modo Update.');
      setViewMode('update');
    }
  }, [session]);

  // EFECTO 2: DETECTAR HASH EN LA URL (Respaldo V22)
  // Por si Supabase no nos logueó automático pero el token sigue en la URL.
  useEffect(() => {
    if (location.hash && location.hash.includes('access_token')) {
      // Solo verificamos si no estamos ya en modo update (para no pisar la detección de sesión)
      if (viewMode !== 'update') {
        setViewMode('verify');
        handleTokenVerification();
      }
    }
  }, [location.hash, viewMode]);

  const handleTokenVerification = async () => {
    if (hasCheckedToken.current) return;
    hasCheckedToken.current = true;

    console.log('ResetPassword - Verificando token del hash...');
    
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    const errorDescription = hashParams.get('error_description');

    if (errorDescription) {
      showError(errorDescription);
      setViewMode('request');
      return;
    }

    if (!accessToken || type !== 'recovery') {
      // Si no hay token válido y NO hay sesión (verificado por el otro useEffect), volvemos a request
      if (!session) {
          setViewMode('request');
      }
      return;
    }

    try {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hashParams.get('refresh_token') || '',
      });

      if (error) throw error;

      console.log('Sesión establecida por Token.');
      setViewMode('update');

    } catch (err) {
      console.error('Error procesando token:', err);
      // Si falló el token pero mágicamente hay sesión, dejamos pasar. Si no, error.
      if (!session) {
          showError('El enlace ha expirado.');
          setViewMode('request');
      }
    }
  };

  // 1. SOLICITAR ENLACE (Modo Request)
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Importante: Redirige a esta misma página
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      showSuccess('Enlace enviado. Revisa tu correo.');
    } catch (error: any) {
      showError(error.message || 'Error al solicitar');
    } finally {
      setLoading(false);
    }
  };

  // 2. ACTUALIZAR CONTRASEÑA (Modo Update)
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      showError('Mínimo 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('No coinciden');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      showSuccess('¡Contraseña actualizada!');
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);

    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADO ---

  // MODO: Verificando (Solo si estamos procesando hash y aún no hay sesión)
  if (viewMode === 'verify') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 text-primary-blue animate-spin mb-4" />
        <p className="text-gray-500">Validando enlace...</p>
      </div>
    );
  }

  // MODO: Cambiar Contraseña (Verde) - Se activa por Hash OK o por Sesión Activa
  if (viewMode === 'update') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 animate-in fade-in">
        <Card className="w-full max-w-md shadow-lg border-t-4 border-green-500">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>Nueva Contraseña</CardTitle>
            <CardDescription>Establece tu nueva clave de acceso.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label>Nueva Contraseña</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="******" />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Contraseña</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="******" />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null} Confirmar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // MODO: Solicitar Correo (Azul) - Default
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 animate-in fade-in">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-primary-blue" />
          </div>
          <CardTitle>Recuperar Contraseña</CardTitle>
          <CardDescription>Te enviaremos un enlace de recuperación.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-2">
              <Label>Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@ejemplo.com" className="pl-10" />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary-blue hover:bg-blue-700" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null} Enviar Enlace
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center pt-2">
          <Button variant="link" onClick={() => navigate('/login')} className="text-gray-500 gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver al Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPassword;