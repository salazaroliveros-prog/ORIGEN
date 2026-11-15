'use client';

import React, { useRef } from 'react';
import { FocusTrap } from '@/components/a11y/FocusTrap';

/**
 * Modal accesible (WCAG 2.1 AA).
 *
 * Características:
 * - Renderizado condicional (solo cuando isOpen es true)
 * - FocusTrap interno con retorno de foco al elemento activador
 * - Cierre con tecla Escape
 * - role="dialog", aria-modal="true", aria-labelledby
 * - Overlay con backdrop blur y animación de entrada
 *
 * @example
 * <AccessibleModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Editar Proyecto"
 * >
 *   <p>Contenido del modal</p>
 * </AccessibleModal>
 */
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessible-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm duration-200 sm:p-6"
      onClick={(e) => {
        // Cerrar solo si se hace clic en el overlay (no en el contenido)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <FocusTrap onEscape={onClose} returnFocus={true}>
        <div
          className={`flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl ${className}`}
        >
          <div className="flex items-center justify-between bg-slate-900 p-5 text-white">
            <h3 id="accessible-modal-title" className="text-lg font-bold">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 transition hover:text-white"
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
        </div>
      </FocusTrap>
    </div>
  );
}
