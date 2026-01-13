import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
}

// Versión de la app para invalidar sesiones antiguas en deploys nuevos
const APP_SESSION_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const SESSION_VERSION_KEY = 'app_session_version';

// Verificar si hay una versión antigua y limpiar si es necesario
const storedVersion = localStorage.getItem(SESSION_VERSION_KEY);
if (storedVersion !== APP_SESSION_VERSION) {
  console.log('App version changed, clearing old session data');
  // Limpiar cualquier dato de sesión antigua en localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-')) {
      localStorage.removeItem(key);
    }
  });
  localStorage.setItem(SESSION_VERSION_KEY, APP_SESSION_VERSION);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // CRÍTICO: Usar sessionStorage para que la sesión se borre al cerrar la ventana/pestaña.
    storage: {
      getItem: (key) => {
        try {
          return sessionStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          sessionStorage.setItem(key, value);
        } catch {
          // Ignorar errores de storage
        }
      },
      removeItem: (key) => {
        try {
          sessionStorage.removeItem(key);
        } catch {
          // Ignorar errores de storage
        }
      },
    },
  },
});