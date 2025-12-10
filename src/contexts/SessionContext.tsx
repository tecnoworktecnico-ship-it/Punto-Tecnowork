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
        showError('Error al cargar el perfil del usuario.');
        setProfile(null);
        return null;
      }
      
      setProfile(profileData);
      return profileData;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      showError('Error inesperado al cargar el perfil.');
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
        // Si estamos en una ruta de autenticación, no redirigir aquí.
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

      console.log('SessionContext - handleSession called', { 
        hasSession: !!currentSession, 
        currentPath: location.pathname 
      });

      setSession(currentSession);
      setUser(currentSession?.user || null);
      const currentPath = location.pathname;
      const isAuthPath = AUTH_PATHS.some(path => currentPath.startsWith(path));

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
          
          // Redirigir solo si NO estamos en una ruta de autenticación
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
        } else if (event === 'SIGNED_IN') {
          console.log('SessionContext - User signed in, handling session');
          handleSession(currentSession);
        } else if (event === 'INITIAL_SESSION') {
          console.log('SessionContext - Initial session event');
          handleSession(currentSession);
        } else if (event === 'USER_UPDATED') {
          console.log('SessionContext - User updated');
          // Cuando el usuario se actualiza, también actualizamos el perfil
          setSession(currentSession);
          setUser(currentSession?.user || null);
          if (currentSession?.user) {
            await fetchProfile(currentSession.user.id);
          }
          if (isMounted) setLoading(false);
        }
      }
    );

    return () => {
      console.log('SessionContext - Cleanup');
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  const signOut = async () => {
    try {
      // Verificar si hay una sesión activa antes de intentar cerrarla
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        // Si no hay sesión, simplemente limpiar el estado y redirigir
        setSession(null);
        setUser(null);
        setProfile(null);
        navigate('/login', { replace: true });
        showSuccess('Sesión cerrada correctamente.');
        return;
      }
      
      // Si hay sesión, proceder con el cierre normal
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        // Si hay un error específico que no sea "Auth session missing"
        if (error.message !== "Auth session missing!") {
          console.error('Error signing out:', error);
          showError(`Error al cerrar sesión: ${error.message}`);
        } else {
          // Si el error es "Auth session missing", manejar como si fuera exitoso
          setSession(null);
          setUser(null);
          setProfile(null);
          navigate('/login', { replace: true });
          showSuccess('Sesión cerrada correctamente.');
        }
      }
      // Si no hay error, el listener onAuthStateChange manejará la redirección
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
      
      // En caso de error, forzar el cierre de sesión de todas formas
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