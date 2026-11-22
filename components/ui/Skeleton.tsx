/**
 * Skeleton Loading Component
 * Provides animated skeleton loaders for various content types
 * Optimized for mobile with explicit dimensions to prevent CLS
 */

'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  animated?: boolean;
  count?: number;
  variant?: 'text' | 'circle' | 'rect' | 'avatar' | 'mobile-text';
  width?: string | number;
  height?: string | number;
  /**
   * CLS prevention: min-height ensures skeleton occupies space before content loads
   */
  minHeight?: string | number;
}

/**
 * Basic Skeleton Loader
 * @param className - Tailwind classes for custom styling
 * @param animated - Enable animation (default: true)
 * @param variant - Shape variant: 'text', 'circle', 'rect', 'avatar', 'mobile-text'
 * @param minHeight - Minimum height to prevent CLS (critical for mobile)
 */
export function Skeleton({
  className = '',
  animated = true,
  count,
  variant = 'rect',
  width,
  height = '24px',
  minHeight,
}: SkeletonProps) {
  const baseClass = 'bg-white/[0.05] border border-white/10';
  const animationClass = animated ? 'animate-pulse' : '';

  const variantClass = {
    text: 'rounded',
    circle: 'rounded-full',
    rect: 'rounded-lg',
    avatar: 'rounded-full',
    'mobile-text': 'rounded',
  }[variant];

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
  };

  return (
    <div
      className={`${baseClass} ${animationClass} ${variantClass} ${className}`}
      style={style}
      aria-label="Cargando…"
      role="status"
    />
  );
}

/**
 * Skeleton for a full card (mobile-optimized with explicit dimensions)
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`space-y-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-glass-sm sm:p-6 ${className}`}
      style={{ minHeight: '200px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton width="60%" height={24} minHeight={24} />
        <Skeleton width={40} height={40} variant="circle" />
      </div>

      {/* Content lines */}
      <div className="space-y-2">
        <Skeleton width="100%" height={16} minHeight={16} />
        <Skeleton width="90%" height={16} minHeight={16} />
        <Skeleton width="85%" height={16} minHeight={16} />
      </div>

      {/* Footer */}
      <div className="flex gap-2 pt-4">
        <Skeleton width="48%" height={36} minHeight={36} />
        <Skeleton width="48%" height={36} minHeight={36} />
      </div>
    </div>
  );
}

/**
 * Skeleton for table rows (mobile-optimized with explicit height)
 */
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <div
      className={`flex gap-4 rounded-lg border border-white/10 bg-white/[0.05] p-3 shadow-glass-sm sm:p-4`}
      style={{ minHeight: '56px' }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="flex-1" height={20} minHeight={20} aria-hidden="true" />
      ))}
    </div>
  );
}

/**
 * Skeleton for a list item (mobile-optimized with explicit dimensions)
 */
export function SkeletonListItem() {
  return (
    <div
      className="space-y-3 rounded-lg border border-white/10 bg-white/[0.05] p-4 shadow-glass-sm"
      style={{ minHeight: '120px' }}
    >
      <div className="flex items-center justify-between">
        <Skeleton width="40%" height={20} minHeight={20} />
        <Skeleton width={60} height={20} variant="circle" />
      </div>
      <div className="space-y-2">
        <Skeleton width="100%" height={16} minHeight={16} />
        <Skeleton width="70%" height={16} minHeight={16} />
      </div>
    </div>
  );
}

/**
 * Skeleton for a chart/graph (mobile-optimized with explicit dimensions)
 */
export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div
      className="space-y-4 rounded-xl border border-white/10 bg-white/[0.05] p-4 shadow-glass-md sm:p-6"
      style={{ minHeight: `${height + 80}px` }}
    >
      <Skeleton width="30%" height={24} minHeight={24} />
      <Skeleton
        width="100%"
        height={height}
        minHeight={height}
        className="rounded-lg"
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Skeleton for a form (mobile-optimized with explicit dimensions)
 */
export function SkeletonForm({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-4" style={{ minHeight: `${fields * 70 + 100}px` }}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="20%" height={16} minHeight={16} />
          <Skeleton width="100%" height={44} minHeight={44} />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <Skeleton width="50%" height={44} minHeight={44} />
        <Skeleton width="50%" height={44} minHeight={44} />
      </div>
    </div>
  );
}

/**
 * Mobile-optimized skeleton for dashboard cards
 * Prevents CLS with explicit mobile-friendly dimensions
 */
export function SkeletonDashboardCard() {
  return (
    <div
      className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-glass-sm"
      style={{ minHeight: '140px' }}
    >
      <div className="flex items-center justify-between">
        <Skeleton width="50%" height={20} minHeight={20} />
        <Skeleton width={32} height={32} variant="circle" />
      </div>
      <div className="space-y-2">
        <Skeleton width="40%" height={28} minHeight={28} />
        <Skeleton width="70%" height={14} minHeight={14} />
      </div>
    </div>
  );
}

/**
 * Mobile-optimized skeleton for list items with avatar
 */
export function SkeletonListItemWithAvatar() {
  return (
    <div
      className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.05] p-4 shadow-glass-sm"
      style={{ minHeight: '72px' }}
    >
      <Skeleton width={48} height={48} variant="avatar" />
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height={16} minHeight={16} />
        <Skeleton width="40%" height={14} minHeight={14} />
      </div>
      <Skeleton width={32} height={32} variant="circle" />
    </div>
  );
}

export default Skeleton;
