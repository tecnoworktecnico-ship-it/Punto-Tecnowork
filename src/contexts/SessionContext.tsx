import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

// Definición de tipos para el perfil y el contexto
type UserRole = 'admin' | 'local' | 'client';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  phone_number: string | null;
  password_changed?: boolean;
}

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const mounted = useRef(true);

  // Helper para detectar flujo de recuperación en la URL
  const isRecoveryModeActive = () => {
    const hash = window.location.hash;
    const search = window.location.search;
    return (
      hash.includes('type=recovery') ||
      search.includes('code=') ||
      location.pathname === '/reset-password'
    );
  };

  // Función para obtener el perfil del usuario desde la base de datos
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('SessionContext - Error fetching profile:', error);
        return null;
      }
      return data as UserProfile;
    } catch (error) {
      console.error('SessionContext - Unexpected error fetching profile:', error);
      return null;
    }
  };

  // Lógica de navegación basada en el rol
  const handleNavigation = (userProfile: UserProfile, currentPath: string) => {
    if (isRecoveryModeActive()) return; // No redirigir si estamos recuperando contraseña

    // Solo redirigir si estamos en login, landing o raíz
    if (currentPath === '/login' || currentPath === '/' || currentPath === '/auth-callback') {
      switch (userProfile.role) {
        case 'admin':
          navigate('/admin/dashboard', { replace: true });
          break;
        case 'local':
          navigate('/local/dashboard', { replace: true });
          break;
        case 'client':
          navigate('/client', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
      }
    }
  };

  // -----------------------------------------------------------------------
  // CORRECCIÓN PRINCIPAL: Inicialización de Sesión
  // -----------------------------------------------------------------------
  const initializeSession = async () => {
    try {
      const isRecovery = isRecoveryModeActive();

      if (isRecovery) {
        console.log('SessionContext - Recovery mode detected. Proceeding to capture session from URL...');
        // FIX: ELIMINADO EL 'return' QUE HABÍA AQUÍ.
        // Permitimos que el código siga para que getSession() capture el token.
      }

      // getSession() es capaz de detectar tokens en la URL (#access_token o ?code)
      // y establecer la sesión automáticamente.
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();

      if (error) {
        // Si hay error (ej. token inválido), no bloqueamos la app, solo dejamos sin sesión
        console.error('SessionContext - Error getting session:', error);
      }

      if (mounted.current) {
        if (initialSession) {
          console.log('SessionContext - Session established for:', initialSession.user.email);
          setSession(initialSession);
          setUser(initialSession.user);

          // Cargar perfil
          const userProfile = await fetchProfile(initialSession.user.id);
          setProfile(userProfile);

          if (userProfile) {
            handleNavigation(userProfile, location.pathname);
          }
        }
      }
    } catch (err) {
      console.error('SessionContext - Initialization error:', err);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    mounted.current = true;
    initializeSession();

    // Suscripción a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('SessionContext - Auth Event:', event);

      if (mounted.current) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession) {
          // Manejo especial para recuperación de contraseña
          if (event === 'PASSWORD_RECOVERY') {
            console.log('SessionContext - PASSWORD_RECOVERY event received');
            setLoading(false);
            navigate('/reset-password');
            return;
          }

          // Si iniciamos sesión y no tenemos perfil, cargarlo
          if (!profile) {
            const userProfile = await fetchProfile(currentSession.user.id);
            setProfile(userProfile);
            if (userProfile && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
              handleNavigation(userProfile, location.pathname);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          // Limpiar estado al cerrar sesión
          setProfile(null);
          navigate('/login', { replace: true });
        }
        
        setLoading(false);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []); // Ejecutar solo al montar

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      showSuccess('Has cerrado sesión correctamente');
      // El evento SIGNED_OUT manejará la limpieza y redirección
    } catch (error) {
      console.error('Error signing out:', error);
      showError('Error al cerrar sesión');
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signOut,
    refreshProfile
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};