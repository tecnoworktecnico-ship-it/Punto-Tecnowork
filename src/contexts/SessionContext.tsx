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

  const redirectBasedOnRole = (role: string) => {
    const currentPath = location.pathname;
    
    console.log('SessionContext - Redirecting based on role:', role, 'current path:', currentPath);
    
    // No redirigir si ya estamos en la ruta correcta
    if (role === 'admin' && currentPath.startsWith('/admin')) return;
    if (role === 'local' && currentPath.startsWith('/local')) return;
    if (role === 'client' && currentPath.startsWith('/client')) return;
    
    // Redirigir según el rol
    if (role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (role === 'local') {
      navigate('/local/dashboard', { replace: true });
    } else if (role === 'client') {
      navigate('/client', { replace: true });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      console.log('SessionContext - Initializing auth...');
      
      try {
        // Obtener sesión inicial
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('SessionContext - Error getting session:', error);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        console.log('SessionContext - Initial session:', !!initialSession);

        if (initialSession?.user && isMounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          const profileData = await fetchProfile(initialSession.user.id);
          
          if (isMounted && profileData) {
            setProfile(profileData);
            
            // Solo redirigir si estamos en una ruta pública
            const currentPath = location.pathname;
            if (PUBLIC_PATHS.includes(currentPath) || currentPath === '/') {
              redirectBasedOnRole(profileData.role);
            }
          }
        }
        
        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('SessionContext - Initialization error:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContext - Auth state changed:', event, !!currentSession);
        
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          
          const currentPath = location.pathname;
          if (!PUBLIC_PATHS.includes(currentPath)) {
            navigate('/login', { replace: true });
          }
          return;
        }

        if (event === 'SIGNED_IN' && currentSession?.user) {
          console.log('SessionContext - User signed in, fetching profile...');
          
          setSession(currentSession);
          setUser(currentSession.user);
          
          const profileData = await fetchProfile(currentSession.user.id);
          
          if (isMounted && profileData) {
            setProfile(profileData);
            redirectBasedOnRole(profileData.role);
          }
          
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        if (event === 'TOKEN_REFRESHED' && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        }

        if (event === 'USER_UPDATED' && currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          await refreshProfile();
        }
      }
    );

    return () => {
      console.log('SessionContext - Cleanup');
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

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