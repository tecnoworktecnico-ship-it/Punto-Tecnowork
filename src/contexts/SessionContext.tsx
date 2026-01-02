"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

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

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoaded: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setIsRequestingPasswordReset: (value: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/', '/login', '/auth-callback', '/verification-error', '/reset-password', '/debug-recovery'];

const isRecoveryModeActive = () => {
  const expiration = localStorage.getItem('supabase_password_recovery_mode');
  if (!expiration) return false;
  const expirationTime = parseInt(expiration, 10);
  const isActive = Date.now() < expirationTime;
  if (!isActive) localStorage.removeItem('supabase_password_recovery_mode');
  return isActive;
};

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const isInitialized = useRef(false);
  const isSigningOut = useRef(false);
  const isRequestingReset = useRef(false);

  const setIsRequestingPasswordReset = (value: boolean) => {
    isRequestingReset.current = value;
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('SessionContext - Error fetching profile:', error);
        return null;
      }
      
      if (data) {
        setProfile(data as Profile);
        setProfileLoaded(true);
        return data as Profile;
      }
      return null;
    } catch (error) {
      console.error('SessionContext - Unexpected error fetching profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const handleNavigation = (currentProfile: Profile, currentPath: string) => {
    if (currentPath === '/reset-password' || currentPath === '/update-password') {
      console.log("SessionContext: Usuario en recuperación. Redirección cancelada.");
      return;
    }
    
    if (isRequestingReset.current) return;
    
    if (currentProfile.role === 'admin' && currentPath.startsWith('/admin')) return;
    if (currentProfile.role === 'local' && currentPath.startsWith('/local')) return;
    if (currentProfile.role === 'client' && currentPath.startsWith('/client')) return;

    if (currentProfile.role === 'admin') navigate('/admin/dashboard', { replace: true });
    else if (currentProfile.role === 'local') navigate('/local/dashboard', { replace: true });
    else if (currentProfile.role === 'client') navigate('/client', { replace: true });
  };

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;

      try {
        const isRecovery = isRecoveryModeActive() || 
                           window.location.hash.includes('type=recovery') ||
                           location.pathname === '/reset-password';

        // --- CORRECCIÓN FINAL (Según SOLUCION-FINAL-RECUPERACION.md) ---
        // Antes hacíamos 'return' aquí. AHORA NO.
        // Solo logueamos y dejamos que intente obtener la sesión.
        if (isRecovery) {
           console.log('SessionContext - Recovery mode detected (Checking session anyway)');
        }

        // Intentamos obtener la sesión SIEMPRE, incluso en modo recuperación.
        // Si el link funcionó, Supabase ya tendrá la sesión en memoria/localstorage.
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (initialSession) {
            console.log('SessionContext - Session found during init (User:', initialSession.user.email, ')');
            setSession(initialSession);
            setUser(initialSession.user);
            const userProfile = await fetchProfile(initialSession.user.id);
            
            // Redirigir SOLO si NO estamos en recuperación
            if (userProfile && (location.pathname === '/login' || location.pathname === '/')) {
               handleNavigation(userProfile, location.pathname);
            }
          } else {
            console.log('SessionContext - No session found during init');
            setLoading(false);
          }
          if (!initialSession) setProfileLoaded(true);
        }
      } catch (err) {
        console.error('SessionContext - Initialization error:', err);
        if (mounted) setLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      if (isSigningOut.current) return;

      console.log("Auth Event:", event);

      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY - Setting session for password reset');
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
        if (location.pathname !== '/reset-password') {
          navigate('/reset-password'); 
        }
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession) {
        if (!profile || profile.id !== currentSession.user.id) {
           const newProfile = await fetchProfile(currentSession.user.id);
           if (newProfile) {
             handleNavigation(newProfile, location.pathname);
           }
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setProfileLoaded(false);
        setUser(null);
        if (!PUBLIC_PATHS.includes(location.pathname)) {
            navigate('/login', { replace: true });
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  const signOut = async () => {
    try {
      isSigningOut.current = true;
      isInitialized.current = false;
      setLoading(true);
      
      setSession(null);
      setUser(null);
      setProfile(null);
      setProfileLoaded(false);
      
      await supabase.auth.signOut();
      
      showSuccess('Sesión cerrada correctamente.');
      navigate('/login', { replace: true });
      
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
    } finally {
      setLoading(false);
      setTimeout(() => { isSigningOut.current = false; }, 500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 text-primary-blue animate-spin mr-2" />
        <p className="text-primary-blue text-xl">Cargando autenticación...</p>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ session, user, profile, loading, profileLoaded, signOut, refreshProfile, setIsRequestingPasswordReset }}>
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