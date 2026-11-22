'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  /**
   * Placeholder color while loading
   */
  placeholderColor?: string;
  /**
   * Enable blur placeholder (requires width/height)
   */
  blur?: boolean;
}

/**
 * Optimized Image Component
 * - Uses Next.js Image for automatic WebP/AVIF conversion
 * - Prevents CLS with explicit dimensions or fill with parent sizing
 * - Shows loading placeholder
 * - Mobile-optimized with responsive sizes
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fill = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 75,
  placeholderColor = 'rgba(255, 255, 255, 0.05)',
  blur = false,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] ${className}`}
        style={fill ? {} : { width, height }}
        role="img"
        aria-label={alt}
      >
        <span className="text-sm text-slate-500">Imagen no disponible</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={fill ? {} : { width, height }}>
      {isLoading && (
        <div
          className="absolute inset-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.05]"
          aria-hidden="true"
        >
          <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes}
        quality={quality}
        priority={priority}
        placeholder={blur ? 'blur' : 'empty'}
        blurDataURL={blur ? placeholderColor : undefined}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}

/**
 * Avatar component with optimized image loading
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 48,
  className = '',
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      sizes="(max-width: 768px) 48px, 64px"
      quality={80}
    />
  );
}

/**
 * Thumbnail component for gallery/photos
 */
export function OptimizedThumbnail({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={150}
      height={150}
      className={`rounded-lg object-cover ${className}`}
      sizes="(max-width: 768px) 150px, 200px"
      quality={70}
    />
  );
}
