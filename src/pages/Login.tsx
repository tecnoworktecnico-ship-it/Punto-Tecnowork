"use client";

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSession } from '@/contexts/SessionContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import BrandingDisplay from '@/components/BrandingDisplay';
import { supabase } from '@/integrations/supabase/client'; // Importar el cliente de Supabase

function Login() {
  const navigate = useNavigate();
  const { session, loading } = useSession();

  useEffect(() => {
    if (session && !loading) {
      // La redirección se maneja en SessionContext, esta página solo debe ser accesible si no está autenticado.
      // Si hay sesión, el usuario ya está siendo redirigido.
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
          <BrandingDisplay type="main" className="h-20 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-center text-text-carbon">Iniciar Sesión / Registrarse</h2>
        </div>
        <Auth
          supabaseClient={supabase}
          providers={[]} // Puedes añadir proveedores como 'google', 'github' aquí si los configuras en Supabase
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary-blue))', // Usar tu color primario
                  brandAccent: 'hsl(var(--primary-blue))', // Usar tu color primario
                },
              },
            },
          }}
          theme="light"
        />
      </div>
      <MadeWithDyad />
    </div>
  );
}

export default Login;