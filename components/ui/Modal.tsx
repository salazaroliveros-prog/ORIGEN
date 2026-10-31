'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { FocusTrap } from '@/components/a11y/FocusTrap';
import { designTokens } from '@/lib/design-tokens';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[95vw]',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  closeOnEscape = true,
  closeOnOverlayClick = true,
  maxWidth = 'md',
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${closeOnOverlayClick ? 'cursor-pointer' : ''}`}
        onClick={closeOnOverlayClick ? onClose : undefined}
        role="presentation"
      />
      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <FocusTrap isActive onEscape={onClose} returnFocus>
          <div
            className={`pointer-events-auto w-full ${maxWidthMap[maxWidth]} ${className}`}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? undefined}
          >
            {/* Card */}
            <div className={`relative rounded-xl bg-slate-900 border border-white/15 shadow-xl transition-all duration-300 ${designTokens.transitions.normal}`}>
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-white/[0.05] hover:text-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
              {/* Content */}
              <div className="px-6 py-4">{children}</div>
            </div>
          </div>
        </FocusTrap>
      </div>
    </>
  );
}