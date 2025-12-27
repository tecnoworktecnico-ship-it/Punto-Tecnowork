"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardAnimatedProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  description?: string;
  delay?: number;
}

const StatCardAnimated: React.FC<StatCardAnimatedProps> = ({ title, value, icon: Icon, color, description, delay = 0 }) => {
  // Mapear colores de Tailwind a clases de fondo/borde
  const colorMap: Record<string, { bg: string, border: string }> = {
    'text-success-green': { bg: 'bg-success-green/10', border: 'border-success-green' },
    'text-primary-blue': { bg: 'bg-primary-blue/10', border: 'border-primary-blue' },
    'text-secondary-yellow': { bg: 'bg-secondary-yellow/10', border: 'border-secondary-yellow' },
    'text-purple-600': { bg: 'bg-purple-600/10', border: 'border-purple-600' },
  };
  
  const { bg, border } = colorMap[color] || { bg: 'bg-gray-50', border: 'border-gray-300' };
  const delayClass = delay > 0 ? `animation-delay-${delay}` : '';

  return (
    <Card 
      className={cn(
        `shadow-premium-sm hover:shadow-lg transition-shadow border-l-4 ${border} ${bg}`,
        "animate-fade-in-up",
        delayClass
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-text-carbon">{value}</div>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};

export default StatCardAnimated;