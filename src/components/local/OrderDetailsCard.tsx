"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LocalOrder, OrderStatus } from '@/types/order';
import { User, DollarSign, Clock, Calendar } from 'lucide-react';
import { getStatusBadge } from '@/utils/order-status'; // Importar utilidad

interface OrderDetailsCardProps {
  order: LocalOrder;
}

const OrderDetailsCard: React.FC<OrderDetailsCardProps> = ({ order }) => {
  const clientName = `${order.profiles?.first_name || 'Cliente'} ${order.profiles?.last_name || 'Desconocido'}`.trim();

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-text-carbon flex items-center justify-between">
          Pedido #{order.id.substring(0, 8)}...
          {getStatusBadge(order.status)}
        </CardTitle>
        <CardDescription>Detalles del pedido creado el {new Date(order.created_at).toLocaleDateString('es-ES')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary-blue" />
            <div>
              <p className="text-sm text-gray-500">Cliente</p>
              <p className="font-medium text-text-carbon">{clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success-green" />
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="font-medium text-text-carbon">${order.total_price.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-secondary-yellow" />
            <div>
              <p className="text-sm text-gray-500">Fecha de Creación</p>
              <p className="font-medium text-text-carbon">{new Date(order.created_at).toLocaleString('es-ES')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Última Actualización</p>
              <p className="font-medium text-text-carbon">{new Date(order.updated_at).toLocaleString('es-ES')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderDetailsCard;