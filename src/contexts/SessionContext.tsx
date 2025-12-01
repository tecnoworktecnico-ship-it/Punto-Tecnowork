"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: any | null; // You might want to define a more specific type for profile
  loading: boolean;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true); // Iniciar loading como true
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true; // Para prevenir actualizaciones de estado en componentes desmontados

    const handleSession = async (currentSession: Session | null) => {
      if (!isMounted) return;

      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();

        if (!isMounted) return;

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          showError('Error al cargar el perfil del usuario.');
          setProfile(null);
          // Si falla la obtención del perfil para un usuario autenticado, redirigir al login
          navigate('/login', { replace: true });
        } else {
          setProfile(profileData);
          // Redirigir según el rol, solo si no está ya en la ruta correcta
          const currentPath = window.location.pathname;
          if (profileData?.role === 'admin' && !currentPath.startsWith('/admin')) {
            navigate('/admin/dashboard', { replace: true });
          } else if (profileData?.role === 'local' && !currentPath.startsWith('/local')) {
            navigate('/local/dashboard', { replace: true });
          } else if (profileData?.role === 'client' && !currentPath.startsWith('/client') && currentPath !== '/') {
            navigate('/client', { replace: true });
          }
          // Mostrar toast de éxito solo si no está ya en el dashboard correcto
          if (!currentPath.includes(profileData?.role) && currentPath !== '/') { // Simplificado
             showSuccess(`Bienvenido, ${profileData?.first_name || currentSession.user.email}!`);
          }
        }
      } else {
        setProfile(null);
        // Solo navegar a /login si la ruta actual no es ya /login o /
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/') {
          navigate('/login', { replace: true });
        }
      }
      if (isMounted) setLoading(false); // Establecer loading a false después de todas las comprobaciones
    };

    // Comprobación de sesión inicial
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      handleSession(initialSession);
    });

    // Escuchar cambios en el estado de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false); // Asegurar que loading sea false al cerrar sesión
            navigate('/login', { replace: true });
            showSuccess('Sesión cerrada correctamente.');
          }
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          handleSession(currentSession);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]); // `navigate` es estable, por lo que está bien como dependencia.

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      showError('Error al cerrar sesión.');
    } else {
      // El estado será limpiado por el evento 'SIGNED_OUT' de onAuthStateChange
      // El toast de éxito y la navegación ya se manejan en el listener
    }
    // Asegurar que loading sea false después del intento de cierre de sesión
    // (el listener ya lo maneja para SIGNED_OUT, pero esto cubre otros casos si los hubiera)
    if (isMounted) setLoading(false); 
  };

  return (
    <SessionContext.Provider value={{ session, user, profile, loading, signOut }}>
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