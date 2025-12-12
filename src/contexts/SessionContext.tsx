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

const PUBLIC_PATHS = ['/', '/login', '/auth-callback', '/verification-error', '/reset-password'];

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = async (userId: string, retries = 3): Promise<Profile | null> => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`SessionContext - Fetching profile for user (attempt ${i + 1}/${retries}):`, userId);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error(`Error fetching profile (attempt ${i + 1}):`, profileError);
          
          // Si es error de recursión o permisos, esperar y reintentar
          if (profileError.code === '42P17' || profileError.code === 'PGRST301') {
            if (i < retries - 1) {
              console.log('Waiting before retry...');
              await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
              continue;
            }
          }
          
          return null;
        }
        
        console.log('SessionContext - Profile fetched successfully:', profileData);
        return profileData;
      } catch (error) {
        console.error(`Unexpected error fetching profile (attempt ${i + 1}):`, error);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    return null;
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
    
    if (role === 'admin' && currentPath.startsWith('/admin')) return;
    if (role === 'local' && currentPath.startsWith('/local')) return;
    if (role === 'client' && currentPath.startsWith('/client')) return;
    
    if (role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (role === 'local') {
      navigate('/local/dashboard', { replace: true });
    } else if (role === 'client') {
      navigate('/client', { replace: true });
    }
  };

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      console.log('SessionContext - Initializing session...');
      
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('SessionContext - Error getting session:', error);
          if (mounted) setLoading(false);
          return;
        }

        console.log('SessionContext - Current session:', !!currentSession);

        if (currentSession && mounted) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          const profileData = await fetchProfile(currentSession.user.id);
          
          if (profileData && mounted) {
            console.log('SessionContext - Profile loaded, role:', profileData.role);
            setProfile(profileData);
            
            const currentPath = location.pathname;
            if (PUBLIC_PATHS.includes(currentPath)) {
              redirectBasedOnRole(profileData.role, currentPath);
            }
          } else if (mounted) {
            console.error('SessionContext - Could not load profile');
            showError('Error al cargar el perfil. Por favor, intenta cerrar sesión y volver a iniciar.');
          }
        }
        
        if (mounted) setLoading(false);
      } catch (err) {
        console.error('SessionContext - Initialization error:', err);
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContext - Auth event:', event, 'has session:', !!currentSession);
        
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          
          const currentPath = location.pathname;
          if (!PUBLIC_PATHS.includes(currentPath)) {
            navigate('/login', { replace: true });
          }
          return;
        }

        if (event === 'SIGNED_IN' && currentSession) {
          console.log('SessionContext - User signed in');
          
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Esperar un poco para que el trigger cree el perfil
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const profileData = await fetchProfile(currentSession.user.id);
          
          if (profileData && mounted) {
            console.log('SessionContext - Profile loaded, role:', profileData.role);
            setProfile(profileData);
            redirectBasedOnRole(profileData.role, location.pathname);
          } else {
            console.error('SessionContext - Failed to load profile');
            showError('Error al cargar el perfil. Por favor, contacta al administrador.');
          }
          return;
        }

        if (event === 'TOKEN_REFRESHED' && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        }

        if (event === 'USER_UPDATED' && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          await refreshProfile();
        }
      }
    );

    return () => {
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