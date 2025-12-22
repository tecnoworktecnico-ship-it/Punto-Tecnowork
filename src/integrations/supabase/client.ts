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
const storedVersion = sessionStorage.getItem(SESSION_VERSION_KEY);
if (storedVersion !== APP_SESSION_VERSION) {
  console.log('App version changed, clearing old session data');
  // Limpiar cualquier dato de sesión antigua en sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
  // Limpiar cualquier token de auth persistido en localStorage (por si acaso)
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
      localStorage.removeItem(key);
    }
  });
  sessionStorage.setItem(SESSION_VERSION_KEY, APP_SESSION_VERSION);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Usar sessionStorage en lugar de localStorage
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