"use client";

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading, profile } = useSession();

  useEffect(() => {
    // 1. Check for errors in the hash (e.g., verification expired)
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const error = hashParams.get('error');
    const errorCode = hashParams.get('error_code');
    
    if (error && (errorCode === 'otp_expired' || error === 'access_denied')) {
      // Redirect to the dedicated error page
      navigate('/verification-error', { replace: true });
      return;
    }

    // 2. If session is loaded and valid, redirect based on role
    if (!loading && session && profile) {
      if (profile.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (profile.role === 'local') {
        navigate('/local/dashboard', { replace: true });
      } else {
        navigate('/client', { replace: true });
      }
      return;
    }
    
    // 3. If loading finishes and no session/profile is found (e.g., failed login/callback), go to login
    if (!loading && !session) {
      navigate('/login', { replace: true });
      return;
    }

    // Note: SessionContext handles the actual session parsing and profile fetching.
    // This component just waits for that process to complete and handles routing.
  }, [session, loading, profile, navigate, location.hash]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="flex items-center text-white text-xl">
        <Loader2 className="h-6 w-6 animate-spin mr-3" />
        Procesando autenticación...
      </div>
    </div>
  );
};

export default AuthCallback;