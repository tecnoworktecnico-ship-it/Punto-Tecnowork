import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, KeyRound, Mail, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  // 1. OBTENEMOS LA SESIÓN DEL CONTEXTO
  // Si el link del correo funcionó, 'session' ya tendrá datos válidos.
  const { session } = useSession(); 
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 'request' = Pedir correo | 'update' = Poner nueva clave
  const [mode, setMode] = useState<'request' | 'update'>('request');

  // --- LÓGICA DE HOMEBANKING ---
  useEffect(() => {
    // A. Si el contexto dice que hay sesión, es porque el link de recuperación nos logueó.
    // Pasamos directo a cambiar la clave.
    if (session) {
      console.log("Lógica Homebanking: Sesión activa detectada. Permitir cambio de clave.");
      setMode('update');
    }

    // B. Escuchar evento explícito de recuperación (Red de seguridad)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log("Evento Supabase: PASSWORD_RECOVERY detectado.");
        setMode('update');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [session]);

  // FUNCIÓN 1: El usuario olvidó la clave y pide el link
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Redirigir a ESTA misma página para que la lógica de arriba capture el retorno
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      showSuccess('Correo enviado. Revisa tu bandeja de entrada (y spam).');
    } catch (error: any) {
      console.error('Error solicitando reset:', error);
      showError(error.message || 'Error al solicitar recuperación');
    } finally {
      setLoading(false);
    }
  };

  // FUNCIÓN 2: El usuario ya entró con el link y está poniendo la nueva clave
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      showError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      // Usamos updateUser porque YA estamos logueados (gracias al link)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      showSuccess('¡Contraseña blindada correctamente!');
      
      // Salir para obligar a entrar con la nueva clave (buena práctica de seguridad)
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (error: any) {
      console.error('Error actualizando password:', error);
      showError(error.message || 'No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  // --- VISTA A: FORMULARIO DE NUEVA CONTRASEÑA (Modo Homebanking Activo) ---
  if (mode === 'update') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-2xl border-t-4 border-green-500 animate-in fade-in zoom-in duration-300">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <ShieldCheck className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-800">Seguridad de la Cuenta</CardTitle>
            <CardDescription>
              Hemos verificado tu identidad. <br/>
              Establece tu nueva contraseña de acceso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10 h-11"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Repite la contraseña"
                    className="pl-10 h-11"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 bg-green-600 hover:bg-green-700 font-semibold text-lg shadow-md" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Confirmar Cambio
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- VISTA B: SOLICITAR ENLACE (Paso 1) ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-xl animate-in fade-in duration-500">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-primary-blue" />
          </div>
          <CardTitle className="text-xl">Recuperar Acceso</CardTitle>
          <CardDescription>
            Ingresa tu correo y te enviaremos una llave de acceso temporal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="pl-10 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 bg-primary-blue hover:bg-blue-700 text-base" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enviar Enlace Mágico
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-6">
          <Button variant="ghost" onClick={() => navigate('/login')} className="text-gray-500 hover:text-primary-blue gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver al Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPassword;