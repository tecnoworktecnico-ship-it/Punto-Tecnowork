"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  avatar_url: string | null;
  password_changed: boolean | null;
  phone_number: string | null;
}

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = ['/', '/login', '/auth-callback', '/verification-error', '/reset-password'];

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('SessionContext - Fetching profile for user:', userId);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }
      
      console.log('SessionContext - Profile fetched:', profileData);
      return profileData;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    if (profileData) {
      setProfile(profileData);
    }
  };

  const redirectBasedOnRole = (role: string, currentPath: string) => {
    console.log('SessionContext - Redirecting based on role:', role, 'current path:', currentPath);
    
    // No redirigir si ya estamos en la ruta correcta
    if (role === 'admin' && currentPath.startsWith('/admin')) {
      console.log('Already in admin route, skipping redirect');
      return;
    }
    if (role === 'local' && currentPath.startsWith('/local')) {
      console.log('Already in local route, skipping redirect');
      return;
    }
    if (role === 'client' && currentPath.startsWith('/client')) {
      console.log('Already in client route, skipping redirect');
      return;
    }
    
    // Redirigir según el rol
    if (role === 'admin') {
      console.log('Redirecting to admin dashboard');
      navigate('/admin/dashboard', { replace: true });
    } else if (role === 'local') {
      console.log('Redirecting to local dashboard');
      navigate('/local/dashboard', { replace: true });
    } else if (role === 'client') {
      console.log('Redirecting to client dashboard');
      navigate('/client', { replace: true });
    }
  };

  // Inicialización y manejo de sesión
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      console.log('SessionContext - Initializing session...');
      
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('SessionContext - Error getting session:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        console.log('SessionContext - Current session:', !!currentSession);

        if (currentSession && mounted) {
          console.log('SessionContext - Session found, setting state...');
          setSession(currentSession);
          setUser(currentSession.user);
          
          const profileData = await fetchProfile(currentSession.user.id);
          
          if (profileData && mounted) {
            console.log('SessionContext - Profile loaded, role:', profileData.role);
            setProfile(profileData);
            
            // Solo redirigir si estamos en una ruta pública
            const currentPath = location.pathname;
            if (PUBLIC_PATHS.includes(currentPath)) {
              console.log('SessionContext - In public path, redirecting...');
              redirectBasedOnRole(profileData.role, currentPath);
            }
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('SessionContext - Initialization error:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    // Listener de cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContext - Auth event:', event, 'has session:', !!currentSession);
        
        if (!mounted) {
          console.log('Component unmounted, ignoring event');
          return;
        }

        // Manejar cierre de sesión
        if (event === 'SIGNED_OUT') {
          console.log('SessionContext - User signed out');
          setSession(null);
          setUser(null);
          setProfile(null);
          
          const currentPath = location.pathname;
          if (!PUBLIC_PATHS.includes(currentPath)) {
            navigate('/login', { replace: true });
          }
          return;
        }

        // Manejar inicio de sesión
        if (event === 'SIGNED_IN' && currentSession) {
          console.log('SessionContext - User signed in, user ID:', currentSession.user.id);
          
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Esperar un poco para asegurar que el perfil esté creado
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const profileData = await fetchProfile(currentSession.user.id);
          
          if (profileData && mounted) {
            console.log('SessionContext - Profile loaded after sign in, role:', profileData.role);
            setProfile(profileData);
            
            // Forzar redirección después de login
            const currentPath = location.pathname;
            console.log('SessionContext - Current path after login:', currentPath);
            redirectBasedOnRole(profileData.role, currentPath);
          } else {
            console.error('SessionContext - Failed to load profile after sign in');
            showError('Error al cargar el perfil de usuario. Por favor, intenta de nuevo.');
          }
          return;
        }

        // Manejar actualización de token
        if (event === 'TOKEN_REFRESHED' && currentSession) {
          console.log('SessionContext - Token refreshed');
          setSession(currentSession);
          setUser(currentSession.user);
        }

        // Manejar actualización de usuario
        if (event === 'USER_UPDATED' && currentSession) {
          console.log('SessionContext - User updated');
          setSession(currentSession);
          setUser(currentSession.user);
          await refreshProfile();
        }
      }
    );

    return () => {
      console.log('SessionContext - Cleanup');
      mounted = false;
      subscription.unsubscribe();
    };
  }, [location.pathname, navigate]);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error && error.message !== "Auth session missing!") {
        console.error('Error signing out:', error);
        showError(`Error al cerrar sesión: ${error.message}`);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        showSuccess('Sesión cerrada correctamente.');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
      setSession(null);
      setUser(null);
      setProfile(null);
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SessionContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
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