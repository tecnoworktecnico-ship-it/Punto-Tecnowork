import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  // Recuperamos la sesión del contexto (Lógica V5: si hay sesión, es porque el token funcionó)
  const { session } = useSession(); 
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Estados: 'request' (pedir mail) o 'update' (cambiar clave)
  const [view, setView] = useState<'request' | 'update'>('request');

  useEffect(() => {
    // LÓGICA V5 RESTAURADA:
    // 1. Si Supabase nos logueó automáticamente con el link, mostramos el formulario de cambio.
    if (session) {
      setView('update');
    }

    // 2. Escuchar el evento específico por si acaso (doble seguridad)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('update');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [session]);

  // --- Lógica de Envío de Correo ---
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // URL de redirección explícita
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      showSuccess('Enlace enviado. Revisa tu correo.');
      // No limpiamos el email para que el usuario vea que escribió bien
    } catch (error: any) {
      showError(error.message || 'Error al solicitar');
    } finally {
      setLoading(false);
    }
  };

  // --- Lógica de Cambio de Clave ---
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      showError('Mínimo 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      showSuccess('¡Contraseña actualizada!');
      
      // Logout forzado para que entre con la nueva clave (Seguridad)
      await supabase.auth.signOut();
      navigate('/login');

    } catch (error: any) {
      showError(error.message || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  // --- VISTA: CAMBIAR CONTRASEÑA ---
  if (view === 'update') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 animate-in fade-in">
        <Card className="w-full max-w-md shadow-lg border-t-4 border-green-500">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>Nueva Contraseña</CardTitle>
            <CardDescription>Ingresa tu nueva clave de acceso.</CardDescription>
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
                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null} Actualizar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- VISTA: SOLICITAR ENLACE ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 animate-in fade-in">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-primary-blue" />
          </div>
          <CardTitle>Recuperar Contraseña</CardTitle>
          <CardDescription>Te enviaremos un enlace mágico.</CardDescription>
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