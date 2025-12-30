import React, { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = () => {
  // Obtenemos setIsRequestingPasswordReset del contexto para avisar que no queremos redirección automática si el usuario pide reset
  const { loading: sessionLoading, session, profile, setIsRequestingPasswordReset } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- SEGURIDAD CONTRA BUCLES ---
  // Si ya hay sesión y perfil cargados, NO intentamos redirigir manualmente aquí.
  // Dejamos que el SessionContext maneje la redirección para evitar conflictos.
  // Solo mostramos un estado de carga visual.
  if (session && profile && !sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center animate-in fade-in">
          <Loader2 className="h-8 w-8 animate-spin text-primary-blue mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Validando sesión...</p>
        </div>
      </div>
    );
  }

  // Detectar si venimos de un error de recuperación
  useEffect(() => {
    if (location.state?.error) {
      showError(location.state.error);
    }
  }, [location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        showSuccess('¡Bienvenido de nuevo!');
        // NO NAVEGAMOS MANUALMENTE.
        // El SessionContext detectará el cambio de estado (SIGNED_IN) y redirigirá.
      }
    } catch (error: any) {
      console.error('Login error:', error);
      showError(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Avisamos al contexto que vamos a resetear contraseña para que no intente redirigirnos si hay una sesión fantasma
    if (setIsRequestingPasswordReset) {
      setIsRequestingPasswordReset(true);
    }
    navigate('/reset-password');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="w-12 h-12 bg-primary-blue rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Punto Tecnowork</CardTitle>
          <CardDescription className="text-gray-500">
            Ingresa a tu cuenta para gestionar tus pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nombre@ejemplo.com" 
                  className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-primary-blue hover:underline font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-10 bg-primary-blue hover:bg-blue-700 text-white font-medium transition-all shadow-md hover:shadow-lg" 
              disabled={loading || sessionLoading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center">
                  Iniciar Sesión <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 bg-gray-50/50 pt-6">
          <div className="text-sm text-center text-gray-500">
            ¿No tienes una cuenta?{' '}
            <button 
              onClick={() => navigate('/register')} 
              className="text-primary-blue hover:underline font-medium"
            >
              Regístrate aquí
            </button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;