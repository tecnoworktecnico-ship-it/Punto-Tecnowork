"use client";

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSession } from '@/contexts/SessionContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import BrandingDisplay from '@/components/BrandingDisplay';
import { supabase } from '@/integrations/supabase/client';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useSession();
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    // Verificar si hay errores en la URL (por ejemplo, de verificación de correo)
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const error = hashParams.get('error');
    const errorCode = hashParams.get('error_code');
    
    if (error && (errorCode === 'otp_expired' || error === 'access_denied')) {
      navigate('/verification-error');
    }

    if (session && !loading) {
      // La redirección se maneja en SessionContext
    }
  }, [session, loading, navigate, location]);

  // Guardar el email cuando cambia para usarlo en caso de error de verificación
  const handleEmailChange = (email: string) => {
    setEmail(email);
    if (email) {
      localStorage.setItem('verificationEmail', email);
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
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#4285F4',
                  brandAccent: '#3367D6',
                  brandButtonText: 'white',
                  defaultButtonBackground: '#4285F4',
                  defaultButtonBackgroundHover: '#3367D6',
                  defaultButtonBorder: '#4285F4',
                  defaultButtonText: 'white',
                  inputBackground: 'white',
                  inputBorder: '#d1d5db',
                  inputBorderHover: '#4285F4',
                  inputBorderFocus: '#4285F4',
                  inputText: '#323232',
                  inputLabelText: '#323232',
                  inputPlaceholder: '#9ca3af',
                },
                space: {
                  buttonPadding: '10px 15px',
                  inputPadding: '10px 15px',
                },
                fontSizes: {
                  baseButtonSize: '16px',
                  baseInputSize: '16px',
                },
                radii: {
                  borderRadiusButton: '6px',
                  buttonBorderRadius: '6px',
                  inputBorderRadius: '6px',
                },
              },
            },
            style: {
              button: {
                background: '#4285F4',
                color: 'white',
                borderRadius: '6px',
                padding: '10px 15px',
                fontWeight: '600',
              },
              anchor: {
                color: '#4285F4',
                textDecoration: 'underline',
              },
              container: {
                width: '100%',
              },
              label: {
                color: '#323232',
                fontWeight: '500',
                marginBottom: '6px',
              },
              input: {
                background: 'white',
                color: '#323232',
                borderColor: '#d1d5db',
                borderRadius: '6px',
                padding: '10px 15px',
              },
            },
          }}
          theme="light"
          localization={{
            variables: {
              sign_in: {
                email_label: 'Correo electrónico',
                password_label: 'Contraseña',
                email_input_placeholder: 'Tu correo electrónico',
                password_input_placeholder: 'Tu contraseña',
                button_label: 'Iniciar sesión',
                loading_button_label: 'Iniciando sesión...',
                social_provider_text: 'Iniciar sesión con {{provider}}',
                link_text: '¿Ya tienes una cuenta? Inicia sesión',
              },
              sign_up: {
                email_label: 'Correo electrónico',
                password_label: 'Contraseña',
                email_input_placeholder: 'Tu correo electrónico',
                password_input_placeholder: 'Tu contraseña',
                button_label: 'Registrarse',
                loading_button_label: 'Registrándose...',
                social_provider_text: 'Registrarse con {{provider}}',
                link_text: '¿No tienes una cuenta? Regístrate',
              },
              forgotten_password: {
                email_label: 'Correo electrónico',
                password_label: 'Contraseña',
                email_input_placeholder: 'Tu correo electrónico',
                button_label: 'Enviar instrucciones',
                loading_button_label: 'Enviando instrucciones...',
                link_text: '¿Olvidaste tu contraseña?',
              },
            },
          }}
          onEmailInputChange={(e) => handleEmailChange(e.target.value)}
        />
      </div>
      <MadeWithDyad />
    </div>
  );
}

export default Login;