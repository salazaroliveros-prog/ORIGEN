/**
 * ORIGEN ERP - Mobile Responsive Components & Utilities
 * Priority 5 Features:
 * - Responsive table/card toggle for mobile
 * - Modal safe area padding (notch awareness)
 * - Keyboard accommodation (resize on input focus)
 * - Touch-friendly button sizes (min 44x44px)
 * - Swipe gesture support
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

// FEATURE 5.1: Hook for mobile detection and safe area
export function useMobileView() {
  const [isMobile, setIsMobile] = useState(false);
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    // Detect mobile
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Detect safe area (for notch/Dynamic Island)
    const updateSafeArea = () => {
      const root = document.documentElement;
      const top = parseInt(getComputedStyle(root).getPropertyValue('--safe-area-inset-top') || '0');
      const right = parseInt(
        getComputedStyle(root).getPropertyValue('--safe-area-inset-right') || '0'
      );
      const bottom = parseInt(
        getComputedStyle(root).getPropertyValue('--safe-area-inset-bottom') || '0'
      );
      const left = parseInt(
        getComputedStyle(root).getPropertyValue('--safe-area-inset-left') || '0'
      );

      setSafeAreaInsets({ top, right, bottom, left });
    };

    handleResize();
    updateSafeArea();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return { isMobile, safeAreaInsets };
}

// FEATURE 5.1: Media query hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// FEATURE 5.1: Viewport hook
export function useViewport() {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { width, height };
}

// FEATURE 5.2: Touch hook
export function useTouch() {
  const [touchSupported, setTouchSupported] = useState(false);

  useEffect(() => {
    setTouchSupported('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return { touchSupported };
}

// FEATURE 5.2: Keyboard accommodation hook
export function useKeyboardAccommodation() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const windowHeight = window.innerHeight;
      const screenHeight = window.screen.height;
      const keyboardVisible = screenHeight > windowHeight + 100;

      setIsKeyboardOpen(keyboardVisible);
      setKeyboardHeight(Math.max(0, screenHeight - windowHeight));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isKeyboardOpen, keyboardHeight };
}

// FEATURE 5.3: Swipe gesture hook
export function useSwipeGesture(onSwipeLeft?: () => void, onSwipeRight?: () => void) {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && onSwipeLeft) onSwipeLeft();
    if (isRightSwipe && onSwipeRight) onSwipeRight();
  }, [touchStart, touchEnd, onSwipeLeft, onSwipeRight]);

  return { handleTouchStart, handleTouchEnd };
}

// FEATURE 5.1: Responsive Modal with safe area
interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  fullHeight?: boolean;
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  fullHeight = false,
}: ResponsiveModalProps) {
  const { isMobile, safeAreaInsets } = useMobileView();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div
        className={`w-full rounded-t-lg bg-white shadow-lg transition-all sm:max-w-2xl sm:rounded-lg ${
          fullHeight && isMobile ? 'h-[90vh]' : 'h-auto'
        }`}
        style={{
          paddingTop: isMobile && safeAreaInsets.top ? `${safeAreaInsets.top + 16}px` : undefined,
          paddingRight: isMobile && safeAreaInsets.right ? `${safeAreaInsets.right}px` : undefined,
          paddingBottom:
            isMobile && safeAreaInsets.bottom ? `${safeAreaInsets.bottom + 16}px` : undefined,
          paddingLeft: isMobile && safeAreaInsets.left ? `${safeAreaInsets.left}px` : undefined,
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition-colors hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div
          className={`overflow-y-auto ${fullHeight && isMobile ? 'max-h-[calc(90vh-60px)]' : ''}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// FEATURE 5.1: Responsive Table/Card toggle
interface ResponsiveTableProps {
  columns: { key: string; label: string; align?: 'left' | 'center' | 'right' }[];
  data: any[];
  renderCard?: (item: any) => React.ReactNode;
  renderRow?: (item: any) => React.ReactNode;
  onRowClick?: (item: any) => void;
}

export function ResponsiveTable({
  columns,
  data,
  renderCard,
  renderRow,
  onRowClick,
}: ResponsiveTableProps) {
  const { isMobile } = useMobileView();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isMobile && renderCard) {
    return (
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={item.id || idx} onClick={() => onRowClick?.(item)} className="cursor-pointer">
            {renderCard(item)}
          </div>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-semibold text-slate-700 text-${col.align || 'left'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={item.id || idx}
              onClick={() => onRowClick?.(item)}
              className="cursor-pointer border-b border-slate-200 hover:bg-slate-50"
            >
              {renderRow
                ? renderRow(item)
                : columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-${col.align || 'left'}`}>
                      {item[col.key]}
                    </td>
                  ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// FEATURE 5.2: Expandable card for mobile
interface ExpandableCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'error';
}

export function ExpandableCard({
  title,
  subtitle,
  children,
  isExpanded = false,
  onToggle,
  variant = 'default',
}: ExpandableCardProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  const variants = {
    default: 'border-slate-200 bg-white',
    info: 'border-blue-200 bg-blue-50',
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    error: 'border-red-200 bg-red-50',
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
    onToggle?.();
  };

  return (
    <div className={`rounded-lg border ${variants[variant]}`}>
      <button
        onClick={toggleExpand}
        className="flex min-h-[44px] w-full items-center justify-between p-4 transition-opacity hover:opacity-75 active:scale-95"
        aria-expanded={expanded}
      >
        <div className="text-left">
          <p className="font-semibold text-slate-900">{title}</p>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 flex-shrink-0 text-slate-600" />
        ) : (
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-slate-600" />
        )}
      </button>

      {expanded && <div className="border-t border-slate-200 bg-white p-4">{children}</div>}
    </div>
  );
}

// FEATURE 5.1: Touch-friendly button
interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function TouchButton({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...props
}: TouchButtonProps) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-800',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-700 active:bg-slate-400',
    danger: 'bg-red-600 hover:bg-red-700 text-white active:bg-red-800',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm min-w-[44px] min-h-[44px]',
    md: 'px-4 py-2 text-base min-w-[44px] min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-w-[48px] min-h-[48px]',
  };

  return (
    <button
      className={`rounded-lg font-semibold transition-colors active:scale-95 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// FEATURE 5.2: Input with keyboard accommodation
interface ResponsiveInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function ResponsiveInput({
  label,
  error,
  className,
  onFocus,
  ...props
}: ResponsiveInputProps) {
  const { isKeyboardOpen, keyboardHeight } = useKeyboardAccommodation();

  return (
    <div style={{ marginBottom: isKeyboardOpen ? `${keyboardHeight + 20}px` : '0' }}>
      {label && <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>}
      <input
        onFocus={(e) => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          onFocus?.(e);
        }}
        className={`min-h-[44px] w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// FEATURE 5.3: Swipeable container
interface SwipeableContainerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export function SwipeableContainer({
  children,
  onSwipeLeft,
  onSwipeRight,
  className = '',
}: SwipeableContainerProps) {
  const { handleTouchStart, handleTouchEnd } = useSwipeGesture(onSwipeLeft, onSwipeRight);

  return (
    <div className={className} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {children}
    </div>
  );
}

const mobileResponsiveExports = {
  useMediaQuery,
  useViewport,
  useTouch,
  ResponsiveTable,
  ExpandableCard,
  TouchButton,
  ResponsiveInput,
  SwipeableContainer,
  useMobileView,
  useKeyboardAccommodation,
  useSwipeGesture,
  ResponsiveModal,
};

export { mobileResponsiveExports };
export default mobileResponsiveExports;
