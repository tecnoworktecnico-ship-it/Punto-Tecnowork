"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface GlobalPrice {
  id: string;
  service_name: string;
  base_price: number;
  is_photo_print: boolean;
}

interface LocalPrice {
  id: string;
  local_id: string;
  service_name: string;
  price: number;
  created_at: string;
}

interface Local {
  id: string;
  name: string;
  can_edit_prices: boolean;
  has_photo_print: boolean;
}

const LocalPrices = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [localData, setLocalData] = useState<Local | null>(null);
  const [globalPrices, setGlobalPrices] = useState<GlobalPrice[]>([]);
  const [localPrices, setLocalPrices] = useState<LocalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<LocalPrice | null>(null);
  const [formData, setFormData] = useState({
    service_name: '',
    price: '',
  });

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'local') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/local/dashboard');
    }

    if (!sessionLoading && profile?.role === 'local') {
      fetchLocalData();
    }
  }, [sessionLoading, profile, navigate]);

  const fetchLocalData = async () => {
    setLoading(true);

    // Obtener datos del local
    const { data: local, error: localError } = await supabase
      .from('locals')
      .select('*')
      .eq('manager_id', profile?.id)
      .single();

    if (localError) {
      console.error('Error fetching local:', localError);
      showError('Error al cargar los datos del local.');
      setLoading(false);
      return;
    }

    if (!local.can_edit_prices) {
      showError('Tu local no tiene permisos para editar precios.');
      navigate('/local/dashboard');
      return;
    }

    setLocalData(local);

    // Obtener precios globales
    const { data: globalPricesData, error: globalError } = await supabase
      .from('global_prices')
      .select('*')
      .order('service_name', { ascending: true });

    if (globalError) {
      console.error('Error fetching global prices:', globalError);
      showError('Error al cargar los precios globales.');
    } else {
      // Filtrar precios de fotos si el local no tiene impresión de fotos
      const filteredPrices = local.has_photo_print 
        ? globalPricesData 
        : globalPricesData?.filter(p => !p.is_photo_print);
      setGlobalPrices(filteredPrices || []);
    }

    // Obtener precios locales personalizados
    const { data: localPricesData, error: localPricesError } = await supabase
      .from('local_prices')
      .select('*')
      .eq('local_id', local.id)
      .order('service_name', { ascending: true });

    if (localPricesError) {
      console.error('Error fetching local prices:', localPricesError);
      showError('Error al cargar los precios locales.');
    } else {
      setLocalPrices(localPricesData || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localData) return;

    setLoading(true);

    const priceData = {
      local_id: localData.id,
      service_name: formData.service_name,
      price: parseFloat(formData.price),
    };

    if (editingPrice) {
      const { error } = await supabase
        .from('local_prices')
        .update({ price: priceData.price })
        .eq('id', editingPrice.id);

      if (error) {
        console.error('Error updating price:', error);
        showError('Error al actualizar el precio.');
      } else {
        showSuccess('Precio actualizado correctamente.');
        setDialogOpen(false);
        setEditingPrice(null);
        resetForm();
        fetchLocalData();
      }
    } else {
      const { error } = await supabase
        .from('local_prices')
        .insert([priceData]);

      if (error) {
        console.error('Error creating price:', error);
        showError('Error al crear el precio personalizado.');
      } else {
        showSuccess('Precio personalizado creado correctamente.');
        setDialogOpen(false);
        resetForm();
        fetchLocalData();
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este precio personalizado? Se usará el precio global.')) return;

    setLoading(true);
    const { error } = await supabase
      .from('local_prices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting price:', error);
      showError('Error al eliminar el precio.');
    } else {
      showSuccess('Precio personalizado eliminado. Se usará el precio global.');
      fetchLocalData();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      service_name: '',
      price: '',
    });
  };

  const openEditDialog = (price: LocalPrice) => {
    setEditingPrice(price);
    setFormData({
      service_name: price.service_name,
      price: price.price.toString(),
    });
    setDialogOpen(true);
  };

  const openCreateDialog = (serviceName: string, basePrice: number) => {
    setEditingPrice(null);
    setFormData({
      service_name: serviceName,
      price: basePrice.toString(),
    });
    setDialogOpen(true);
  };

  const getLocalPrice = (serviceName: string) => {
    return localPrices.find(lp => lp.service_name === serviceName);
  };

  const getEffectivePrice = (serviceName: string, basePrice: number) => {
    const localPrice = getLocalPrice(serviceName);
    return localPrice ? localPrice.price : basePrice;
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando precios...</p>
      </div>
    );
  }

  if (profile?.role !== 'local' || !localData) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white rounded-lg shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/local/dashboard')}
                className="flex items-center gap-2 text-text-carbon hover:text-primary-blue"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver al Dashboard
              </Button>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon">
              Gestión de Precios - {localData.name}
            </CardTitle>
            <CardDescription>
              Personaliza los precios para tu local. Los servicios sin precio personalizado usarán el precio global.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {globalPrices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay servicios disponibles. Contacta al administrador.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Precio Global</TableHead>
                    <TableHead>Precio Local</TableHead>
                    <TableHead>Precio Efectivo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalPrices.map((globalPrice) => {
                    const localPrice = getLocalPrice(globalPrice.service_name);
                    const effectivePrice = getEffectivePrice(globalPrice.service_name, globalPrice.base_price);
                    
                    return (
                      <TableRow key={globalPrice.id}>
                        <TableCell className="font-medium">
                          {globalPrice.service_name}
                          {globalPrice.is_photo_print && (
                            <span className="ml-2 text-xs text-secondary-yellow">(Foto)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          ${globalPrice.base_price.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {localPrice ? (
                            <span className="text-primary-blue font-medium">
                              ${localPrice.price.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold">
                          ${effectivePrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {localPrice ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(localPrice)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(localPrice.id)}
                                  className="text-emphasis-red hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openCreateDialog(globalPrice.service_name, globalPrice.base_price)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Personalizar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingPrice ? 'Editar Precio Local' : 'Crear Precio Personalizado'}
              </DialogTitle>
              <DialogDescription>
                Define un precio específico para este servicio en tu local.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="service_name">Servicio</Label>
                <Input
                  id="service_name"
                  value={formData.service_name}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="price">Precio Local *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                  placeholder="Ej: 0.75"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingPrice(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-primary-blue hover:bg-blue-700 text-white"
                >
                  {editingPrice ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LocalPrices;