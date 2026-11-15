'use client';

import React, { useEffect, useRef } from 'react';

interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

export function MobileSheet({
  isOpen,
  onClose,
  children,
  header,
  className = '',
}: MobileSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      {isOpen && (
        <div
          className="mobile-sheet-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      {isOpen && (
        <div
          ref={sheetRef}
          className={`mobile-sheet ${className}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="mobile-sheet-header">
            <div className="mobile-sheet-handle" />
            {header}
          </div>
          <div className="mobile-sheet-body">
            {children}
          </div>
        </div>
      )}
    </>
  );
}
