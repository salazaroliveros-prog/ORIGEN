'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface BottomNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  active?: boolean;
  onSelect?: () => void;
}

interface BottomNavProps {
  items: BottomNavItem[];
  className?: string;
}

export function BottomNav({ items, className = '' }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={`mobile-bottom-nav ${className}`}
      aria-label="Navegación principal"
    >
      {items.map((item) => {
        const isActive = item.active ?? (pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item flex-col gap-1 p-2 text-xs w-16 h-16 ${isActive ? 'text-brand-400 bg-brand-500/10 border border-brand-500/20' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={(event) => {
              if (!item.onSelect) return;
              event.preventDefault();
              item.onSelect();
            }}
          >
            {isActive && item.activeIcon ? item.activeIcon : item.icon}
            <span className={isActive ? 'text-xs font-medium' : 'text-[10px] font-medium'}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
