'use client';

import React, { useEffect, useState } from 'react';

interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  swipeToClose?: boolean;
  id?: string;
  labelledBy?: string;
}

export function MobileSheet({
  isOpen,
  onClose,
  children,
  header,
  className = '',
  swipeToClose = true,
  id,
  labelledBy,
}: MobileSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isOpen) document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeToClose) return;
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeToClose || !isDragging) return;
    const y = e.touches[0].clientY;
    setCurrentY(y);
  };

  const handleTouchEnd = () => {
    if (!swipeToClose || !isDragging) return;
    const diff = currentY - startY;

    // Swipe down threshold
    if (diff > 100) {
      onClose();
    }

    setIsDragging(false);
    setCurrentY(0);
    setStartY(0);
  };

  const transformStyle =
    isDragging && currentY > startY ? `translateY(${currentY - startY}px)` : 'translateY(0)';

  return (
    <>
      {isOpen && <div className="mobile-sheet-overlay" onClick={onClose} aria-hidden="true" />}
      {isOpen && (
        <div
          id={id}
          className={`mobile-sheet ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-label={labelledBy ? undefined : 'Panel de navegación'}
          style={{
            transform: transformStyle,
            transition: isDragging ? 'none' : 'transform var(--transition-slower)',
          }}
        >
          <div
            className="mobile-sheet-header"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="mobile-sheet-handle" aria-hidden="true" />
            {header}
          </div>
          <div className="mobile-sheet-body">{children}</div>
        </div>
      )}
    </>
  );
}
