"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

// Interface del perfil - DEBE coincidir con la tabla profiles de Supabase
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  avatar_url: string | null;
  password_changed: boolean | null;
  phone_number: string | null;
  points: number | null;
  local_id: string | null;  // Necesario para dashboards locales
}

// Interface del contexto - TODOS los campos que otros componentes usan
interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoaded: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setIsRequestingPasswordReset: (value: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/', '/login', '/auth-callback', '/verification-error', '/reset-password', '/debug-recovery'];

// Helper para verificar si el modo de recuperación está activo
const isRecoveryModeActive = () => {
  // Verificar localStorage
  const expiration = localStorage.getItem('supabase_password_recovery_mode');
  if (expiration) {
    const expirationTime = parseInt(expiration, 10);
    if (Date.now() < expirationTime) {
      return true;
    }
    localStorage.removeItem('supabase_password_recovery_mode');
  }
  
  // Verificar URL
  const hash = window.location.hash;
  return hash.includes('type=recovery');
};

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const isInitialized = useRef(false);
  const isSigningOut = useRef(false);
  const isRequestingReset = useRef(false);
  const mounted = useRef(true);

  // Función para Login.tsx - evita redirecciones durante solicitud de reset
  const setIsRequestingPasswordReset = (value: boolean) => {
    console.log('SessionContext - Setting isRequestingPasswordReset to:', value);
    isRequestingReset.current = value;
  };

  // Obtener perfil del usuario
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('SessionContext - Fetching profile for:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('SessionContext - Error fetching profile:', error);
        setProfileLoaded(true);
        return null;
      }
      
      if (data) {
        console.log('SessionContext - Profile fetched:', data.role);
        setProfile(data as Profile);
        setProfileLoaded(true);
        return data as Profile;
      }
      
      setProfileLoaded(true);
      return null;
    } catch (error) {
      console.error('SessionContext - Unexpected error:', error);
      setProfileLoaded(true);
      return null;
    }
  };

  // Refrescar perfil manualmente
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Navegación basada en rol
  const handleNavigation = (currentProfile: Profile, currentPath: string) => {
    // NO redirigir si estamos en recuperación de contraseña
    if (currentPath === '/reset-password' || currentPath === '/update-password') {
      console.log('SessionContext - On reset page, skipping navigation');
      return;
    }
    
    // NO redirigir si el usuario está solicitando reset
    if (isRequestingReset.current) {
      console.log('SessionContext - Password reset in progress, skipping navigation');
      return;
    }
    
    // NO redirigir si ya está en la ruta correcta
    if (currentProfile.role === 'admin' && currentPath.startsWith('/admin')) return;
    if (currentProfile.role === 'local' && currentPath.startsWith('/local')) return;
    if (currentProfile.role === 'client' && currentPath.startsWith('/client')) return;

    // Solo redirigir desde rutas públicas
    if (!PUBLIC_PATHS.includes(currentPath)) return;

    console.log('SessionContext - Redirecting based on role:', currentProfile.role);
    
    if (currentProfile.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (currentProfile.role === 'local') {
      navigate('/local/dashboard', { replace: true });
    } else if (currentProfile.role === 'client') {
      navigate('/client', { replace: true });
    }
  };

  useEffect(() => {
    mounted.current = true;

    const initializeSession = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      console.log('SessionContext - Initializing session...');

      try {
        const isRecovery = isRecoveryModeActive() || location.pathname === '/reset-password';

        // CRÍTICO: Siempre obtener la sesión, incluso en modo recovery
        // Supabase puede haber procesado el token antes de que React se monte
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('SessionContext - Error getting session:', error);
        }

        if (mounted.current) {
          if (initialSession) {
            console.log('SessionContext - Session found:', initialSession.user.email);
            setSession(initialSession);
            setUser(initialSession.user);
            
            // En modo recovery, solo setear sesión sin cargar perfil ni redirigir
            if (isRecovery) {
              console.log('SessionContext - Recovery mode, session set without redirect');
              setLoading(false);
              return;
            }
            
            // Flujo normal: cargar perfil y redirigir
            const userProfile = await fetchProfile(initialSession.user.id);
            
            if (userProfile && (location.pathname === '/login' || location.pathname === '/')) {
              handleNavigation(userProfile, location.pathname);
            }
          } else {
            console.log('SessionContext - No session found');
            setProfileLoaded(true);
          }
          
          setLoading(false);
        }
      } catch (err) {
        console.error('SessionContext - Initialization error:', err);
        if (mounted.current) {
          setLoading(false);
          setProfileLoaded(true);
        }
      }
    };

    initializeSession();

    // Suscripción a eventos de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContext - Auth event:', event);
        
        if (!mounted.current || isSigningOut.current) return;

        // PASSWORD_RECOVERY: Setear sesión para que ResetPassword.tsx la detecte
        if (event === 'PASSWORD_RECOVERY') {
          console.log('SessionContext - PASSWORD_RECOVERY event');
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);
          
          if (location.pathname !== '/reset-password') {
            navigate('/reset-password');
          }
          return;
        }
        
        // INITIAL_SESSION: Manejar caso donde no hay sesión
        if (event === 'INITIAL_SESSION') {
          if (!currentSession && mounted.current) {
            setLoading(false);
            setProfileLoaded(true);
          }
          return;
        }

        // Ignorar eventos en página de reset excepto SIGNED_OUT
        if (location.pathname === '/reset-password' && event !== 'SIGNED_OUT') {
          console.log('SessionContext - On reset page, ignoring event:', event);
          return;
        }
        
        // SIGNED_IN: Cargar perfil y redirigir
        if (event === 'SIGNED_IN' && currentSession) {
          // Evitar procesamiento redundante
          if (isInitialized.current && !PUBLIC_PATHS.includes(location.pathname)) {
            return;
          }
          
          // No procesar si estamos en modo recovery
          if (isRecoveryModeActive() && PUBLIC_PATHS.includes(location.pathname)) {
            return;
          }
          
          console.log('SessionContext - User signed in');
          setSession(currentSession);
          setUser(currentSession.user);
          
          const userProfile = await fetchProfile(currentSession.user.id);
          
          if (userProfile && mounted.current) {
            handleNavigation(userProfile, location.pathname);
          }
          
          setLoading(false);
          return;
        }

        // SIGNED_OUT: Limpiar estado
        if (event === 'SIGNED_OUT') {
          console.log('SessionContext - User signed out');
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileLoaded(false);
          setLoading(false);
          
          if (!PUBLIC_PATHS.includes(location.pathname)) {
            navigate('/login', { replace: true });
          }
          return;
        }

        // TOKEN_REFRESHED y USER_UPDATED: Actualizar estado
        if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          await refreshProfile();
        }
      }
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  // Cerrar sesión
  const signOut = async () => {
    try {
      console.log('SessionContext - Signing out...');
      isSigningOut.current = true;
      isInitialized.current = false;
      setLoading(true);
      
      setSession(null);
      setUser(null);
      setProfile(null);
      setProfileLoaded(false);
      
      const { error } = await supabase.auth.signOut();
      
      if (error && error.message !== "Auth session missing!") {
        console.error('Error signing out:', error);
        showError(`Error al cerrar sesión: ${error.message}`);
      } else {
        showSuccess('Sesión cerrada correctamente.');
      }
      
      navigate('/login', { replace: true });
      
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isSigningOut.current = false;
      }, 500);
    }
  };

  // Pantalla de carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 text-primary-blue animate-spin mr-2" />
        <p className="text-primary-blue text-xl">Cargando...</p>
      </div>
    );
  }

  const value: SessionContextType = {
    session,
    user,
    profile,
    loading,
    profileLoaded,
    signOut,
    refreshProfile,
    setIsRequestingPasswordReset
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
