'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, ChevronDown, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface MobileHeaderProps {
  title: string;
  onMenuToggle?: () => void;
  onBack?: () => void;
  showSearch?: boolean;
  userName?: string;
  userEmail?: string;
  className?: string;
}

export function MobileHeader({
  title,
  onMenuToggle,
  onBack,
  showSearch = false,
  userName,
  userEmail,
  className = '',
}: MobileHeaderProps) {
  const pathname = usePathname();

  return (
    <div
      className={`sticky top-0 z-50 flex items-center gap-3 border-b border-white/10 bg-white/[0.05] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] ${className}`}
    >
      {onBack && (
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="h-10 min-h-[44px] w-10 min-w-[44px] p-0"
          aria-label="Regresar"
        >
          <ChevronDown size={20} />
        </Button>
      )}

      {onMenuToggle && (
        <Button
          variant="outline"
          size="sm"
          onClick={onMenuToggle}
          className="h-10 min-h-[44px] w-10 min-w-[44px] p-0"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </Button>
      )}

      <div className="flex min-w-0 flex-1 items-center justify-between">
        <h1 className="truncate text-base font-semibold leading-tight text-white">{title}</h1>

        {showSearch && (
          <Input
            type="text"
            placeholder="Buscar..."
            className="w-32 border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm focus-visible:ring-brand-400/30"
            aria-label="Buscar"
          />
        )}

        <div className="ml-2 flex items-center gap-2">
          {userEmail && (
            <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2">
              <User size={18} className="text-slate-400" aria-hidden="true" />
              <div className="hidden min-w-0 flex-col items-end sm:flex">
                <span className="truncate text-xs font-medium text-white">{userName}</span>
                <span className="truncate text-[11px] text-slate-500">{userEmail}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
