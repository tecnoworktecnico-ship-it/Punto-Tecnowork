"use client";

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import Footer from '@/components/Footer'; // Importar Footer

// Obtener la versión de la aplicación
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'N/A';

function Login() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading, profile, setIsRequestingPasswordReset } = useSession();
  const [activeTab, setActiveTab] = useState<string>('sign_in');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const isRequestingReset = useRef(false);
  
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

  // Clases de estilo para inputs en modo oscuro
  const INPUT_CLASS = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all";

  // Redirigir si ya hay sesión activa (solo una vez)
  useEffect(() => {
    // No redirigir si estamos solicitando reset de contraseña
    if (isRequestingReset.current) {
      console.log('Login - Reset in progress, not redirecting');
      return;
    }
    
    if (!sessionLoading && session && profile && !hasRedirected) {
      console.log('Login - Redirecting user with role:', profile.role);
      setHasRedirected(true);
      
      setTimeout(() => {
        if (profile.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (profile.role === 'local') {
          navigate('/local/dashboard', { replace: true });
        } else if (profile.role === 'client') {
          navigate('/client', { replace: true });
        }
      }, 100);
    }
  }, [session, sessionLoading, profile, navigate, hasRedirected]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      showError('Por favor completa todos los campos.');
      return;
    }
    
    setIsSubmitting(true);
    console.log('Login - Starting sign in process...');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email.trim(),
        password: loginData.password,
      });
      
      if (error) {
        console.error('Login error:', error);
        if (error.message === 'Invalid login credentials') {
          showError('Credenciales inválidas. Verifica tu correo y contraseña.');
        } else if (error.message === 'Email not confirmed') {
          showError('Tu correo no ha sido verificado. Revisa tu bandeja de entrada.');
        } else {
          showError(error.message);
        }
        setIsSubmitting(false);
        return;
      }
      
      if (data.session) {
        console.log('Login - Session created successfully');
        showSuccess('Inicio de sesión exitoso');
        // El SessionContext manejará la redirección
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al iniciar sesión');
      setIsSubmitting(false);
    }
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!registerData.email || !registerData.password || !registerData.first_name || 
          !registerData.last_name || !registerData.phone_number) {
        showError('Por favor completa todos los campos obligatorios.');
        setIsSubmitting(false);
        return;
      }
      
      if (registerData.password.length < 6) {
        showError('La contraseña debe tener al menos 6 caracteres.');
        setIsSubmitting(false);
        return;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: registerData.email.trim(),
        password: registerData.password,
        options: {
          data: {
            first_name: registerData.first_name.trim(),
            last_name: registerData.last_name.trim(),
            phone_number: registerData.phone_number.trim(),
            role: 'client',
          },
          emailRedirectTo: `${window.location.origin}/auth-callback`,
        },
      });
      
      if (error) {
        console.error('Sign up error:', error);
        showError(error.message);
        setIsSubmitting(false);
        return;
      }
      
      if (data.user) {
        if (data.user.identities && data.user.identities.length === 0) {
          showError('Este correo ya está registrado. Intenta iniciar sesión.');
        } else {
          showSuccess('Registro exitoso. Por favor, verifica tu correo electrónico.');
          setActiveTab('sign_in');
          setRegistrationSuccess(true);
          localStorage.setItem('verificationEmail', registerData.email.trim());
          
          setRegisterData({
            email: '',
            password: '',
            first_name: '',
            last_name: '',
            phone_number: '',
          });
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al registrarse');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetData.email) {
      showError('Por favor ingresa tu correo electrónico.');
      return;
    }
    
    isRequestingReset.current = true;
    setIsRequestingPasswordReset(true);
    setIsSubmitting(true);
    
    try {
      console.log('Login - Requesting password reset for:', resetData.email);
      
      // Establecer la bandera de recuperación con expiración (10 minutos)
      const RECOVERY_EXPIRATION_MS = 10 * 60 * 1000;
      const expirationTime = Date.now() + RECOVERY_EXPIRATION_MS;
      localStorage.setItem('supabase_password_recovery_mode', expirationTime.toString());
      
      // 1. Enviar el email de recuperación PRIMERO
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetData.email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (resetError) {
        console.error('Reset password error:', resetError);
        showError(resetError.message);
        localStorage.removeItem('supabase_password_recovery_mode'); // Limpiar si falla
        setIsSubmitting(false);
        isRequestingReset.current = false;
        setIsRequestingPasswordReset(false);
        return;
      }
      
      console.log('Login - Password reset email sent successfully');
      
      // 2. INMEDIATAMENTE cerrar cualquier sesión (sin verificar si existe)
      console.log('Login - Force closing any active session');
      await supabase.auth.signOut();
      
      // 3. Limpiar storages (excepto la bandera de recuperación)
      sessionStorage.clear();
      
      // 4. Esperar un momento para que se complete el sign out
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 5. Mostrar mensaje de éxito
      showSuccess('Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.');
      setResetData({ email: '' });
      setActiveTab('sign_in');
      
      // 6. Forzar recarga de la página para limpiar completamente el estado
      console.log('Login - Forcing page reload to clear all state');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado');
      localStorage.removeItem('supabase_password_recovery_mode'); // Limpiar si hay excepción
      setIsSubmitting(false);
      isRequestingReset.current = false;
      setIsRequestingPasswordReset(false);
    }
  };

  const handleResendVerification = async () => {
    const email = localStorage.getItem('verificationEmail');
    if (!email) {
      showError('No hay correo guardado para reenviar la verificación.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      
      if (error) {
        showError(`Error: ${error.message}`);
      } else {
        showSuccess(`Correo de verificación reenviado a ${email}`);
      }
    } catch (error) {
      showError('Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar loading mientras se verifica la sesión
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
        <p className="text-white text-xl">Verificando sesión...</p>
      </div>
    );
  }

  // Si ya hay sesión y estamos redirigiendo, mostrar loading
  if (session && profile && hasRedirected && !isRequestingReset.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
        <p className="text-white text-xl">Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden bg-black">
      {/* Fondo Animado (Luces) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-red-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-80 h-80 bg-yellow-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="glass-card p-8 rounded-3xl shadow-2xl max-w-md w-full relative z-10 border border-white/10 backdrop-blur-xl">
        <div className="mb-6">
          <BrandingDisplay type="main" className="h-20 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-center text-white">Bienvenido</h2>
          <p className="text-sm text-center text-gray-300 mt-1">
            Versión: <span className="font-semibold text-white">{APP_VERSION}</span>
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 border border-white/10">
            <TabsTrigger value="sign_in" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="sign_up" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Registrarse</TabsTrigger>
            <TabsTrigger value="reset_password" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Recuperar</TabsTrigger>
          </TabsList>
          
          {/* Formulario de Inicio de Sesión */}
          <TabsContent value="sign_in">
            <form onSubmit={handleSignIn} className="space-y-4 mt-4">
              {registrationSuccess && (
                <div className="bg-green-900/30 border border-green-400/50 rounded-md p-3 mb-4">
                  <p className="text-sm text-green-400">
                    <strong>¡Registro exitoso!</strong> Verifica tu correo electrónico.
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResendVerification}
                    className="mt-2 text-xs bg-white/10 text-white hover:bg-white/20 border-green-400/50"
                    disabled={isSubmitting}
                  >
                    Reenviar verificación
                  </Button>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-white">Correo electrónico</Label>
                <Input 
                  id="login-email" 
                  type="email" 
                  placeholder="tu@email.com" 
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  required
                  disabled={isSubmitting}
                  className={INPUT_CLASS}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-white">Contraseña</Label>
                <Input 
                  id="login-password" 
                  type="password" 
                  placeholder="Tu contraseña" 
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  required
                  disabled={isSubmitting}
                  className={INPUT_CLASS}
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
                <Label htmlFor="register-email" className="text-white">Correo electrónico *</Label>
                <Input 
                  id="register-email" 
                  type="email" 
                  placeholder="tu@email.com" 
                  value={registerData.email}
                  onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                  required
                  disabled={isSubmitting}
                  className={INPUT_CLASS}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-white">Contraseña *</Label>
                <Input 
                  id="register-password" 
                  type="password" 
                  placeholder="Mínimo 6 caracteres" 
                  value={registerData.password}
                  onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                  required
                  minLength={6}
                  disabled={isSubmitting}
                  className={INPUT_CLASS}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-first-name" className="text-white">Nombre *</Label>
                <Input 
                  id="register-first-name" 
                  type="text" 
                  placeholder="Tu nombre" 
                  value={registerData.first_name}
                  onChange={(e) => setRegisterData({...registerData, first_name: e.target.value})}
                  required
                  disabled={isSubmitting}
                  className={INPUT_CLASS}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-last-name" className="text-white">Apellido *</Label>
                <Input 
                  id="register-last-name" 
                  type="text" 
                  placeholder="Tu apellido" 
                  value={registerData.last_name}
                  onChange={(e) => setRegisterData({...registerData, last_name: e.target.value})}
                  required
                  disabled={isSubmitting}
                  className={INPUT_CLASS}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-phone" className="text-white">Teléfono *</Label>
                <Input 
                  id="register-phone" 
                  type="tel" 
                  placeholder="Ej: 555-1234" 
                  value={registerData.phone_number}
                  onChange={(e) => setRegisterData({...registerData, phone_number: e.target.value})}
                  required
                  disabled={isSubmitting}
                  className={INPUT_CLASS}
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
          
          {/* Formulario de Recuperación */}
          <TabsContent value="reset_password">
            <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
              <div className="bg-blue-900/30 border border-blue-400/50 rounded-md p-3 mb-4">
                <p className="text-sm text-blue-400">
                  Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-white">Correo electrónico</Label>
                <Input 
                  id="reset-email" 
                  type="email" 
                  placeholder="tu@email.com" 
                  value={resetData.email}
                  onChange={(e) => setResetData({...resetData, email: e.target.value})}
                  required
                  disabled={isSubmitting}
                  className={INPUT_CLASS}
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
                    Enviando...
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
      <Footer />
    </div>
  );
}

export default Login;