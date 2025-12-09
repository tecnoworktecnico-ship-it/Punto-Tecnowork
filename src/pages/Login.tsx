"use client";

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import BrandingDisplay from '@/components/BrandingDisplay';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useSession();
  const [activeTab, setActiveTab] = useState<string>('sign_in');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Formulario de inicio de sesión
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  
  // Formulario de registro
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });
  
  // Formulario de recuperación de contraseña
  const [resetData, setResetData] = useState({
    email: '',
  });

  useEffect(() => {
    // If the user lands here with a hash (e.g., from email verification),
    // redirect them to the dedicated callback handler.
    if (location.hash) {
      // Check for errors first, as AuthCallback handles successful session loading
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const error = hashParams.get('error');
      const errorCode = hashParams.get('error_code');
      
      if (error && (errorCode === 'otp_expired' || error === 'access_denied')) {
        navigate('/verification-error', { replace: true });
      } else if (hashParams.get('type') || hashParams.get('access_token')) {
        // If it looks like a successful auth callback (e.g., magic link, verification)
        navigate('/auth-callback', { replace: true });
      }
    }

    if (session && !loading) {
      // The redirection for already signed-in users is handled in SessionContext
    }
  }, [session, loading, navigate, location]);

  // Guardar el email cuando cambia para usarlo en caso de error de verificación
  const handleEmailChange = (email: string) => {
    if (email) {
      localStorage.setItem('verificationEmail', email);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });
      
      if (error) {
        showError(error.message);
      } else {
        // La redirección se maneja en SessionContext
      }
    } catch (error) {
      console.error('Error signing in:', error);
      showError('Error inesperado al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            first_name: registerData.first_name,
            last_name: registerData.last_name,
            phone_number: registerData.phone_number || null,
            role: 'client', // Por defecto, los usuarios registrados son clientes
          },
          emailRedirectTo: window.location.origin + '/auth-callback',
        },
      });
      
      if (error) {
        showError(error.message);
      } else if (data) {
        showSuccess('Registro exitoso. Por favor, verifica tu correo electrónico.');
        setActiveTab('sign_in');
      }
    } catch (error) {
      console.error('Error signing up:', error);
      showError('Error inesperado al registrarse');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetData.email, {
        redirectTo: window.location.origin + '/auth-callback',
      });
      
      if (error) {
        showError(error.message);
      } else {
        showSuccess('Se ha enviado un correo para restablecer tu contraseña.');
        setActiveTab('sign_in');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      showError('Error inesperado al solicitar restablecimiento de contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="mb-6">
          <BrandingDisplay type="main" className="h-20 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-center text-text-carbon">Iniciar Sesión / Registrarse</h2>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sign_in">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="sign_up">Registrarse</TabsTrigger>
            <TabsTrigger value="reset_password">Recuperar</TabsTrigger>
          </TabsList>
          
          {/* Formulario de Inicio de Sesión */}
          <TabsContent value="sign_in">
            <form onSubmit={handleSignIn} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Correo electrónico</Label>
                <Input 
                  id="login-email" 
                  type="email" 
                  placeholder="tu@email.com" 
                  value={loginData.email}
                  onChange={(e) => {
                    setLoginData({...loginData, email: e.target.value});
                    handleEmailChange(e.target.value);
                  }}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input 
                  id="login-password" 
                  type="password" 
                  placeholder="Tu contraseña" 
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary-blue hover:bg-blue-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>
          </TabsContent>
          
          {/* Formulario de Registro */}
          <TabsContent value="sign_up">
            <form onSubmit={handleSignUp} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="register-email">Correo electrónico *</Label>
                <Input 
                  id="register-email" 
                  type="email" 
                  placeholder="tu@email.com" 
                  value={registerData.email}
                  onChange={(e) => {
                    setRegisterData({...registerData, email: e.target.value});
                    handleEmailChange(e.target.value);
                  }}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-password">Contraseña *</Label>
                <Input 
                  id="register-password" 
                  type="password" 
                  placeholder="Contraseña (mínimo 6 caracteres)" 
                  value={registerData.password}
                  onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-first-name">Nombre *</Label>
                <Input 
                  id="register-first-name" 
                  type="text" 
                  placeholder="Tu nombre" 
                  value={registerData.first_name}
                  onChange={(e) => setRegisterData({...registerData, first_name: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-last-name">Apellido *</Label>
                <Input 
                  id="register-last-name" 
                  type="text" 
                  placeholder="Tu apellido" 
                  value={registerData.last_name}
                  onChange={(e) => setRegisterData({...registerData, last_name: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-phone">Número de Teléfono (Opcional)</Label>
                <Input 
                  id="register-phone" 
                  type="tel" 
                  placeholder="Ej: 555-1234" 
                  value={registerData.phone_number}
                  onChange={(e) => setRegisterData({...registerData, phone_number: e.target.value})}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary-blue hover:bg-blue-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrarse'
                )}
              </Button>
            </form>
          </TabsContent>
          
          {/* Formulario de Recuperación de Contraseña */}
          <TabsContent value="reset_password">
            <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Correo electrónico</Label>
                <Input 
                  id="reset-email" 
                  type="email" 
                  placeholder="tu@email.com" 
                  value={resetData.email}
                  onChange={(e) => {
                    setResetData({...resetData, email: e.target.value});
                    handleEmailChange(e.target.value);
                  }}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary-blue hover:bg-blue-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando instrucciones...
                  </>
                ) : (
                  'Enviar Instrucciones'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
      <MadeWithDyad />
    </div>
  );
}

export default Login;