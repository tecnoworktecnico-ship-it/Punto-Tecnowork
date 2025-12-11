"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Rutas que el SessionContext debe ignorar para la redirección automática
const AUTH_PATHS = ['/login', '/auth-callback', '/verification-error', '/reset-password'];

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setProfile(null);
        return null;
      }
      
      setProfile(profileData);
      return profileData;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      setProfile(null);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    const profileData = await fetchProfile(user.id);
    setLoading(false);
    
    // Redirigir según el rol actualizado
    if (profileData) {
      const currentPath = window.location.pathname;
      if (AUTH_PATHS.some(path => currentPath.startsWith(path))) {
        return;
      }
      
      if (profileData.role === 'admin' && !currentPath.startsWith('/admin')) {
        navigate('/admin/dashboard', { replace: true });
      } else if (profileData.role === 'local' && !currentPath.startsWith('/local')) {
        navigate('/local/dashboard', { replace: true });
      } else if (profileData.role === 'client' && !currentPath.startsWith('/client') && currentPath !== '/') {
        navigate('/client', { replace: true });
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const handleSession = async (currentSession: Session | null) => {
      if (!isMounted) return;

      const currentPath = location.pathname;
      
      console.log('SessionContext - handleSession called', { 
        hasSession: !!currentSession, 
        currentPath,
        hash: location.hash
      });

      // Si estamos en /reset-password, NO hacer nada más que establecer la sesión
      if (currentPath === '/reset-password') {
        console.log('SessionContext - On reset-password page, only setting session state');
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user || null);
      const isAuthPath = AUTH_PATHS.some(path => currentPath.startsWith(path));

      console.log('SessionContext - Path checks', { 
        currentPath,
        isAuthPath
      });

      if (currentSession?.user) {
        console.log('SessionContext - User authenticated, fetching profile');
        const profileData = await fetchProfile(currentSession.user.id);
        
        if (!isMounted) return;

        if (profileData) {
          console.log('SessionContext - Profile loaded', { 
            role: profileData.role, 
            currentPath, 
            isAuthPath
          });
          
          // NO redirigir si estamos en una ruta de autenticación
          if (!isAuthPath) {
            if (profileData.role === 'admin' && !currentPath.startsWith('/admin')) {
              console.log('SessionContext - Redirecting to admin dashboard');
              navigate('/admin/dashboard', { replace: true });
            } else if (profileData.role === 'local' && !currentPath.startsWith('/local')) {
              console.log('SessionContext - Redirecting to local dashboard');
              navigate('/local/dashboard', { replace: true });
            } else if (profileData.role === 'client' && !currentPath.startsWith('/client') && currentPath !== '/') {
              console.log('SessionContext - Redirecting to client dashboard');
              navigate('/client', { replace: true });
            }
          } else {
            console.log('SessionContext - Skipping redirect due to auth path');
          }
        }
      } else {
        console.log('SessionContext - No user session');
        setProfile(null);
        // Redirigir al login solo si NO estamos ya en una ruta de autenticación
        if (!isAuthPath && currentPath !== '/') {
          console.log('SessionContext - Redirecting to login');
          navigate('/login', { replace: true });
        }
      }
      
      if (isMounted) {
        console.log('SessionContext - Setting loading to false');
        setLoading(false);
      }
    };

    console.log('SessionContext - Initial setup');
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('SessionContext - Initial session retrieved', { hasSession: !!initialSession });
      handleSession(initialSession);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContext - Auth state changed', { event, hasSession: !!currentSession });
        
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            const currentPath = window.location.pathname;
            const isAuthPath = AUTH_PATHS.some(path => currentPath.startsWith(path));
            if (!isAuthPath) {
              navigate('/login', { replace: true });
            }
            showSuccess('Sesión cerrada correctamente.');
          }
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          console.log('SessionContext - Handling session for event:', event);
          handleSession(currentSession);
        } else if (event === 'PASSWORD_RECOVERY') {
          console.log('SessionContext - Password recovery event, setting session only');
          // Solo establecer la sesión, no redirigir
          setSession(currentSession);
          setUser(currentSession?.user || null);
          if (isMounted) setLoading(false);
        }
      }
    );

    return () => {
      console.log('SessionContext - Cleanup');
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate, location.pathname, location.hash]);

  const signOut = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        setSession(null);
        setUser(null);
        setProfile(null);
        navigate('/login', { replace: true });
        showSuccess('Sesión cerrada correctamente.');
        return;
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        if (error.message !== "Auth session missing!") {
          console.error('Error signing out:', error);
          showError(`Error al cerrar sesión: ${error.message}`);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          navigate('/login', { replace: true });
          showSuccess('Sesión cerrada correctamente.');
        }
      }
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
      setSession(null);
      setUser(null);
      setProfile(null);
      navigate('/login', { replace: true });
      showSuccess('Sesión cerrada.');
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