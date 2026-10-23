'use client';

import React, { useState } from 'react';

interface TouchTargetProps {
  children: React.ReactNode;
  onPress?: () => void;
  minSize?: number;
  haptic?: boolean;
  className?: string;
}

export const TouchTarget: React.FC<TouchTargetProps> = ({
  children,
  onPress,
  minSize = 44,
  haptic = true,
  className = '',
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handlePressStart = () => {
    setIsPressed(true);
    if (haptic && navigator.vibrate) navigator.vibrate(10);
  };

  const handlePressEnd = () => {
    setIsPressed(false);
    if (onPress) onPress();
  };

  return (
    <div
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={() => setIsPressed(false)}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      className={`relative group ${className} min-w-[${minSize}px] min-h-[${minSize}px] ${isPressed ? 'scale-95 opacity-80' : ''}`}
    >
      <span className="absolute inset-0 bg-white/[0.05] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
      {children}
    </div>
  );
};
