"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import BrandingDisplay from '@/components/BrandingDisplay'; // Importar el nuevo componente

function Login() {
  const navigate = useNavigate();
  const { session, loading } = useSession();

  useEffect(() => {
    if (session && !loading) {
      // Redirection is handled by SessionContext based on role
      // This page should only be accessible if not authenticated
      // If session exists, it means the user is already being redirected
    }
  }, [session, loading, navigate]);

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
          <BrandingDisplay type="main" className="h-20 mx-auto mb-4" /> {/* Mostrar el logo principal */}
          <h2 className="text-3xl font-bold text-center text-text-carbon">Bienvenido a Punto Tecnowork</h2>
        </div>
        <Auth
          supabaseClient={supabase}
          providers={[]} // No third-party providers unless specified
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'var(--primary-blue)',
                  brandAccent: 'var(--primary-blue)',
                  inputBackground: '#f0f4f8',
                  inputBorder: '#d1d8e0',
                  inputBorderHover: 'var(--primary-blue)',
                  inputBorderFocus: 'var(--primary-blue)',
                  inputText: 'var(--text-carbon)',
                  inputPlaceholder: '#6b7280',
                  messageText: 'var(--text-carbon)',
                  messageBackground: '#e2e8f0',
                  anchorText: 'var(--primary-blue)',
                  anchorTextHover: 'var(--primary-blue)',
                  buttonBackground: 'var(--primary-blue)',
                  buttonBackgroundHover: '#357ae8', // Slightly darker blue
                  buttonBorder: 'var(--primary-blue)',
                  buttonText: 'var(--text-on-color)',
                  dividerBackground: '#e2e8f0',
                },
                radii: {
                  borderRadiusButton: '0.5rem',
                  borderRadiusInput: '0.5rem',
                  borderRadiusShadcn: '0.5rem',
                },
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
                social_auth_typography: 'O continuar con',
                link_text: '¿Ya tienes una cuenta? Inicia sesión',
                forgotten_password_text: '¿Olvidaste tu contraseña?',
                confirmation_text: 'Revisa tu correo para el enlace de confirmación',
              },
              sign_up: {
                email_label: 'Correo electrónico',
                password_label: 'Contraseña',
                email_input_placeholder: 'Tu correo electrónico',
                password_input_placeholder: 'Tu contraseña',
                button_label: 'Registrarse',
                social_auth_typography: 'O continuar con',
                link_text: '¿No tienes una cuenta? Regístrate',
                confirmation_text: 'Revisa tu correo para el enlace de confirmación',
              },
              forgotten_password: {
                email_label: 'Correo electrónico',
                email_input_placeholder: 'Tu correo electrónico',
                button_label: 'Enviar instrucciones de recuperación',
                link_text: '¿Recordaste tu contraseña? Inicia sesión',
                confirmation_text: 'Revisa tu correo para el enlace de recuperación',
              },
              update_password: {
                password_label: 'Nueva contraseña',
                password_input_placeholder: 'Tu nueva contraseña',
                button_label: 'Actualizar contraseña',
                confirmation_text: 'Tu contraseña ha sido actualizada',
              },
              magic_link: {
                email_input_placeholder: 'Tu correo electrónico',
                button_label: 'Enviar enlace mágico',
                link_text: 'Enviar un enlace mágico',
                confirmation_text: 'Revisa tu correo para el enlace mágico',
              },
              verify_otp: {
                email_input_placeholder: 'Tu correo electrónico',
                phone_input_placeholder: 'Tu número de teléfono',
                token_input_placeholder: 'Código OTP',
                button_label: 'Verificar OTP',
                link_text: '¿Ya tienes una cuenta? Inicia sesión',
              },
            },
          }}
        />
      </div>
      <MadeWithDyad />
    </div>
  );
}

export default Login;