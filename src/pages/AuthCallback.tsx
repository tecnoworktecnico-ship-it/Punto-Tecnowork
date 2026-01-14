"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'creating' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Procesando autenticación...');
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      try {
        console.log('AuthCallback - Starting...');
        
        // 1. Obtener la sesión actual (Supabase ya procesó el OAuth)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthCallback - Session error:', sessionError);
          showError('Error al procesar la autenticación');
          navigate('/login', { replace: true });
          return;
        }

        if (!session) {
          console.log('AuthCallback - No session found');
          navigate('/login', { replace: true });
          return;
        }

        console.log('AuthCallback - Session found for:', session.user.email);

        // 2. Buscar si el usuario ya tiene perfil
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) {
          // CRÍTICO: Si hay un error al buscar el perfil (ej. error de RLS, error de servidor),
          // asumimos un fallo de conexión/servidor y abortamos la creación.
          console.error('AuthCallback - CRITICAL Profile fetch error:', profileError);
          setStatus('error');
          setMessage('Error de conexión con el servidor.');
          showError('Error de conexión con el servidor. Intenta iniciar sesión de nuevo.');
          await supabase.auth.signOut();
          setTimeout(() => navigate('/login', { replace: true }), 3000);
          return;
        }

        let userProfile = existingProfile;

        // 3. Si no tiene perfil, crear uno nuevo como "client"
        if (!existingProfile) {
          console.log('AuthCallback - Creating new profile for:', session.user.email);
          setStatus('creating');
          setMessage('Creando tu cuenta...');

          // Extraer nombre del usuario de Google
          const userMetadata = session.user.user_metadata;
          const fullName = userMetadata?.full_name || userMetadata?.name || '';
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              first_name: firstName,
              last_name: lastName,
              role: 'client',  // Siempre "client" para auto-registro
              avatar_url: userMetadata?.avatar_url || userMetadata?.picture || null,
              phone_number: null,
              password_changed: true,  // No aplica para OAuth
              points: 0,
              local_id: null,
              email: session.user.email, // Asegurar que el email se guarde en profiles
            })
            .select()
            .single();

          if (createError) {
            console.error('AuthCallback - Create profile error:', createError);
            showError('Error al crear tu cuenta. Contacta al administrador.');
            await supabase.auth.signOut();
            navigate('/login', { replace: true });
            return;
          }

          userProfile = newProfile;
          console.log('AuthCallback - Profile created successfully');
          showSuccess('¡Bienvenido! Tu cuenta ha sido creada.');
        }

        // 4. Redirigir según el rol
        setStatus('success');
        setMessage('¡Listo! Redirigiendo...');

        console.log('AuthCallback - Redirecting based on role:', userProfile?.role);

        setTimeout(() => {
          if (userProfile?.role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else if (userProfile?.role === 'local') {
            navigate('/local/dashboard', { replace: true });
          } else {
            navigate('/client', { replace: true });
          }
        }, 500);

      } catch (error) {
        console.error('AuthCallback - Unexpected error:', error);
        setStatus('error');
        setMessage('Error inesperado');
        showError('Error inesperado. Intenta de nuevo.');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600">
      <div className="flex flex-col items-center text-white text-xl space-y-4">
        {status === 'success' ? (
          <CheckCircle className="h-8 w-8 text-green-400" />
        ) : (
          <Loader2 className="h-8 w-8 animate-spin" />
        )}
        <span>{message}</span>
      </div>
    </div>
  );
};

export default AuthCallback;