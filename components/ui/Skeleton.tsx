'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  height?: number | string;
  width?: number | string;
  radius?: 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({
  className = '',
  height = '16px',
  width = '100%',
  radius = 'md',
}: SkeletonProps) {
  const radiusMap = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return <div className={`skeleton ${radiusMap[radius]} ${className}`} style={{ height, width }} />;
}
