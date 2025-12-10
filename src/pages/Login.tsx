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

// Obtener la versión de la aplicación
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'N/A';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useSession();
  const [activeTab, setActiveTab] = useState<string>('sign_in');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
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
        // Si parece un callback de auth (incluyendo recovery), redirigir al manejador
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
      // Validar que todos los campos obligatorios estén completos
      if (!registerData.email || !registerData.password || !registerData.first_name || 
          !registerData.last_name || !registerData.phone_number) {
        showError('Por favor completa todos los campos obligatorios.');
        setIsSubmitting(false);
        return;
      }
      
      // Crear el usuario con la API de Supabase
      const { data, error } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            first_name: registerData.first_name,
            last_name: registerData.last_name,
            phone_number: registerData.phone_number,
            role: 'client', // Por defecto, los usuarios registrados son clientes
          },
          emailRedirectTo: window.location.origin + '/auth-callback',
        },
      });
      
      if (error) {
        showError(error.message);
      } else if (data) {
        // Verificar si el usuario fue creado correctamente
        if (data.user) {
          console.log("Usuario creado:", data.user);
          
          // Esperar un momento para que se cree el perfil automáticamente mediante el trigger handle_new_user
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Crear manualmente el perfil si es necesario
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
            
          if (profileError && profileError.code === 'PGRST116') {
            // El perfil no existe, crearlo manualmente
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                first_name: registerData.first_name,
                last_name: registerData.last_name,
                phone_number: registerData.phone_number,
                role: 'client',
              });
              
            if (insertError) {
              console.error('Error creating profile manually:', insertError);
            }
          }
          
          // Verificar si se necesita verificación de correo
          if (data.user.identities && data.user.identities.length === 0) {
            showError('Error al crear el usuario. Por favor, intenta con otro correo electrónico.');
          } else if (data.user.email_confirmed_at) {
            showSuccess('Registro exitoso. Tu correo ya está verificado. Puedes iniciar sesión.');
            setActiveTab('sign_in');
            setRegistrationSuccess(true);
          } else {
            showSuccess('Registro exitoso. Por favor, verifica tu correo electrónico para continuar.');
            setActiveTab('sign_in');
            setRegistrationSuccess(true);
            
            // Guardar el email para posible reenvío de verificación
            localStorage.setItem('verificationEmail', registerData.email);
          }
        } else {
          showError('Error al crear el usuario. No se recibió confirmación del servidor.');
        }
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
      // Usamos la URL base para que Supabase devuelva el hash a la raíz, 
      // y React Router lo redirija a AuthCallback.
      const { error } = await supabase.auth.resetPasswordForEmail(resetData.email, {
        redirectTo: window.location.origin, // Redirigir a la raíz
      });
      
      if (error) {
        showError(error.message);
      } else {
        showSuccess('Se ha enviado un correo para restablecer tu contraseña. Por favor, revisa tu bandeja de entrada.');
        setActiveTab('sign_in');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      showError('Error inesperado al solicitar restablecimiento de contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const email = localStorage.getItem('verificationEmail');
    if (!email) {
      showError('No hay correo electrónico guardado para reenviar la verificación.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      
      if (error) {
        showError(`Error al reenviar verificación: ${error.message}`);
      } else {
        showSuccess(`Se ha reenviado el correo de verificación a ${email}`);
      }
    } catch (error) {
      console.error('Error resending verification:', error);
      showError('Error inesperado al reenviar verificación');
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
              {registrationSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-green-800">
                    <strong>¡Registro exitoso!</strong> Por favor, verifica tu correo electrónico para activar tu cuenta.
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResendVerification}
                    className="mt-2 text-xs"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Enviando...' : 'Reenviar correo de verificación'}
                  </Button>
                </div>
              )}
              
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
                <Label htmlFor="register-phone">Número de Teléfono *</Label>
                <Input 
                  id="register-phone" 
                  type="tel" 
                  placeholder="Ej: 555-1234" 
                  value={registerData.phone_number}
                  onChange={(e) => setRegisterData({...registerData, phone_number: e.target.value})}
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
        
        <div className="text-center text-xs text-gray-400 pt-4">
          Versión: {APP_VERSION}
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
}

export default Login;