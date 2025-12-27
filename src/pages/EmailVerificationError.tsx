"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

const EmailVerificationError = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorType, setErrorType] = useState<string>('');
  const [errorDescription, setErrorDescription] = useState<string>('');

  useEffect(() => {
    // Extraer parámetros de error del hash de la URL
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const error = hashParams.get('error');
    const errorCode = hashParams.get('error_code');
    const errorDesc = hashParams.get('error_description');

    if (error) {
      setErrorType(errorCode || error);
      setErrorDescription(errorDesc || 'Ha ocurrido un error durante la verificación del correo electrónico.');
    }

    // Intentar obtener el email del localStorage si se guardó previamente
    const storedEmail = localStorage.getItem('verificationEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, [location]);

  const handleResendVerification = async () => {
    if (!email) {
      showError('Por favor, ingresa tu correo electrónico para reenviar la verificación.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        console.error('Error resending verification:', error);
        showError(`Error al reenviar la verificación: ${error.message}`);
      } else {
        showSuccess('Se ha enviado un nuevo enlace de verificación a tu correo electrónico.');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      showError('Error inesperado al reenviar la verificación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <Card className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-center mb-4 text-emphasis-red">
            <AlertTriangle className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-bold text-text-carbon text-center">
            Error de Verificación
          </CardTitle>
          <CardDescription className="text-center">
            {errorType === 'otp_expired' 
              ? 'El enlace de verificación ha expirado o es inválido.' 
              : errorDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800">
            <p>
              Los enlaces de verificación tienen un tiempo de validez limitado por razones de seguridad.
              Por favor, solicita un nuevo enlace de verificación o intenta iniciar sesión nuevamente.
            </p>
          </div>

          <div className="flex flex-col space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu correo electrónico"
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
            <Button
              onClick={handleResendVerification}
              disabled={loading || !email}
              className="w-full bg-primary-blue hover:bg-blue-700 text-white flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Reenviar Verificación
                </>
              )}
            </Button>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-text-carbon hover:text-primary-blue"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Iniciar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerificationError;