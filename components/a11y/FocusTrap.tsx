'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface FocusTrapProps {
  children: React.ReactNode;
  isActive?: boolean;
  onEscape?: () => void;
  returnFocus?: boolean;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  isActive = true,
  onEscape,
  returnFocus = true,
}) => {
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
        elements[currentIndex === 0 ? elements.length - 1 : currentIndex - 1].focus();
      } else {
        elements[currentIndex === elements.length - 1 ? 0 : currentIndex + 1].focus();
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

  useEffect(() => {
    if (!isActive) return;
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape?.();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isActive, onEscape]);

  return <div ref={containerRef} tabIndex={-1}>{children}</div>;
};
