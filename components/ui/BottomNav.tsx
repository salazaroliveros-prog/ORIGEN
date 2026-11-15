'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

interface BottomNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
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
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Button
            key={item.href}
            as="a"
            href={item.href}
            className="bottom-nav-item flex-col gap-1 p-2 text-xs w-16 h-16"
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && item.activeIcon ? item.activeIcon : item.icon}
            <span className={isActive ? 'text-xs font-medium' : 'text-[10px] font-medium'}>
              {item.label}
            </span>
          </Button>
        );
      })}
    </nav>
  );
}
