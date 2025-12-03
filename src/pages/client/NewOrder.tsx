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
import { ArrowLeft, Upload, Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Local {
  id: string;
  name: string;
  address: string | null;
  has_photo_print: boolean;
}

interface Price {
  service_name: string;
  price: number;
  is_photo_print: boolean;
}

interface OrderFile {
  file: File;
  service_name: string;
  copies: number;
  color_mode: string;
  size: string;
  price_per_copy: number;
}

const NewOrder = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [locals, setLocals] = useState<Local[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<string>('');
  const [prices, setPrices] = useState<Price[]>([]);
  const [orderFiles, setOrderFiles] = useState<OrderFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'client') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/client');
    }

    if (!sessionLoading && profile?.role === 'client') {
      fetchLocals();
    }
  }, [sessionLoading, profile, navigate]);

  const fetchLocals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('locals')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching locals:', error);
      showError('Error al cargar los locales.');
    } else {
      setLocals(data || []);
    }
    setLoading(false);
  };

  const fetchPrices = async (localId: string) => {
    setLoading(true);

    // Obtener precios locales personalizados
    const { data: localPrices, error: localError } = await supabase
      .from('local_prices')
      .select('service_name, price')
      .eq('local_id', localId);

    // Obtener precios globales
    const { data: globalPrices, error: globalError } = await supabase
      .from('global_prices')
      .select('service_name, base_price, is_photo_print');

    if (globalError) {
      console.error('Error fetching prices:', globalError);
      showError('Error al cargar los precios.');
      setLoading(false);
      return;
    }

    // Combinar precios: usar local si existe, sino global
    const local = locals.find(l => l.id === localId);
    const filteredGlobalPrices = local?.has_photo_print 
      ? globalPrices 
      : globalPrices?.filter(p => !p.is_photo_print);

    const combinedPrices = filteredGlobalPrices?.map(gp => {
      const localPrice = localPrices?.find(lp => lp.service_name === gp.service_name);
      return {
        service_name: gp.service_name,
        price: localPrice ? localPrice.price : gp.base_price,
        is_photo_print: gp.is_photo_print,
      };
    }) || [];

    setPrices(combinedPrices);
    setLoading(false);
  };

  const handleLocalChange = (localId: string) => {
    setSelectedLocal(localId);
    setOrderFiles([]);
    fetchPrices(localId);
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: OrderFile[] = Array.from(files).map(file => ({
      file,
      service_name: prices[0]?.service_name || '',
      copies: 1,
      color_mode: 'color',
      size: 'A4',
      price_per_copy: prices[0]?.price || 0,
    }));

    setOrderFiles([...orderFiles, ...newFiles]);
  };

  const handleFileUpdate = (index: number, field: string, value: any) => {
    const updated = [...orderFiles];
    updated[index] = { ...updated[index], [field]: value };

    // Si cambia el servicio, actualizar el precio
    if (field === 'service_name') {
      const price = prices.find(p => p.service_name === value);
      if (price) {
        updated[index].price_per_copy = price.price;
      }
    }

    setOrderFiles(updated);
  };

  const handleFileRemove = (index: number) => {
    setOrderFiles(orderFiles.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderFiles.reduce((total, file) => {
      return total + (file.price_per_copy * file.copies);
    }, 0);
  };

  const calculatePoints = (total: number) => {
    return Math.floor(total * 10); // 10 puntos por cada dólar
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLocal) {
      showError('Por favor selecciona un local.');
      return;
    }

    if (orderFiles.length === 0) {
      showError('Por favor agrega al menos un archivo.');
      return;
    }

    setLoading(true);

    try {
      const total = calculateTotal();
      const points = calculatePoints(total);

      // Crear el pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: profile?.id,
          local_id: selectedLocal,
          status: 'pending',
          total_price: total,
          points_earned: points,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        showError('Error al crear el pedido.');
        setLoading(false);
        return;
      }

      // Subir archivos y crear registros de order_files
      for (const orderFile of orderFiles) {
        const fileName = `${order.id}/${Date.now()}_${orderFile.file.name}`;
        
        // Subir archivo a Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('order-files')
          .upload(fileName, orderFile.file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          continue;
        }

        // Crear registro en order_files
        await supabase.from('order_files').insert({
          order_id: order.id,
          file_path: fileName,
          file_name: orderFile.file.name,
          file_type: orderFile.file.type,
          copies: orderFile.copies,
          color_mode: orderFile.color_mode,
          size: orderFile.size,
          price_per_copy: orderFile.price_per_copy,
        });
      }

      // Actualizar puntos del usuario
      const { data: userPoints } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', profile?.id)
        .single();

      if (userPoints) {
        await supabase
          .from('user_points')
          .update({ points: userPoints.points + points })
          .eq('user_id', profile?.id);
      } else {
        await supabase
          .from('user_points')
          .insert({ user_id: profile?.id, points });
      }

      // Registrar en auditoría
      await supabase.from('order_audit').insert({
        order_id: order.id,
        user_id: profile?.id,
        action: 'created',
        details: { total_price: total, points_earned: points }
      });

      showSuccess('Pedido creado correctamente. ¡Has ganado ' + points + ' puntos!');
      navigate('/client/orders');
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al crear el pedido.');
    }

    setLoading(false);
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    );
  }

  if (profile?.role !== 'client') {
    return null;
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white rounded-lg shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/client')}
                className="flex items-center gap-2 text-text-carbon hover:text-primary-blue"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver al Dashboard
              </Button>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon">
              Crear Nuevo Pedido
            </CardTitle>
            <CardDescription>
              Selecciona un local, sube tus archivos y configura tu pedido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selección de Local */}
              <div>
                <Label htmlFor="local">Local *</Label>
                <Select value={selectedLocal} onValueChange={handleLocalChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locals.map(local => (
                      <SelectItem key={local.id} value={local.id}>
                        {local.name} {local.address && `- ${local.address}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subir Archivos */}
              {selectedLocal && (
                <div>
                  <Label htmlFor="files">Archivos *</Label>
                  <div className="mt-2">
                    <Input
                      id="files"
                      type="file"
                      multiple
                      onChange={handleFileAdd}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Formatos aceptados: PDF, DOC, DOCX, JPG, PNG
                    </p>
                  </div>
                </div>
              )}

              {/* Lista de Archivos */}
              {orderFiles.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-text-carbon">
                    Archivos del Pedido
                  </h3>
                  {orderFiles.map((file, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate flex-1">
                            {file.file.name}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFileRemove(index)}
                            className="text-emphasis-red hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Servicio</Label>
                            <Select
                              value={file.service_name}
                              onValueChange={(value) =>
                                handleFileUpdate(index, 'service_name', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {prices.map(price => (
                                  <SelectItem key={price.service_name} value={price.service_name}>
                                    {price.service_name} - ${price.price.toFixed(2)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Copias</Label>
                            <Input
                              type="number"
                              min="1"
                              value={file.copies}
                              onChange={(e) =>
                                handleFileUpdate(index, 'copies', parseInt(e.target.value))
                              }
                            />
                          </div>

                          <div>
                            <Label>Color</Label>
                            <Select
                              value={file.color_mode}
                              onValueChange={(value) =>
                                handleFileUpdate(index, 'color_mode', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="color">Color</SelectItem>
                                <SelectItem value="bw">Blanco y Negro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Tamaño</Label>
                            <Select
                              value={file.size}
                              onValueChange={(value) =>
                                handleFileUpdate(index, 'size', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A4">A4</SelectItem>
                                <SelectItem value="A3">A3</SelectItem>
                                <SelectItem value="Letter">Letter</SelectItem>
                                <SelectItem value="Legal">Legal</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm text-gray-600">
                            Precio por copia: ${file.price_per_copy.toFixed(2)}
                          </span>
                          <span className="font-bold text-primary-blue">
                            Subtotal: ${(file.price_per_copy * file.copies).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Resumen del Pedido */}
              {orderFiles.length > 0 && (
                <Card className="bg-gray-50 p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-primary-blue">
                        ${calculateTotal().toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Puntos a ganar:</span>
                      <span className="text-secondary-yellow font-medium">
                        {calculatePoints(calculateTotal())} puntos
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Botón de Envío */}
              <Button
                type="submit"
                disabled={loading || !selectedLocal || orderFiles.length === 0}
                className="w-full bg-primary-blue hover:bg-blue-700 text-white font-bold py-3"
              >
                {loading ? 'Creando Pedido...' : 'Crear Pedido'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewOrder;