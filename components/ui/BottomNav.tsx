'use client';

import React from 'react';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function BottomNav({ items, activeId = '', onSelect, className = '' }: BottomNavProps) {
  return (
    <nav className={`mobile-bottom-nav ${className}`} aria-label="Navegación principal">
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`bottom-nav-item flex-col gap-1 p-2 text-xs w-16 h-16 ${isActive ? 'text-brand-400 bg-brand-500/10 border border-brand-500/20' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && item.activeIcon ? item.activeIcon : item.icon}
            <span className={isActive ? 'text-xs font-medium' : 'text-[10px] font-medium'}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}