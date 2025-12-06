"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Gift, Check, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

const Rewards = () => {
  const { profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points_cost: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    if (!sessionLoading && profile?.role !== 'admin') {
      showError('No tienes permiso para acceder a esta página.');
      navigate('/admin/dashboard');
    }

    if (!sessionLoading && profile?.role === 'admin') {
      fetchRewards();
    }
  }, [sessionLoading, profile, navigate]);

  const fetchRewards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('points_cost', { ascending: true });

    if (error) {
      console.error('Error fetching rewards:', error);
      showError('Error al cargar las recompensas.');
    } else {
      setRewards(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const pointsCost = parseInt(formData.points_cost);
    
    if (isNaN(pointsCost) || pointsCost <= 0) {
      showError('El costo en puntos debe ser un número entero positivo.');
      setLoading(false);
      return;
    }
    
    setLoading(true);

    const rewardData = {
      name: formData.name,
      description: formData.description || null,
      points_cost: pointsCost, // Usar el valor parseado
      image_url: formData.image_url || null,
      is_active: formData.is_active,
    };

    try {
      if (editingReward) {
        const { error } = await supabase
          .from('rewards')
          .update(rewardData)
          .eq('id', editingReward.id);

        if (error) {
          throw new Error(error.message);
        }
        
        showSuccess('Recompensa actualizada correctamente.');
        setDialogOpen(false);
        setEditingReward(null);
        resetForm();
        fetchRewards();
      } else {
        const { error } = await supabase
          .from('rewards')
          .insert([rewardData]);

        if (error) {
          throw new Error(error.message);
        }
        
        showSuccess('Recompensa creada correctamente.');
        setDialogOpen(false);
        resetForm();
        fetchRewards();
      }
    } catch (error) {
      console.error('Error saving reward:', error);
      showError(`Error al guardar la recompensa: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta recompensa?')) return;

    setLoading(true);
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting reward:', error);
      showError('Error al eliminar la recompensa.');
    } else {
      showSuccess('Recompensa eliminada correctamente.');
      fetchRewards();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      points_cost: '',
      image_url: '',
      is_active: true,
    });
  };

  const openEditDialog = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || '',
      points_cost: reward.points_cost.toString(),
      image_url: reward.image_url || '',
      is_active: reward.is_active,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingReward(null);
    resetForm();
    setDialogOpen(true);
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando recompensas...</p>
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
                    Nueva Recompensa
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingReward ? 'Editar Recompensa' : 'Crear Nueva Recompensa'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingReward
                        ? 'Modifica los detalles de la recompensa.'
                        : 'Completa los datos para crear una nueva recompensa.'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nombre de la Recompensa *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                        placeholder="Ej: 10% de Descuento"
                      />
                    </div>
                    <div>
                      <Label htmlFor="points_cost">Costo en Puntos *</Label>
                      <Input
                        id="points_cost"
                        type="number"
                        step="1"
                        min="1"
                        value={formData.points_cost}
                        onChange={(e) =>
                          setFormData({ ...formData, points_cost: e.target.value })
                        }
                        required
                        placeholder="Ej: 500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Breve descripción de lo que ofrece la recompensa."
                      />
                    </div>
                    <div>
                      <Label htmlFor="image_url">URL de la Imagen (Opcional)</Label>
                      <Input
                        id="image_url"
                        type="url"
                        value={formData.image_url}
                        onChange={(e) =>
                          setFormData({ ...formData, image_url: e.target.value })
                        }
                        placeholder="https://ejemplo.com/imagen_premio.png"
                      />
                      {formData.image_url && (
                        <div className="mt-2">
                          <img src={formData.image_url} alt="Vista previa" className="h-16 object-contain border rounded" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_active">
                        Recompensa Activa
                      </Label>
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, is_active: checked })
                        }
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false);
                          setEditingReward(null);
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
                        {loading ? 'Procesando...' : (editingReward ? 'Actualizar' : 'Crear')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <CardTitle className="text-3xl font-bold text-text-carbon">
              Gestión de Recompensas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rewards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay recompensas registradas. Crea una nueva para comenzar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recompensa</TableHead>
                    <TableHead>Costo (Puntos)</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {reward.image_url && (
                            <img src={reward.image_url} alt={reward.name} className="h-8 w-8 object-contain rounded" />
                          )}
                          {reward.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-secondary-yellow">
                        {reward.points_cost} pts
                      </TableCell>
                      <TableCell>
                        <Badge variant={reward.is_active ? 'default' : 'secondary'}>
                          {reward.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(reward)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(reward.id)}
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

export default Rewards;