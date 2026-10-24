'use client';

import React from 'react';

interface TouchTargetProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: React.ReactNode;
  onPress?: () => void;
  minSize?: number;
  haptic?: boolean;
}

export const TouchTarget: React.FC<TouchTargetProps> = ({
  children,
  onPress,
  minSize = 44,
  haptic = true,
  className = '',
  style,
  onPointerDown,
  ...buttonProps
}) => {
  return (
    <button
      type="button"
      onClick={onPress}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (
          haptic &&
          event.pointerType === 'touch' &&
          typeof navigator.vibrate === 'function'
        ) {
          navigator.vibrate(10);
        }
      }}
      style={{ ...style, minWidth: minSize, minHeight: minSize }}
      className={`touch-target relative group active:scale-95 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${className}`}
      {...buttonProps}
    >
      <span className="absolute inset-0 bg-white/[0.05] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
      {children}
    </button>
  );
};
