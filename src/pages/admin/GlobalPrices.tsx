"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  created_at: string;
}

const GlobalPrices = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [prices, setPrices] = useState<GlobalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<GlobalPrice | null>(null);
  const [formData, setFormData] = useState({
    service_name: '',
    base_price: '',
    is_photo_print: false,
  });

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'admin') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/admin/dashboard');
    }

    if (!sessionLoading && profile?.role === 'admin') {
      fetchPrices();
    }
  }, [sessionLoading, profile, navigate]);

  const fetchPrices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('global_prices')
      .select('*')
      .order('service_name', { ascending: true });

    if (error) {
      console.error('Error fetching global prices:', error);
      showError('Error al cargar los precios globales.');
    } else {
      setPrices(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.service_name.trim()) {
      showError('El nombre del servicio es obligatorio.');
      return;
    }
    
    const parsedPrice = parseFloat(formData.base_price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      showError('El precio base debe ser un número válido mayor o igual a 0.');
      return;
    }
    
    setLoading(true);

    const priceData = {
      service_name: formData.service_name.trim(),
      base_price: parsedPrice,
      is_photo_print: formData.is_photo_print,
    };

    console.log('Intentando guardar precio:', priceData);
    console.log('Usuario actual:', profile?.id, 'Rol:', profile?.role);

    try {
      if (editingPrice) {
        const { data, error } = await supabase
          .from('global_prices')
          .update(priceData)
          .eq('id', editingPrice.id)
          .select();

        console.log('Resultado de actualización:', { data, error });

        if (error) {
          console.error('Error updating price:', error);
          showError(`Error al actualizar el precio: ${error.message}`);
        } else {
          showSuccess('Precio actualizado correctamente.');
          setDialogOpen(false);
          setEditingPrice(null);
          resetForm();
          fetchPrices();
        }
      } else {
        const { data, error } = await supabase
          .from('global_prices')
          .insert([priceData])
          .select();

        console.log('Resultado de inserción:', { data, error });

        if (error) {
          console.error('Error creating price:', error);
          showError(`Error al crear el precio: ${error.message}`);
        } else {
          showSuccess('Precio creado correctamente.');
          setDialogOpen(false);
          resetForm();
          fetchPrices();
        }
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      showError('Error inesperado al guardar el precio.');
    }
    
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este precio?')) return;

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('global_prices')
        .delete()
        .eq('id', id);

      console.log('Resultado de eliminación:', { error });

      if (error) {
        console.error('Error deleting price:', error);
        showError(`Error al eliminar el precio: ${error.message}`);
      } else {
        showSuccess('Precio eliminado correctamente.');
        fetchPrices();
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      showError('Error inesperado al eliminar el precio.');
    }
    
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      service_name: '',
      base_price: '',
      is_photo_print: false,
    });
  };

  const openEditDialog = (price: GlobalPrice) => {
    setEditingPrice(price);
    setFormData({
      service_name: price.service_name,
      base_price: price.base_price.toString(),
      is_photo_print: price.is_photo_print,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingPrice(null);
    resetForm();
    setDialogOpen(true);
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando precios...</p>
      </div>
    );
  }

  if (profile?.role !== 'admin') {
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
                onClick={() => navigate('/admin/dashboard')}
                className="flex items-center gap-2 text-text-carbon hover:text-primary-blue"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver al Dashboard
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={openCreateDialog}
                    className="bg-primary-blue hover:bg-blue-700 text-white flex items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Nuevo Precio
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPrice ? 'Editar Precio' : 'Crear Nuevo Precio'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingPrice
                        ? 'Modifica los datos del precio global.'
                        : 'Completa los datos para crear un nuevo precio global.'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="service_name">Nombre del Servicio *</Label>
                      <Input
                        id="service_name"
                        value={formData.service_name}
                        onChange={(e) =>
                          setFormData({ ...formData, service_name: e.target.value })
                        }
                        required
                        placeholder="Ej: Impresión B/N A4"
                      />
                    </div>
                    <div>
                      <Label htmlFor="base_price">Precio Base *</Label>
                      <Input
                        id="base_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.base_price}
                        onChange={(e) =>
                          setFormData({ ...formData, base_price: e.target.value })
                        }
                        required
                        placeholder="Ej: 0.50"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_photo_print">
                        ¿Es impresión de fotos?
                      </Label>
                      <Switch
                        id="is_photo_print"
                        checked={formData.is_photo_print}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, is_photo_print: checked })
                        }
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
                        disabled={loading}
                        className="bg-primary-blue hover:bg-blue-700 text-white"
                      >
                        {loading ? 'Guardando...' : (editingPrice ? 'Actualizar' : 'Crear')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon">
              Gestión de Precios Globales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay precios registrados. Crea uno nuevo para comenzar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Precio Base</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices.map((price) => (
                    <TableRow key={price.id}>
                      <TableCell className="font-medium">
                        {price.service_name}
                      </TableCell>
                      <TableCell>${price.base_price.toFixed(2)}</TableCell>
                      <TableCell>
                        {price.is_photo_print ? (
                          <span className="text-secondary-yellow font-medium">
                            Foto
                          </span>
                        ) : (
                          <span className="text-gray-500">Documento</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(price)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(price.id)}
                            className="text-emphasis-red hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GlobalPrices;