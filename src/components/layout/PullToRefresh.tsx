"use client";

import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  loading: boolean;
}

const REFRESH_THRESHOLD = 80; // Distancia mínima de arrastre para activar el refresco (en píxeles)
const MAX_PULL_DISTANCE = 150; // Distancia máxima de arrastre permitida

const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, onRefresh, loading }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Función para verificar si el scroll está en la parte superior
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return true;
    // Verificamos si el scroll vertical está en 0
    return containerRef.current.scrollTop === 0;
  }, []);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (loading || !isAtTop()) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPulling || loading) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0) {
      // Prevenir el scroll nativo del cuerpo solo cuando estamos arrastrando hacia abajo
      e.preventDefault();
      
      // Limitar la distancia de arrastre
      const limitedDistance = Math.min(distance, MAX_PULL_DISTANCE);
      setPullDistance(limitedDistance);
    } else {
      // Si el usuario empieza a deslizar hacia arriba, detenemos el pull
      setIsPulling(false);
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || loading) return;

    setIsPulling(false);

    if (pullDistance >= REFRESH_THRESHOLD) {
      // Activar refresco
      try {
        await onRefresh();
      } catch (error) {
        console.error("Error during pull-to-refresh:", error);
      }
    }
    
    // Resetear la distancia con una transición suave
    setPullDistance(0);
  };

  // Calcular la rotación del icono
  const rotation = Math.min(pullDistance / REFRESH_THRESHOLD, 1) * 360;
  
  // Calcular la opacidad del indicador
  const opacity = Math.min(pullDistance / (REFRESH_THRESHOLD / 2), 1);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        // Aseguramos que el contenido se desplace hacia abajo con el arrastre
        transform: `translateY(${pullDistance}px)`,
        transition: isPulling || loading ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {/* Indicador de Pull to Refresh */}
      <div
        className="absolute top-0 left-0 w-full flex justify-center items-center"
        style={{
          height: `${pullDistance}px`,
          transform: `translateY(-${pullDistance}px)`, // Mover el indicador hacia arriba para que esté visible
          opacity: opacity,
          transition: isPulling || loading ? 'none' : 'opacity 0.3s ease-out',
        }}
      >
        <div className={cn(
          "p-2 rounded-full bg-primary-blue text-white shadow-md transition-all duration-100",
          { "animate-spin": loading }
        )}>
          <RefreshCw 
            className="h-6 w-6" 
            style={{ transform: loading ? 'none' : `rotate(${rotation}deg)` }}
          />
        </div>
      </div>

      {/* Contenido de la aplicación */}
      {children}
    </div>
  );
};

export default PullToRefresh;