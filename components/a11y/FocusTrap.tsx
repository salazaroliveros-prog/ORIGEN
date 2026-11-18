'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface FocusTrapProps {
  children: React.ReactNode;
  isActive?: boolean;
  onEscape?: () => void;
  returnFocus?: boolean;
}

export function FocusTrap({
  children,
  isActive = true,
  onEscape,
  returnFocus = true,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
      )
    ) as HTMLElement[];
  }, []);

  const trapFocus = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      e.preventDefault();
      const currentIndex = elements.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        const target = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
        elements[target]?.focus();
      } else {
        const target =
          currentIndex === -1 || currentIndex === elements.length - 1 ? 0 : currentIndex + 1;
        elements[target]?.focus();
      }
    },
    [getFocusableElements]
  );

  useEffect(() => {
    if (!isActive) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement;
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }

    document.addEventListener('keydown', trapFocus);

    return () => {
      document.removeEventListener('keydown', trapFocus);
      if (returnFocus && previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isActive, returnFocus, getFocusableElements, trapFocus]);

  // El callback se mantiene en un ref para que el listener del documento
  // sea estable y no se re-suscriba en cada render: si `onEscape` cambia de
  // identidad (lambda nuevo en el padre), el efecto se re-ejecutaba y el
  // handler viejo quedaba registrado con un cierre obsoleto que ya no
  // apuntaba al `onEscape` vigente, dejando el diálogo sin cierre por teclado.
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!isActive) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscapeRef.current?.();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isActive]);

  return (
    <div ref={containerRef} tabIndex={-1}>
      {children}
    </div>
  );
}
