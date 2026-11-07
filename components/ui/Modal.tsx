'use client';

import React, { useEffect, useCallback, useId } from 'react';
import { X } from 'lucide-react';
import { FocusTrap } from '@/components/a11y/FocusTrap';

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
  const titleId = useId();

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
      <div
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-xl transition-opacity duration-300 ${closeOnOverlayClick ? 'cursor-pointer' : ''}`}
        onClick={closeOnOverlayClick ? onClose : undefined}
        role="presentation"
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <FocusTrap isActive onEscape={onClose} returnFocus>
          <div
            className={`pointer-events-auto w-full ${maxWidthMap[maxWidth]} ${className}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : 'Diálogo'}
          >
            <div className="relative rounded-3xl border border-white/15 bg-glass-l2-bg shadow-glass-xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                {title ? (
                  <h2 id={titleId} className="text-lg font-semibold text-slate-100">
                    {title}
                  </h2>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors duration-200 hover:bg-white/[0.08] hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="px-6 py-4">{children}</div>
            </div>
          </div>
        </FocusTrap>
      </div>
    </>
  );
}
