import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
}

// ============================================
// SISTEMA HÍBRIDO: localStorage + sessionStorage heartbeat
// Soluciona: pull-to-refresh en móviles + cierre de pestaña en desktop
// ============================================

const SESSION_HEARTBEAT_KEY = 'app_session_heartbeat';

// Verificar si es una nueva pestaña/ventana (vs pull-to-refresh)
const isNewBrowserSession = () => {
  const heartbeat = sessionStorage.getItem(SESSION_HEARTBEAT_KEY);
  return !heartbeat;
};

// Si es una nueva sesión de navegador (pestaña cerrada y reabierta),
// limpiar tokens antiguos de localStorage
if (isNewBrowserSession()) {
  console.log('New browser session detected, clearing old auth tokens');
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
      localStorage.removeItem(key);
    }
  });
}

// Establecer el heartbeat para indicar que la pestaña está activa
sessionStorage.setItem(SESSION_HEARTBEAT_KEY, Date.now().toString());

// Actualizar el heartbeat periódicamente (cada 30 segundos)
setInterval(() => {
  sessionStorage.setItem(SESSION_HEARTBEAT_KEY, Date.now().toString());
}, 30000);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignorar errores
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignorar errores
        }
      },
    },
  },
});