"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { Percent, Loader2, DollarSign, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GlobalPrice {
  id: string;
  service_name: string;
  base_price: number;
  is_photo_print: boolean;
}

const GlobalPriceAdjuster: React.FC = () => {
  const [percentage, setPercentage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAdjustPrices = async () => {
    const percentValue = parseFloat(percentage);

    if (isNaN(percentValue) || percentValue === 0) {
      showError('Por favor, ingresa un porcentaje válido (ej: 10 o -5).');
      return;
    }

    setLoading(true);
    setDialogOpen(false);

    try {
      // 1. Obtener todos los precios globales
      // Seleccionamos todos los campos para el upsert
      const { data: prices, error: fetchError } = await supabase
        .from('global_prices')
        .select('*');

      if (fetchError) {
        throw new Error(`Error al obtener precios: ${fetchError.message}`);
      }

      if (!prices || prices.length === 0) {
        showError('No se encontraron precios globales para actualizar.');
        return;
      }

      // 2. Calcular los nuevos precios y aplicar redondeo
      const multiplier = 1 + percentValue / 100;
      
      const updates = prices.map((price: GlobalPrice) => {
        const newPrice = price.base_price * multiplier;
        // Redondeo a 2 decimales
        const roundedPrice = Math.round(newPrice * 100) / 100; 
        
        return {
          ...price, // Incluir todos los campos originales
          base_price: roundedPrice,
        };
      });
      
      // 3. Guardar los nuevos precios usando upsert
      const { error: updateError } = await supabase
        .from('global_prices')
        .upsert(updates, { onConflict: 'id' });

      if (updateError) {
        throw new Error(`Error al guardar precios: ${updateError.message}`);
      }

      showSuccess(`¡Precios actualizados! Se ajustaron ${updates.length} servicios en un ${percentValue}%.`);
      setPercentage('');
    } catch (error) {
      console.error('Error adjusting prices:', error);
      showError(error instanceof Error ? error.message : 'Error inesperado al ajustar precios.');
    } finally {
      setLoading(false);
    }
  };

  const percentValue = parseFloat(percentage);
  const isIncrease = percentValue > 0;
  const actionText = isIncrease ? 'Aumentar' : (percentValue < 0 ? 'Disminuir' : 'Ajustar');
  const actionColor = isIncrease ? 'bg-success-green hover:bg-green-700' : (percentValue < 0 ? 'bg-emphasis-red hover:bg-red-700' : 'bg-primary-blue hover:bg-blue-700');

  return (
    <Card className="shadow-md bg-white">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {/* Icono Percent añadido aquí */}
          <div className="p-2 bg-green-100 rounded-lg text-success-green"><Percent className="w-6 h-6" /></div>
          <div>
            <CardTitle className="text-lg font-bold text-gray-800">Ajuste Masivo de Precios</CardTitle>
            <CardDescription>Aplica un porcentaje de cambio a todos los precios globales.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="percentage" className="text-sm font-medium text-gray-700">
            Porcentaje de Ajuste (Ej: 10 o -5)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="percentage"
              type="number"
              step="0.1"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              placeholder="Ej: 5.5"
              className="w-full"
              disabled={loading}
            />
            <Percent className="h-5 w-5 text-gray-500" />
          </div>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button 
              className={`w-full ${actionColor} text-white`} 
              // Deshabilitar si está cargando, si no es un número, o si es 0
              disabled={loading || isNaN(percentValue) || percentValue === 0}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : `${actionText} Precios Globales`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-emphasis-red">
                <AlertTriangle className="h-6 w-6" />
                Confirmar Ajuste Masivo
              </AlertDialogTitle>
              <AlertDialogDescription>
                Estás a punto de <strong>{actionText.toLowerCase()}</strong> todos los precios globales en un 
                <span className={`font-bold mx-1 ${isIncrease ? 'text-success-green' : 'text-emphasis-red'}`}>
                  {Math.abs(percentValue)}%
                </span>. 
                Esta acción afectará a todos los locales que usen precios globales. ¿Deseas continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleAdjustPrices} 
                disabled={loading}
                className={actionColor}
              >
                {loading ? 'Procesando...' : `Sí, ${actionText} Precios`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default GlobalPriceAdjuster;