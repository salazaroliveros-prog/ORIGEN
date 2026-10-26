'use client';

import React from 'react';

interface TouchTargetProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: React.ReactNode;
  onPress?: () => void;
  minSize?: number;
  haptic?: boolean;
}

export function TouchTarget({
  children,
  onPress,
  minSize = 44,
  haptic = true,
  className = '',
  style,
  onPointerDown,
  ...buttonProps
}: TouchTargetProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (haptic && event.pointerType === 'touch' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(10);
        }
      }}
      style={{ ...style, minWidth: minSize, minHeight: minSize }}
      className={`touch-target group relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 active:scale-95 active:opacity-80 ${className}`}
      {...buttonProps}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-white/[0.05] opacity-0 transition-opacity duration-200 group-hover:opacity-100"></span>
      {children}
    </button>
  );
}
