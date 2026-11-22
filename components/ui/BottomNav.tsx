'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface BottomNavItem {
  /** Clave estable para React (usa `href` o `label` si se omite). */
  key?: string;
  /** Ruta real. Si se omite, se renderiza un botón que llama a `onSelect`. */
  href?: string;
  /** Acción para pestañas internas de la app principal. */
  onSelect?: () => void;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  /** Marca explícita para pestañas internas (sin URL propia). */
  active?: boolean;
  /** ARIA label para accesibilidad (opcional, usa label por defecto) */
  ariaLabel?: string;
}

interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
}

const itemClass = (isActive: boolean) =>
  `bottom-nav-item flex flex-col items-center justify-center gap-1.5 p-2 min-w-[72px] min-h-[72px] transition-all duration-200 touch-manipulation ${
    isActive
      ? 'text-brand-400 bg-brand-500/10 border-t-2 border-brand-400'
      : 'text-slate-400 hover:text-slate-200 active:scale-95'
  }`;

function ItemContent({ item, isActive }: { item: BottomNavItem; isActive: boolean }) {
  return (
    <>
      <div className={`relative transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
        {isActive && item.activeIcon ? item.activeIcon : item.icon}
        {isActive && (
          <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-400" />
        )}
      </div>
      <span className={`whitespace-nowrap font-medium ${isActive ? 'text-xs' : 'text-[11px]'}`}>
        {item.label}
      </span>
    </>
  );
}

export function BottomNav({ items, className = '' }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={`mobile-bottom-nav ${className}`}
      aria-label="Navegación principal móvil"
      role="navigation"
    >
      {items.map((item) => {
        const isActive =
          item.active ??
          (item.href ? pathname === item.href || pathname.startsWith(`${item.href}/`) : false);
        const key = item.key ?? item.href ?? item.label;
        const ariaLabel = item.ariaLabel || item.label;

        if (item.href) {
          return (
            <Link
              key={key}
              href={item.href}
              className={itemClass(isActive)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={ariaLabel}
            >
              <ItemContent item={item} isActive={isActive} />
            </Link>
          );
        }

        return (
          <button
            key={key}
            type="button"
            onClick={item.onSelect}
            className={itemClass(isActive)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={ariaLabel}
            aria-pressed={isActive}
          >
            <ItemContent item={item} isActive={isActive} />
          </button>
        );
      })}
    </nav>
  );
}
