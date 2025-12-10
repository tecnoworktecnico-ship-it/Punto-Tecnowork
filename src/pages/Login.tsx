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
    // Si ya hay sesión activa, redirigir (manejado por SessionContext)
    if (session && !loading) {
      return;
    }

    // Manejar hash en la URL
    if (location.hash) {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const error = hashParams.get('error');
      const errorCode = hashParams.get('error_code');
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      
      // Manejar errores de verificación
      if (error && (errorCode === 'otp_expired' || error === 'access_denied')) {
        navigate('/verification-error', { replace: true });
        return;
      }
      
      // Si es un flujo de recuperación con token válido, ir a reset-password
      if (type === 'recovery' && accessToken) {
        navigate('/reset-password' + location.hash, { replace: true });
        return;
      }
      
      // Para cualquier otro tipo de autenticación con token, ir a auth-callback
      if (accessToken && type !== 'recovery') {
        navigate('/auth-callback' + location.hash, { replace: true });
        return;
      }
      
      // Si hay hash pero no es ninguno de los casos anteriores, limpiar el hash
      // Esto evita el mensaje de error al volver de reset-password
      if (!accessToken && !error) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [session, loading, navigate, location.hash]);

  // Guardar el email cuando cambia para usarlo en caso de error de verificación
  const handleEmailChange = (email: string) => {
    if (email) {
      localStorage.setItem('verificationEmail', email);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que los campos no estén vacíos
    if (!loginData.email || !loginData.password) {
      showError('Por favor completa todos los campos.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email.trim(),
        password: loginData.password,
      });
      
      if (error) {
        console.error('Error signing in:', error);
        showError(error.message);
      } else if (data.session) {
        // La redirección se maneja en SessionContext
        showSuccess('Inicio de sesión exitoso');
      }
    } catch (error) {
      console.error('Unexpected error signing in:', error);
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
      
      // Validar longitud de contraseña
      if (registerData.password.length < 6) {
        showError('La contraseña debe tener al menos 6 caracteres.');
        setIsSubmitting(false);
        return;
      }
      
      // Crear el usuario con la API de Supabase
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
          emailRedirectTo: window.location.origin + '/auth-callback',
        },
      });
      
      if (error) {
        console.error('Error signing up:', error);
        showError(error.message);
      } else if (data) {
        if (data.user) {
          console.log("Usuario creado:", data.user);
          
          // Esperar un momento para que se cree el perfil automáticamente
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Verificar si el perfil se creó
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
                first_name: registerData.first_name.trim(),
                last_name: registerData.last_name.trim(),
                phone_number: registerData.phone_number.trim(),
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
            localStorage.setItem('verificationEmail', registerData.email.trim());
          }
          
          // Limpiar el formulario
          setRegisterData({
            email: '',
            password: '',
            first_name: '',
            last_name: '',
            phone_number: '',
          });
        } else {
          showError('Error al crear el usuario. No se recibió confirmación del servidor.');
        }
      }
    } catch (error) {
      console.error('Unexpected error signing up:', error);
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
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetData.email.trim(), {
        redirectTo: window.location.origin + '/reset-password',
      });
      
      if (error) {
        console.error('Error resetting password:', error);
        showError(error.message);
      } else {
        showSuccess('Se ha enviado un correo para restablecer tu contraseña. Por favor, revisa tu bandeja de entrada.');
        setResetData({ email: '' });
        setActiveTab('sign_in');
      }
    } catch (error) {
      console.error('Unexpected error resetting password:', error);
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
        console.error('Error resending verification:', error);
        showError(`Error al reenviar verificación: ${error.message}`);
      } else {
        showSuccess(`Se ha reenviado el correo de verificación a ${email}`);
      }
    } catch (error) {
      console.error('Unexpected error resending verification:', error);
      showError('Error inesperado al reenviar verificación');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <Loader2 className="h-8 w-8 text-white animate-spin mr-2" />
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
          <p className="text-sm text-center text-gray-500 mt-1">
            Versión: <span className="font-semibold">{APP_VERSION}</span>
          </p>
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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