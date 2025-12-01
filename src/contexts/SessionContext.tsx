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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);

        if (currentSession?.user) {
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            showError('Error al cargar el perfil del usuario.');
            setProfile(null);
            // If profile fetch fails for an authenticated user, redirect to login
            navigate('/login', { replace: true });
          } else {
            setProfile(profileData);
            // Redirect based on role
            if (profileData?.role === 'admin') {
              navigate('/admin/dashboard', { replace: true });
            } else if (profileData?.role === 'local') {
              navigate('/local/dashboard', { replace: true });
            } else if (profileData?.role === 'client') {
              navigate('/client', { replace: true });
            } else {
              // Fallback for unrecognized roles, redirect to client dashboard as a safe default
              navigate('/client', { replace: true });
            }
            showSuccess(`Bienvenido, ${profileData?.first_name || currentSession.user.email}!`);
          }
        } else {
          setProfile(null);
          navigate('/login', { replace: true });
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setLoading(false);
      if (initialSession?.user) {
        // Fetch profile for initial session
        supabase
          .from('profiles')
          .select('*')
          .eq('id', initialSession.user.id)
          .single()
          .then(({ data: profileData, error: profileError }) => {
            if (profileError) {
              console.error('Error fetching initial profile:', profileError);
              showError('Error al cargar el perfil inicial.');
              setProfile(null);
              navigate('/login', { replace: true });
            } else {
              setProfile(profileData);
              // Redirect based on role for initial session
              if (profileData?.role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
              } else if (profileData?.role === 'local') {
                navigate('/local/dashboard', { replace: true });
              } else if (profileData?.role === 'client') {
                navigate('/client', { replace: true });
              } else {
                // Fallback for unrecognized roles, redirect to client dashboard as a safe default
                navigate('/client', { replace: true });
              }
            }
          });
      } else {
        navigate('/login', { replace: true });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      showError('Error al cerrar sesión.');
    } else {
      showSuccess('Sesión cerrada correctamente.');
      setSession(null);
      setUser(null);
      setProfile(null);
      navigate('/login', { replace: true });
    }
    setLoading(false);
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