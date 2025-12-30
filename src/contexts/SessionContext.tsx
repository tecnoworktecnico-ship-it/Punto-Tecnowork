"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

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

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setIsRequestingPasswordReset: (value: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/', '/login', '/auth-callback', '/verification-error', '/reset-password', '/debug-recovery'];

// Helper para verificar si el modo de recuperación está activo (cross-tab)
const isRecoveryModeActive = () => {
  const expiration = localStorage.getItem('supabase_password_recovery_mode');
  if (!expiration) return false;
  
  const expirationTime = parseInt(expiration, 10);
  const isActive = Date.now() < expirationTime;
  
  if (!isActive) {
    localStorage.removeItem('supabase_password_recovery_mode');
  }
  
  return isActive;
};

// CAMBIO DE NOMBRE A SessionContextProvider PARA QUE APP.TSX NO FALLE
export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Refs para control de estado y evitar bucles
  const isInitialized = useRef(false);
  const isSigningOut = useRef(false);
  const isRequestingReset = useRef(false);

  // Función para permitir que Login.tsx indique que se está pidiendo reset
  const setIsRequestingPasswordReset = (value: boolean) => {
    isRequestingReset.current = value;
  };

  const fetchProfile = async (userId: string) => {
    try {
      console.log(`SessionContext - Fetching profile for user (attempt): ${userId}`);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('SessionContext - Error fetching profile:', error);
        return null;
      }
      
      if (data) {
        console.log('SessionContext - Profile fetched successfully:', data);
        setProfile(data as Profile);
        return data as Profile;
      }
      return null;
    } catch (error) {
      console.error('SessionContext - Unexpected error fetching profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Manejo centralizado de navegación
  const handleNavigation = (currentProfile: Profile, currentPath: string) => {
    // Si estamos pidiendo reset, NO redirigir
    if (isRequestingReset.current) return;
    
    // Si estamos en recuperación, NO redirigir
    if (currentPath === '/reset-password' || currentPath === '/update-password') return;

    // Si ya estamos en la ruta correcta, no hacer nada
    if (currentProfile.role === 'admin' && currentPath.startsWith('/admin')) return;
    if (currentProfile.role === 'local' && currentPath.startsWith('/local')) return;
    if (currentProfile.role === 'client' && currentPath.startsWith('/client')) return;

    console.log(`SessionContext - Redirecting based on role: ${currentProfile.role} current path: ${currentPath}`);
    
    if (currentProfile.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (currentProfile.role === 'local') {
      navigate('/local/dashboard', { replace: true });
    } else if (currentProfile.role === 'client') {
      navigate('/client', { replace: true });
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      console.log('SessionContext - Initializing session...');
      
      try {
        // Verificar si estamos en flujo de recuperación de contraseña
        const isRecovery = isRecoveryModeActive() || 
                           window.location.hash.includes('type=recovery') ||
                           location.pathname === '/reset-password';

        if (isRecovery) {
          console.log('SessionContext - Recovery mode detected, skipping standard init');
          setLoading(false);
          return;
        }

        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('SessionContext - Error getting session:', error);
          if (!window.location.pathname.includes('/login')) {
             // Solo limpiar si hay error real
          }
        }

        if (mounted) {
          if (initialSession) {
            console.log('SessionContext - Session found during init');
            setSession(initialSession);
            setUser(initialSession.user);
            const userProfile = await fetchProfile(initialSession.user.id);
            
            // Redirección inicial solo si estamos en login o root
            if (userProfile && (location.pathname === '/login' || location.pathname === '/')) {
               handleNavigation(userProfile, location.pathname);
            }
          } else {
            console.log('SessionContext - No session found during init');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('SessionContext - Initialization error:', err);
        if (mounted) setLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`SessionContext - Auth event: ${event}`);
      
      if (!mounted) return;
      if (isSigningOut.current) return;

      // Manejo específico de PASSWORD_RECOVERY
      if (event === 'PASSWORD_RECOVERY') {
        console.log('SessionContext - Password recovery event detected');
        setLoading(false);
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession) {
        // Solo buscar perfil si cambió la sesión o no tenemos perfil
        if (!profile || profile.id !== currentSession.user.id) {
           const newProfile = await fetchProfile(currentSession.user.id);
           if (newProfile && (location.pathname === '/login' || location.pathname === '/')) {
             handleNavigation(newProfile, location.pathname);
           }
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setUser(null);
        // Solo redirigir al login si no estamos en una página pública
        if (!PUBLIC_PATHS.includes(location.pathname)) {
            navigate('/login', { replace: true });
        }
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  const signOut = async () => {
    try {
      console.log('SessionContext - Starting sign out...');
      isSigningOut.current = true;
      isInitialized.current = false; // Permitir re-inicialización futura
      setLoading(true);
      
      // Limpieza optimista
      setSession(null);
      setUser(null);
      setProfile(null);
      
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 text-primary-blue animate-spin mr-2" />
        <p className="text-primary-blue text-xl">Cargando autenticación...</p>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile, setIsRequestingPasswordReset }}>
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