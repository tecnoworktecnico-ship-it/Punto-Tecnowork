import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import PointsRepairButton from '@/components/admin/PointsRepairButton';
import StorageCleaner from '@/components/admin/StorageCleaner';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, ShieldAlert } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

export default function MaintenancePage() { 
  const navigate = useNavigate();

  const handleExtendTime = () => { 
    // Instrucciones simples para el administrador 
    alert('PARA EXTENDER LA SESIÓN:\n\n1. Ve a tu proyecto en Supabase.\n2. Auth > Settings > Email.\n3. Cambia "Email Link Expiration" a 1800 (30 mins).'); 
    showSuccess('Instrucciones mostradas en pantalla.'); 
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <AppHeader title="Panel de Mantenimiento" />
      <main className="flex-grow p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Botón Volver */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/dashboard')} 
            className="gap-2 text-white hover:text-gray-200"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Dashboard
          </Button>
          
          <Card className="bg-white rounded-lg shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-text-carbon flex items-center gap-2">
                <ShieldAlert className="h-7 w-7 text-emphasis-red" />
                Herramientas de Mantenimiento Crítico
              </CardTitle>
              <CardDescription>
                Utiliza estas herramientas para asegurar la integridad de los datos y optimizar el almacenamiento.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* COLUMNA 1: Datos Críticos (Puntos y Economía) */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-5 h-5 text-primary-blue" />
                <h2 className="text-lg font-semibold text-text-carbon">Integridad de Datos</h2>
              </div>
              
              {/* Herramienta de Puntos */}
              <PointsRepairButton />
              
              {/* Espacio reservado para Ajuste de Precios en el futuro */}
              <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50 shadow-none">
                <CardContent className="flex items-center justify-center h-32 text-gray-400 text-sm">
                  Próximamente: Ajuste Global de Precios
                </CardContent>
              </Card>
            </div>
            
            {/* COLUMNA 2: Almacenamiento y Configuración */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-secondary-yellow" />
                <h2 className="text-lg font-semibold text-text-carbon">Sistema y Archivos</h2>
              </div>
              {/* Herramienta de Limpieza */}
              <StorageCleaner />
              
              {/* Configuración de Sesión */}
              <Card className="shadow-sm border-gray-200 bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-gray-800">Tiempos de Sesión</CardTitle>
                  <CardDescription>Control de expiración de enlaces de acceso.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4 text-sm text-blue-800 leading-relaxed">
                    La seguridad de Supabase controla la duración de los enlaces mágicos. El valor por defecto es corto por seguridad.
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-gray-700 hover:text-blue-600 hover:bg-blue-50 border-gray-300 h-auto min-h-[44px] py-2 px-4 whitespace-normal text-left leading-tight" 
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