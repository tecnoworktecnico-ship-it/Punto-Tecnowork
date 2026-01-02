import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useSession(); 
  
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'request' | 'update'>('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const processingRef = useRef(false);

  // EFECTO 1: DETECTOR UNIVERSAL (Hash # y Query ?)
  useEffect(() => {
    const handleRecoveryURL = async () => {
      if (processingRef.current) return;

      // CASO A: PKCE FLOW (Nuevo estándar Supabase - ?code=...)
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');

      if (code) {
        console.log("ResetPassword - Código PKCE detectado. Canjeando...");
        processingRef.current = true;
        
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          
          if (data.session) {
            console.log("Sesión PKCE establecida.");
            setViewMode('update');
          }
        } catch (error: any) {
          console.error("Error canjeando código:", error);
          showError("El enlace es inválido o expiró.");
        }
        return; // Terminamos aquí si había código
      }

      // CASO B: IMPLICIT FLOW (Viejo estándar - #access_token=...)
      if (location.hash && location.hash.includes('access_token')) {
        console.log("ResetPassword - Token Hash detectado.");
        processingRef.current = true;

        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (accessToken && type === 'recovery') {
           const { error } = await supabase.auth.setSession({
             access_token: accessToken,
             refresh_token: hashParams.get('refresh_token') || '',
           });

           if (!error) {
             console.log("Sesión Hash establecida.");
             setViewMode('update');
           } else {
             showError("Token Hash expirado.");
           }
        }
      }
    };

    handleRecoveryURL();
  }, [location]);

  // EFECTO 2: RED DE SEGURIDAD (Si el enlace nos logueó automático)
  useEffect(() => {
    if (session) {
      // Solo cambiamos a update si no estamos procesando algo activamente
      // para evitar parpadeos
      setViewMode('update');
    }
  }, [session]);

  // --- HANDLERS (Iguales que antes) ---

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      showSuccess('Enlace enviado. Revisa tu correo.');
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return showError('Mínimo 6 caracteres');
    if (newPassword !== confirmPassword) return showError('No coinciden');

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showSuccess('¡Contraseña actualizada!');
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADO ---

  if (viewMode === 'update') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 animate-in fade-in">
        <Card className="w-full max-w-md shadow-lg border-t-4 border-green-500">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>Nueva Contraseña</CardTitle>
            <CardDescription>Establece tu nueva clave.</CardDescription>
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 animate-in fade-in">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-primary-blue" />
          </div>
          <CardTitle>Recuperar Contraseña</CardTitle>
          <CardDescription>Envío de enlace de recuperación.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-2">
              <Label>Correo Electrónico</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com" className="pl-10" />
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