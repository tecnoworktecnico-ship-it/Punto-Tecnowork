import React from 'react';
import { Badge } from '@/components/ui/badge';

export type OrderStatus = 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';

interface StatusConfig {
  label: string;
  className: string;
}

const statusConfig: Record<OrderStatus, StatusConfig> = {
  pending: { label: 'Pendiente', className: 'bg-secondary-yellow/20 text-secondary-yellow border-secondary-yellow' },
  processing: { label: 'En Proceso', className: 'bg-primary-blue/20 text-primary-blue border-primary-blue' },
  ready: { label: 'Listo para Recoger', className: 'bg-success-green/20 text-success-green border-success-green' },
  completed: { label: 'Completado', className: 'bg-gray-200 text-gray-700 border-gray-400' },
  cancelled: { label: 'Cancelado', className: 'bg-emphasis-red/20 text-emphasis-red border-emphasis-red' },
};

export const getStatusBadge = (status: OrderStatus) => {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-500 border-gray-300' };
  return <Badge variant="outline" className={`capitalize ${config.className}`}>{config.label}</Badge>;
};

export const getStatusConfig = (status: OrderStatus): StatusConfig => {
  return statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-500 border-gray-300' };
};