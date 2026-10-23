'use client';

import React, { useEffect, useState } from 'react';

interface FocusVisibleProps {
  children: React.ReactNode;
  className?: string;
}

export const FocusVisible: React.FC<FocusVisibleProps> = ({ children, className = '' }) => {
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') setIsFocusVisible(true);
    };
    const handlePointerDown = () => setIsFocusVisible(false);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  return (
    <div className={className}>
      {isFocusVisible && (
        <span className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:-inset-1 focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep rounded-md">
          Indicador de foco
        </span>
      )}
      {children}
    </div>
  );
};
