"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardProps } from '@/components/ui/card'; // Importar Card de shadcn/ui

interface ContentCardProps extends CardProps {
  delay?: number; // Delay en milisegundos (0, 100, 200, etc.)
  children: React.ReactNode;
}

const ContentCard: React.FC<ContentCardProps> = ({ delay = 0, className, children, ...props }) => {
  const delayClass = delay > 0 ? `animation-delay-${delay}` : '';

  return (
    <Card
      className={cn(
        "glass-card-strong rounded-2xl shadow-premium-sm animate-fade-in-up",
        delayClass,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
      {...props}
    >
      {children}
    </Card>
  );
};

export default ContentCard;