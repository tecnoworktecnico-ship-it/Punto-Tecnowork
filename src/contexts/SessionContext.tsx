"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
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
  local_id: string | null;
}

// Interface del contexto
interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoaded: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/', '/login', '/auth-callback'];

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
  const mounted = useRef(true);
  const lastProcessedEvent = useRef<string | null>(null);

  // Obtener perfil del usuario
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      console.log('SessionContext - Fetching profile for:', userId);
      console.log('QUERY_CHECK:', userId); // <-- LOG DE DEPURACIÓN AÑADIDO
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*') // <-- Asegurado que use select('*')
        .eq('id', userId)
        .maybeSingle(); // Usamos maybeSingle para robustez

      if (error) {
        console.error('SessionContext - Error fetching profile:', error);
        if (mounted.current) setProfileLoaded(true);
        return null;
      }
      
      if (data && mounted.current) {
        console.log('SessionContext - Profile fetched, role:', data.role);
        setProfile(data as Profile);
        setProfileLoaded(true);
        return data as Profile;
      }
      
      console.log('SessionContext - No profile found');
      if (mounted.current) setProfileLoaded(true);
      return null;
    } catch (error) {
      console.error('SessionContext - Unexpected error:', error);
      if (mounted.current) setProfileLoaded(true);
      return null;
    }
  }, []);

  // Refrescar perfil manualmente
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // Navegación basada en rol
  const handleNavigation = useCallback((currentProfile: Profile, currentPath: string) => {
    // NO redirigir si ya está en la ruta correcta
    if (currentProfile.role === 'admin' && currentPath.startsWith('/admin')) return;
    if (currentProfile.role === 'local' && currentPath.startsWith('/local')) return;
    if (currentProfile.role === 'client' && currentPath.startsWith('/client')) return;

    // Solo redirigir desde rutas públicas (excepto auth-callback que tiene su propia lógica)
    if (currentPath === '/auth-callback') return;
    if (!PUBLIC_PATHS.includes(currentPath)) return;

    console.log('SessionContext - Redirecting based on role:', currentProfile.role);
    
    if (currentProfile.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (currentProfile.role === 'local') {
      navigate('/local/dashboard', { replace: true });
    } else if (currentProfile.role === 'client') {
      navigate('/client', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    mounted.current = true;

    const initializeSession = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      console.log('SessionContext - Initializing session...');

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('SessionContext - Error getting session:', error);
        }

        if (mounted.current) {
          if (initialSession) {
            console.log('SessionContext - Session found:', initialSession.user.email);
            setSession(initialSession);
            setUser(initialSession.user);
            
            // Cargar perfil
            const userProfile = await fetchProfile(initialSession.user.id);
            
            // Redirigir si tiene perfil y está en ruta pública
            if (userProfile) {
              handleNavigation(userProfile, location.pathname);
            }
          } else {
            console.log('SessionContext - No session found');
            setProfileLoaded(true);
          }
        }
      } catch (err) {
        console.error('SessionContext - Initialization error:', err);
      } finally {
        // CRÍTICO: Asegurar que loading se desactive siempre al finalizar la inicialización
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    initializeSession();

    // Suscripción a eventos de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // Evitar procesar eventos duplicados
        const eventKey = `${event}-${currentSession?.user?.id || 'none'}`;
        if (lastProcessedEvent.current === eventKey) {
          return;
        }
        lastProcessedEvent.current = eventKey;
        
        console.log('SessionContext - Auth event:', event);
        
        if (!mounted.current || isSigningOut.current) return;

        // Ignorar INITIAL_SESSION - ya lo manejamos en initializeSession
        if (event === 'INITIAL_SESSION') {
          return;
        }

        // SIGNED_IN: Usuario inició sesión (o se refrescó)
        if (event === 'SIGNED_IN' && currentSession) {
          // Si ya estamos inicializados y tenemos el mismo usuario, no hacer nada
          if (isInitialized.current && session?.user?.id === currentSession.user.id) {
            return;
          }
          
          console.log('SessionContext - User signed in (via event):', currentSession.user.email);
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Forzar la carga del perfil y navegación si no estamos en el flujo de callback
          if (location.pathname !== '/auth-callback') {
            try {
              const userProfile = await fetchProfile(currentSession.user.id);
              if (userProfile && mounted.current) {
                handleNavigation(userProfile, location.pathname);
              }
            } catch (e) {
              console.error('Error during SIGNED_IN profile processing:', e);
            }
          }
          
          // Asegurar que loading se desactive si este evento es el que resuelve la carga
          if (mounted.current) setLoading(false);
          
          return;
        }

        // SIGNED_OUT: Usuario cerró sesión
        if (event === 'SIGNED_OUT') {
          console.log('SessionContext - User signed out');
          if (mounted.current) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setProfileLoaded(false);
            setLoading(false);
          }
          return;
        }

        // TOKEN_REFRESHED: Actualizar sesión
        if (event === 'TOKEN_REFRESHED' && currentSession) {
          if (mounted.current) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
        }
      }
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, handleNavigation, location.pathname, session?.user?.id]);

  // Cerrar sesión
  const signOut = useCallback(async () => {
    try {
      console.log('SessionContext - Signing out...');
      isSigningOut.current = true;
      isInitialized.current = false;
      lastProcessedEvent.current = null;
      
      // Limpiar estado ANTES de llamar a signOut
      setSession(null);
      setUser(null);
      setProfile(null);
      setProfileLoaded(false);
      
      // Navegar primero para evitar problemas de componentes desmontados
      navigate('/login', { replace: true });
      
      // Luego cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error && error.message !== "Auth session missing!") {
        console.error('Error signing out:', error);
        showError(`Error al cerrar sesión: ${error.message}`);
      } else {
        showSuccess('Sesión cerrada correctamente.');
      }
      
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
    } finally {
      isSigningOut.current = false;
    }
  }, [navigate]);

  // Pantalla de carga inicial
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