import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import PointsRepairButton from '@/components/admin/PointsRepairButton';
import StorageCleaner from '@/components/admin/StorageCleaner';
import GlobalPriceAdjuster from '@/components/admin/GlobalPriceAdjuster'; // Importar nuevo componente
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, ShieldAlert, Wrench, HardDrive } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

export default function MaintenancePage() {
  const navigate = useNavigate();

  const handleExtendTime = () => {
     // Instrucciones simples para el administrador
     alert('PARA EXTENDER LA SESIÓN:\n\n1. Ve a tu proyecto en Supabase.\n2. Auth > Settings > Email.\n3. Cambia "Email Link Expiration" a 1800 segundos (30 minutos).');
     showSuccess('Instrucciones mostradas en pantalla.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <AppHeader title="Mantenimiento del Sistema" />
      
      <main className="flex-grow p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Botón Volver */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLUMNA 1: Datos Críticos (Puntos y Economía) */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-700">Integridad de Datos</h2>
              </div>
              
              {/* Herramienta de Puntos */}
              <PointsRepairButton />
              
              {/* Herramienta de Ajuste de Precios */}
              <GlobalPriceAdjuster />
            </div>

            {/* COLUMNA 2: Almacenamiento y Configuración */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                <HardDrive className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-bold text-gray-700">Sistema y Archivos</h2>
              </div>

              {/* Herramienta de Limpieza */}
              <StorageCleaner />
              
              {/* Configuración de Sesión */}
              <Card className="shadow-sm border-gray-200 bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <CardTitle className="text-base text-gray-800">Tiempos de Sesión</CardTitle>
                  </div>
                  <CardDescription>Control de expiración de enlaces de acceso.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4 text-sm text-blue-800 leading-relaxed">
                    La seguridad de Supabase controla la duración de los enlaces mágicos. El valor por defecto es corto por seguridad.
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-gray-700 hover:text-blue-700 hover:bg-blue-50 h-auto py-2 whitespace-normal text-left" 
                    onClick={handleExtendTime}
                  >
                    Ver cómo extender a 30 minutos
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}