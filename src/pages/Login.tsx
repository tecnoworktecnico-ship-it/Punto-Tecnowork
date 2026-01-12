import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';
import BrandingDisplay from '@/components/BrandingDisplay';

const Login = () => {
  const navigate = useNavigate();
  const { session, profile, loading: sessionLoading } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  // Si ya hay sesión y perfil, redirigir según rol
  useEffect(() => {
    if (session && profile) {
      console.log('Login - User already logged in, redirecting based on role:', profile.role);
      
      if (profile.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (profile.role === 'local') {
        navigate('/local/dashboard', { replace: true });
      } else if (profile.role === 'client') {
        navigate('/client', { replace: true });
      }
    }
  }, [session, profile, navigate]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      console.log('Login - Initiating Google OAuth...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth-callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google login error:', error);
        showError(error.message || 'Error al iniciar sesión con Google');
        setIsLoading(false);
      }
      
      // Si no hay error, Supabase redirigirá a Google automáticamente
      // No necesitamos hacer nada más aquí
      
    } catch (error: any) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al iniciar sesión');
      setIsLoading(false);
    }
  };

  // Mostrar loading mientras SessionContext verifica la sesión
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <BrandingDisplay type="main" className="h-20" />
          </div>
          
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              Bienvenido
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Inicia sesión para continuar
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Botón de Google */}
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm flex items-center justify-center gap-3 transition-all"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {/* Google Icon */}
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium">Continuar con Google</span>
              </>
            )}
          </Button>

          {/* Texto informativo */}
          <p className="text-center text-sm text-gray-500">
            Al continuar, aceptas nuestros términos y condiciones
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="mt-8 text-center text-white/70 text-sm">
        © {new Date().getFullYear()} Punto Tecnowork. Todos los derechos reservados.
      </p>
    </div>
  );
};

export default Login;
