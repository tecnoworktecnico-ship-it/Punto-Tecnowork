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
import { ArrowLeft, Upload, Trash2, Store, DollarSign, Info, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocalPricesById } from '@/hooks/useLocalPrices';
import PriceList from '@/components/PriceList';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface Local {
  id: string;
  name: string;
  address: string | null;
  has_photo_print: boolean;
  can_edit_prices: boolean;
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
  const [orderFiles, setOrderFiles] = useState<OrderFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Usar el hook para obtener precios del local seleccionado
  const { 
    prices, 
    localInfo, 
    loading: loadingPrices 
  } = useLocalPricesById(selectedLocal || null);

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
      .select('id, name, address, has_photo_print, can_edit_prices')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching locals:', error);
      showError('Error al cargar los locales.');
    } else {
      setLocals(data || []);
    }
    setLoading(false);
  };

  const handleLocalChange = (localId: string) => {
    setSelectedLocal(localId);
    setOrderFiles([]); // Limpiar archivos al cambiar de local
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (prices.length === 0) {
      showError('No hay servicios disponibles en este local.');
      return;
    }

    const defaultService = prices[0];

    const newFiles: OrderFile[] = Array.from(files).map(file => ({
      file,
      service_name: defaultService.service_name,
      copies: 1,
      color_mode: 'color',
      size: 'A4',
      price_per_copy: defaultService.price,
    }));

    setOrderFiles([...orderFiles, ...newFiles]);
    
    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = '';
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

    setSubmitting(true);
    setUploadProgress('Creando pedido...');

    try {
      const total = calculateTotal();
      const points = calculatePoints(total);

      console.log('Creando pedido:', { client_id: profile?.id, local_id: selectedLocal, total, points });

      // Crear el pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: profile?.id,
          local_id: selectedLocal,
          status: 'pending', // Usar 'pending' (con guion bajo)
          total_price: total,
          points_earned: points,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        showError(`Error al crear el pedido: ${orderError.message}`);
        setSubmitting(false);
        setUploadProgress('');
        return;
      }

      console.log('Pedido creado:', order);

      // Subir archivos y crear registros de order_files
      let filesUploaded = 0;
      let filesWithErrors = 0;

      for (const orderFile of orderFiles) {
        setUploadProgress(`Subiendo archivo ${filesUploaded + 1} de ${orderFiles.length}...`);
        
        const fileName = `${order.id}/${Date.now()}_${orderFile.file.name}`;
        
        console.log('Subiendo archivo:', fileName);

        // Subir archivo a Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('order-files')
          .upload(fileName, orderFile.file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          filesWithErrors++;
          
          // Crear registro en order_files sin el archivo (para mantener el registro)
          await supabase.from('order_files').insert({
            order_id: order.id,
            file_path: `error_${fileName}`,
            file_name: orderFile.file.name,
            file_type: orderFile.file.type,
            copies: orderFile.copies,
            color_mode: orderFile.color_mode,
            size: orderFile.size,
            price_per_copy: orderFile.price_per_copy,
          });
          
          continue;
        }

        // Crear registro en order_files
        const { error: fileRecordError } = await supabase.from('order_files').insert({
          order_id: order.id,
          file_path: fileName,
          file_name: orderFile.file.name,
          file_type: orderFile.file.type,
          copies: orderFile.copies,
          color_mode: orderFile.color_mode,
          size: orderFile.size,
          price_per_copy: orderFile.price_per_copy,
        });

        if (fileRecordError) {
          console.error('Error creating file record:', fileRecordError);
        }

        filesUploaded++;
      }

      // Registrar en auditoría
      await supabase.from('order_audit').insert({
        order_id: order.id,
        user_id: profile?.id,
        action: 'created',
        details: { total_price: total, points_earned: points, files_uploaded: filesUploaded, files_with_errors: filesWithErrors }
      });

      if (filesWithErrors > 0) {
        showSuccess(`Pedido creado con ${filesWithErrors} archivo(s) que no se pudieron subir. Los puntos se sumarán al completar el pedido.`);
      } else {
        showSuccess(`¡Pedido creado correctamente! Los puntos se sumarán al completar el pedido.`);
      }
      
      navigate('/client/orders');
    } catch (error) {
      console.error('Unexpected error:', error);
      showError('Error inesperado al crear el pedido. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  const selectedLocalData = locals.find(l => l.id === selectedLocal);

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
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white rounded-lg shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-text-carbon hover:text-primary-blue"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver
              </Button>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon">
              Crear Nuevo Pedido
            </CardTitle>
            <CardDescription>
              Selecciona un local, revisa los precios, sube tus archivos y configura tu pedido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selección de Local */}
              <div>
                <Label htmlFor="local" className="text-lg font-semibold flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary-blue" />
                  Selecciona un Local *
                </Label>
                <Select value={selectedLocal} onValueChange={handleLocalChange} disabled={submitting}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecciona un local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locals.map(local => (
                      <SelectItem key={local.id} value={local.id}>
                        <div className="flex items-center gap-2">
                          <span>{local.name}</span>
                          {local.address && (
                            <span className="text-gray-500 text-sm">- {local.address}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Información del Local Seleccionado */}
              {selectedLocal && selectedLocalData && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle className="flex items-center gap-2">
                    {selectedLocalData.name}
                    {selectedLocalData.can_edit_prices && (
                      <Badge variant="outline" className="text-xs">Precios Personalizados</Badge>
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    {selectedLocalData.address || 'Sin dirección registrada'}
                    {selectedLocalData.has_photo_print && (
                      <span className="ml-2 text-secondary-yellow">• Impresión de fotos disponible</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Lista de Precios del Local */}
              {selectedLocal && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PriceList 
                    prices={prices}
                    loading={loadingPrices}
                    title="Precios del Local"
                    description={
                      localInfo?.can_edit_prices 
                        ? "Precios personalizados de tu local (los marcados como 'Global' usan el precio base)"
                        : "Precios estándar"
                    }
                    showCustomBadge={false}
                    compact={true}
                  />

                  {/* Subir Archivos */}
                  <Card className="shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-bold text-text-carbon flex items-center gap-2">
                        <Upload className="h-5 w-5 text-primary-blue" />
                        Subir Archivos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Input
                        id="files"
                        type="file"
                        multiple
                        onChange={handleFileAdd}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="cursor-pointer"
                        disabled={prices.length === 0 || submitting}
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Formatos aceptados: PDF, DOC, DOCX, JPG, PNG
                      </p>
                      {prices.length === 0 && !loadingPrices && (
                        <p className="text-sm text-emphasis-red mt-2">
                          No hay servicios disponibles en este local.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Lista de Archivos */}
              {orderFiles.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-text-carbon">
                    Archivos del Pedido ({orderFiles.length})
                  </h3>
                  {orderFiles.map((file, index) => (
                    <Card key={index} className="p-4 border-l-4 border-l-primary-blue">
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
                            disabled={submitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Servicio</Label>
                            <Select
                              value={file.service_name}
                              onValueChange={(value) =>
                                handleFileUpdate(index, 'service_name', value)
                              }
                              disabled={submitting}
                            >
                              <SelectTrigger className="mt-1">
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
                            <Label className="text-xs">Copias</Label>
                            <Input
                              type="number"
                              min="1"
                              value={file.copies}
                              onChange={(e) =>
                                handleFileUpdate(index, 'copies', parseInt(e.target.value) || 1)
                              }
                              className="mt-1"
                              disabled={submitting}
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Color</Label>
                            <Select
                              value={file.color_mode}
                              onValueChange={(value) =>
                                handleFileUpdate(index, 'color_mode', value)
                              }
                              disabled={submitting}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="color">Color</SelectItem>
                                <SelectItem value="bw">Blanco y Negro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Tamaño</Label>
                            <Select
                              value={file.size}
                              onValueChange={(value) =>
                                handleFileUpdate(index, 'size', value)
                              }
                              disabled={submitting}
                            >
                              <SelectTrigger className="mt-1">
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
                <Card className="bg-gradient-to-r from-primary-blue/10 to-purple-100 p-6 border-2 border-primary-blue">
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-text-carbon flex items-center gap-2">
                      <DollarSign className="h-6 w-6 text-success-green" />
                      Resumen del Pedido
                    </h3>
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-2xl text-primary-blue">
                        ${calculateTotal().toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Puntos a ganar:</span>
                      <span className="text-secondary-yellow font-bold text-lg">
                        +{calculatePoints(calculateTotal())} puntos (Se sumarán al completar el pedido)
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Indicador de Progreso */}
              {submitting && uploadProgress && (
                <div className="flex items-center justify-center gap-3 p-4 bg-primary-blue/10 rounded-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-blue" />
                  <span className="text-primary-blue font-medium">{uploadProgress}</span>
                </div>
              )}

              {/* Botón de Envío */}
              <Button
                type="submit"
                disabled={submitting || !selectedLocal || orderFiles.length === 0}
                className="w-full bg-primary-blue hover:bg-blue-700 text-white font-bold py-4 text-lg"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Procesando...
                  </span>
                ) : (
                  'Crear Pedido'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewOrder;