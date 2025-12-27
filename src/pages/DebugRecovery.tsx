"use client";

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DebugRecovery = () => {
  const location = useLocation();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const fullUrl = window.location.href;
    const hash = location.hash;
    const hashParams = new URLSearchParams(hash.substring(1));
    
    const info = {
      fullUrl,
      pathname: location.pathname,
      hash,
      hashParams: {
        access_token: hashParams.get('access_token') ? 'EXISTS (length: ' + hashParams.get('access_token')?.length + ')' : 'MISSING',
        refresh_token: hashParams.get('refresh_token') ? 'EXISTS' : 'MISSING',
        type: hashParams.get('type') || 'MISSING',
        error: hashParams.get('error') || 'NONE',
        error_code: hashParams.get('error_code') || 'NONE',
      },
      allHashParams: Array.from(hashParams.entries()),
    };
    
    setDebugInfo(info);
    console.log('Debug Recovery Info:', info);
  }, [location]);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white rounded-lg shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-text-carbon">
              Debug: Información de Recuperación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2">URL Completa:</h3>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {debugInfo.fullUrl}
                </pre>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2">Pathname:</h3>
                <pre className="bg-gray-100 p-3 rounded text-xs">
                  {debugInfo.pathname}
                </pre>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2">Hash:</h3>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {debugInfo.hash}
                </pre>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2">Parámetros del Hash:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm">
                  {JSON.stringify(debugInfo.hashParams, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2">Todos los Parámetros:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm">
                  {JSON.stringify(debugInfo.allHashParams, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugRecovery;