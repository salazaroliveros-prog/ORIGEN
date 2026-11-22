'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  swipeToClose?: boolean;
}

export function MobileSheet({
  isOpen,
  onClose,
  children,
  header,
  className = '',
  swipeToClose = true,
}: MobileSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
          ref={sheetRef}
          className={`mobile-sheet ${className}`}
          role="dialog"
          aria-modal="true"
          style={{
            transform: transformStyle,
            transition: isDragging ? 'none' : 'transform var(--transition-slower)',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mobile-sheet-header">
            <div className="mobile-sheet-handle" aria-label="Desliza hacia abajo para cerrar" />
            {header}
          </div>
          <div className="mobile-sheet-body">{children}</div>
        </div>
      )}
    </>
  );
}
