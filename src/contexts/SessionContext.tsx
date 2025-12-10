"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
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

      setSession(currentSession);
      setUser(currentSession?.user || null);
      const currentPath = window.location.pathname;
      const isAuthPath = AUTH_PATHS.some(path => currentPath.startsWith(path));

      if (currentSession?.user) {
        const profileData = await fetchProfile(currentSession.user.id);
        
        if (!isMounted) return;

        if (profileData && !isAuthPath) {
          // Redirigir solo si NO estamos en una ruta de autenticación
          if (profileData.role === 'admin' && !currentPath.startsWith('/admin')) {
            navigate('/admin/dashboard', { replace: true });
          } else if (profileData.role === 'local' && !currentPath.startsWith('/local')) {
            navigate('/local/dashboard', { replace: true });
          } else if (profileData.role === 'client' && !currentPath.startsWith('/client') && currentPath !== '/') {
            navigate('/client', { replace: true });
          }
          if (!currentPath.includes(profileData.role) && currentPath !== '/' && !isAuthPath) {
             showSuccess(`Bienvenido, ${profileData?.first_name || currentSession.user.email}!`);
          }
        }
      } else {
        setProfile(null);
        // Redirigir al login solo si NO estamos ya en una ruta de autenticación
        if (!isAuthPath && currentPath !== '/') {
          navigate('/login', { replace: true });
        }
      }
      if (isMounted) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      handleSession(initialSession);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
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
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          handleSession(currentSession);
        } else if (event === 'USER_UPDATED') {
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
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

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