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
    console.log('SessionContext: useEffect mounted');

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContext: onAuthStateChange event:', event, 'session:', currentSession);
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);

        if (currentSession?.user) {
          console.log('SessionContext: User found, fetching profile...');
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (profileError) {
            console.error('SessionContext: Error fetching profile:', profileError);
            showError('Error al cargar el perfil del usuario.');
            setProfile(null);
            // If profile fetch fails for an authenticated user, redirect to login
            console.log('SessionContext: Navigating to /login due to profile error (onAuthStateChange)');
            navigate('/login', { replace: true });
          } else {
            console.log('SessionContext: Profile fetched:', profileData);
            setProfile(profileData);
            // Redirect based on role
            if (profileData?.role === 'admin') {
              console.log('SessionContext: Navigating to /admin/dashboard (onAuthStateChange)');
              navigate('/admin/dashboard', { replace: true });
            } else if (profileData?.role === 'local') {
              console.log('SessionContext: Navigating to /local/dashboard (onAuthStateChange)');
              navigate('/local/dashboard', { replace: true });
            } else if (profileData?.role === 'client') {
              console.log('SessionContext: Navigating to /client (onAuthStateChange)');
              navigate('/client', { replace: true });
            } else {
              // Fallback for unrecognized roles, redirect to client dashboard as a safe default
              console.log('SessionContext: Navigating to /client (onAuthStateChange, unknown role)');
              navigate('/client', { replace: true });
            }
            showSuccess(`Bienvenido, ${profileData?.first_name || currentSession.user.email}!`);
          }
        } else {
          console.log('SessionContext: No user in session, navigating to /login (onAuthStateChange)');
          setProfile(null);
          navigate('/login', { replace: true });
        }
      }
    );

    // Initial session check
    console.log('SessionContext: Performing initial getSession check...');
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('SessionContext: Initial getSession result:', initialSession);
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setLoading(false);
      if (initialSession?.user) {
        console.log('SessionContext: Initial session has user, fetching profile...');
        // Fetch profile for initial session
        supabase
          .from('profiles')
          .select('*')
          .eq('id', initialSession.user.id)
          .single()
          .then(({ data: profileData, error: profileError }) => {
            if (profileError) {
              console.error('SessionContext: Error fetching initial profile:', profileError);
              showError('Error al cargar el perfil inicial.');
              setProfile(null);
              console.log('SessionContext: Navigating to /login due to profile error (initial getSession)');
              navigate('/login', { replace: true });
            } else {
              console.log('SessionContext: Initial profile fetched:', profileData);
              setProfile(profileData);
              // Redirect based on role for initial session
              if (profileData?.role === 'admin') {
                console.log('SessionContext: Navigating to /admin/dashboard (initial getSession)');
                navigate('/admin/dashboard', { replace: true });
              } else if (profileData?.role === 'local') {
                console.log('SessionContext: Navigating to /local/dashboard (initial getSession)');
                navigate('/local/dashboard', { replace: true });
              } else if (profileData?.role === 'client') {
                console.log('SessionContext: Navigating to /client (initial getSession)');
                navigate('/client', { replace: true });
              } else {
                // Fallback for unrecognized roles, redirect to client dashboard as a safe default
                console.log('SessionContext: Navigating to /client (initial getSession, unknown role)');
                navigate('/client', { replace: true });
              }
            }
          });
      } else {
        console.log('SessionContext: No user in initial session, navigating to /login');
        navigate('/login', { replace: true });
      }
    });

    return () => {
      console.log('SessionContext: useEffect unmounted, unsubscribing auth listener.');
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const signOut = async () => {
    console.log('SessionContext: Signing out...');
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('SessionContext: Error signing out:', error);
      showError('Error al cerrar sesión.');
    } else {
      showSuccess('Sesión cerrada correctamente.');
      setSession(null);
      setUser(null);
      setProfile(null);
      console.log('SessionContext: Navigating to /login after signOut');
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