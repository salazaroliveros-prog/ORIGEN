'use client';

import { useCallback, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className = '',
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      const container = containerRef.current;
      if (!container) return;
      // Solo activar pull-to-refresh cuando estamos en la parte superior del scroll
      if (container.scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing || !isPullingRef.current || startYRef.current === null) return;
      const container = containerRef.current;
      if (!container) return;
      if (container.scrollTop > 0) {
        isPullingRef.current = false;
        startYRef.current = null;
        setPullDistance(0);
        return;
      }
      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;
      if (diff > 0) {
        const distance = Math.min(diff / 2, threshold * 1.5);
        setPullDistance(distance);
        e.preventDefault();
      }
    },
    [disabled, isRefreshing, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isPullingRef.current) {
      isPullingRef.current = false;
      startYRef.current = null;
      setPullDistance(0);
      return;
    }
    const distance = pullDistance;
    isPullingRef.current = false;
    startYRef.current = null;
    setPullDistance(0);

    if (distance >= threshold) {
      setIsRefreshing(true);
      try {
        await Promise.resolve(onRefresh());
      } catch {
        // Error manejado por el llamador
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [disabled, onRefresh, pullDistance, threshold]);

  return (
    <div
      ref={containerRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        isPullingRef.current = false;
        startYRef.current = null;
        setPullDistance(0);
      }}
      style={{ touchAction: 'pan-y' }}
    >
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center py-2 text-xs text-slate-400"
          style={{ transform: `translateY(${-pullDistance}px)` }}
        >
          {isRefreshing ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin text-brand-400" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4 text-brand-400" />
          )}
          {isRefreshing ? 'Actualizando…' : 'Desliza para actualizar'}
        </div>
      )}
      {children}
    </div>
  );
}
