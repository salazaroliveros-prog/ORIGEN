/**
 * Skeleton Loading Component
 * Provides animated skeleton loaders for various content types
 */

'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  animated?: boolean;
  count?: number;
  variant?: 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
}

/**
 * Basic Skeleton Loader
 * @param className - Tailwind classes for custom styling
 * @param animated - Enable animation (default: true)
 * @param variant - Shape variant: 'text', 'circle', or 'rect'
 */
export function Skeleton({
  className = '',
  animated = true,
  variant = 'rect',
  width,
  height = '24px',
}: SkeletonProps) {
  const baseClass = 'bg-white/[0.05] border border-white/10';
  const animationClass = animated ? 'animate-pulse' : '';

  const variantClass = {
    text: 'rounded',
    circle: 'rounded-full',
    rect: 'rounded-lg',
  }[variant];

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseClass} ${animationClass} ${variantClass} ${className}`}
      style={style}
      aria-label="Cargando..."
      role="status"
    />
  );
}

/**
 * Skeleton for a full card
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`space-y-4 rounded-2xl border border-white/10 bg-white/[0.05] p-6 shadow-glass-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton width="60%" height={24} />
        <Skeleton width="40" height={40} variant="circle" />
      </div>

      {/* Content lines */}
      <div className="space-y-2">
        <Skeleton width="100%" height={16} />
        <Skeleton width="90%" height={16} />
        <Skeleton width="85%" height={16} />
      </div>

      {/* Footer */}
      <div className="flex gap-2 pt-4">
        <Skeleton width="48%" height={36} />
        <Skeleton width="48%" height={36} />
      </div>
    </div>
  );
}

/**
 * Skeleton for table rows
 */
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <div
      className={`flex gap-4 rounded-lg border border-white/10 bg-white/[0.05] p-4 shadow-glass-sm`}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="flex-1" height={20} />
      ))}
    </div>
  );
}

/**
 * Skeleton for a list item
 */
export function SkeletonListItem() {
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.05] p-4 shadow-glass-sm">
      <div className="flex items-center justify-between">
        <Skeleton width="40%" height={20} />
        <Skeleton width={60} height={20} variant="circle" />
      </div>
      <div className="space-y-2">
        <Skeleton width="100%" height={16} />
        <Skeleton width="70%" height={16} />
      </div>
    </div>
  );
}

/**
 * Skeleton for a chart/graph
 */
export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.05] p-6 shadow-glass-md">
      <Skeleton width="30%" height={24} />
      <Skeleton width="100%" height={height} className="rounded-lg" />
    </div>
  );
}

/**
 * Skeleton for a form
 */
export function SkeletonForm({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="20%" height={16} />
          <Skeleton width="100%" height={44} />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <Skeleton width="50%" height={44} />
        <Skeleton width="50%" height={44} />
      </div>
    </div>
  );
}

export default Skeleton;
