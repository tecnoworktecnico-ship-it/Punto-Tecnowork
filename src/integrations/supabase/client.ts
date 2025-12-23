import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
}

// ============================================
// SISTEMA HÍBRIDO: modo banking solo en desktop
// COMENTADO: Esta lógica es demasiado agresiva y causa pérdida de sesión en refrescos rápidos.
// Se usará la persistencia estándar de Supabase (localStorage).
// ============================================

/*
const SESSION_HEARTBEAT_KEY = 'app_session_heartbeat';

// Detectar si es dispositivo móvil
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Solo en desktop: verificar si es nueva pestaña y limpiar tokens
if (!isMobile) {
  const heartbeat = sessionStorage.getItem(SESSION_HEARTBEAT_KEY);
  if (!heartbeat) {
    console.log('Desktop: New browser session detected, clearing old auth tokens');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Establecer heartbeat (útil para desktop)
sessionStorage.setItem(SESSION_HEARTBEAT_KEY, Date.now().toString());
*/

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