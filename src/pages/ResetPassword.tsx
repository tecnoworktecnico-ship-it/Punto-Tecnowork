import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, KeyRound, CheckCircle2, XCircle } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ESTADOS DE LA MÁQUINA DE RECUPERACIÓN
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true); // Estado inicial: verificando
  const [tokenValid, setTokenValid] = useState(false);      // ¿El token es bueno?
  const [passwordUpdated, setPasswordUpdated] = useState(false); // ¿Ya terminó?
  
  // Inputs del formulario
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Ref para evitar doble ejecución en React.StrictMode
  const hasCheckedToken = useRef(false);

  // EFECTO PRINCIPAL: LEER Y PROCESAR EL HASH
  useEffect(() => {
    if (hasCheckedToken.current) return;
    
    const checkAndSetSession = async () => {
      hasCheckedToken.current = true;
      console.log('ResetPassword - Iniciando verificación de token...');
      
      // 1. LEER TOKENS DEL HASH (La lógica V16 que funcionaba)
      // El hash viene como #access_token=...&type=recovery
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      const errorDescription = hashParams.get('error_description');

      // Debug
      console.log('ResetPassword - Params:', { type, hasToken: !!accessToken, error: errorDescription });

      // 2. VALIDACIÓN INICIAL
      if (errorDescription) {
        console.error('ResetPassword - Error en URL:', errorDescription);
        showError(errorDescription);
        setTokenValid(false);
        setCheckingToken(false);
        return;
      }

      if (!accessToken || type !== 'recovery') {
        console.warn('ResetPassword - No se encontró token de recuperación válido en el hash.');
        // Opcional: Si el usuario ya estaba logueado por otra razón, podríamos dejarlo pasar,
        // pero para ser estrictos con la recuperación, pediremos token.
        setTokenValid(false);
        setCheckingToken(false);
        return;
      }

      try {
        // 3. ESTABLECER LA SESIÓN MANUALMENTE
        console.log('ResetPassword - Estableciendo sesión con token del hash...');
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          throw error;
        }

        console.log('ResetPassword - Sesión establecida. Usuario listo para cambiar clave.');
        setTokenValid(true);
        
      } catch (err: any) {
        console.error('ResetPassword - Error crítico estableciendo sesión:', err);
        showError('El enlace ha expirado o es inválido.');
        setTokenValid(false);
      } finally {
        setCheckingToken(false);
      }
    };

    checkAndSetSession();
  }, [location.hash]);

  // FUNCIÓN: ACTUALIZAR CONTRASEÑA
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
      // Como ya hicimos setSession arriba, el usuario está autenticado.
      // Usamos updateUser para cambiar la clave.
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordUpdated(true);
      showSuccess('¡Contraseña actualizada correctamente!');
      
      // Cerrar sesión por seguridad y redirigir
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);

    } catch (error: any) {
      console.error('Error actualizando password:', error);
      showError(error.message || 'No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADO DE ESTADOS ---

  // ESTADO 1: Verificando (Spinner)
  if (checkingToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 text-primary-blue animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Verificando enlace de seguridad...</p>
      </div>
    );
  }

  // ESTADO 2: Token Inválido o Expirado
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-lg border-t-4 border-red-500">
          <CardContent className="text-center py-10">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Enlace no válido</h2>
            <p className="text-gray-500 mb-6">
              Este enlace de recuperación ha expirado, ya fue utilizado o es incorrecto.
            </p>
            <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
              Volver al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ESTADO 3: Éxito (Contraseña Cambiada)
  if (passwordUpdated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-lg border-t-4 border-green-500">
          <CardContent className="text-center py-10">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">¡Contraseña Actualizada!</h2>
            <p className="text-gray-500 mb-6">
              Tu acceso ha sido restaurado correctamente. Redirigiendo al login...
            </p>
            <Button onClick={() => navigate('/login')} className="w-full bg-primary-blue">
              Ir a Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ESTADO 4: Formulario de Nueva Contraseña (Token Válido)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-2xl animate-in fade-in slide-in-from-bottom-4">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary-blue/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-primary-blue" />
          </div>
          <CardTitle className="text-xl">Establecer Nueva Contraseña</CardTitle>
          <CardDescription>
            Ingresa tu nueva clave para recuperar el acceso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 bg-primary-blue hover:bg-blue-700 text-base font-semibold" 
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Cambio
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;