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
}

interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
}

const itemClass = (isActive: boolean) =>
  `bottom-nav-item flex-col gap-1 p-2 text-xs w-16 h-16 ${
    isActive ? 'text-brand-400 bg-brand-500/10 border border-brand-500/20' : ''
  }`;

function ItemContent({ item, isActive }: { item: BottomNavItem; isActive: boolean }) {
  return (
    <>
      {isActive && item.activeIcon ? item.activeIcon : item.icon}
      <span className={isActive ? 'text-xs font-medium' : 'text-[10px] font-medium'}>
        {item.label}
      </span>
    </>
  );
}

export function BottomNav({ items, className = '' }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className={`mobile-bottom-nav ${className}`} aria-label="Navegación principal">
      {items.map((item) => {
        const isActive =
          item.active ??
          (item.href ? pathname === item.href || pathname.startsWith(`${item.href}/`) : false);
        const key = item.key ?? item.href ?? item.label;

        if (item.href) {
          return (
            <Link
              key={key}
              href={item.href}
              className={itemClass(isActive)}
              aria-current={isActive ? 'page' : undefined}
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
          >
            <ItemContent item={item} isActive={isActive} />
          </button>
        );
      })}
    </nav>
  );
}
