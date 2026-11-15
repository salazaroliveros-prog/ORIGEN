'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Link } from 'next/navigation';
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
      className={`flex items-center gap-3 px-4 py-3 bg-white/[0.05] border-b border-white/10 sticky top-0 z-50 ${className}`}
    >
      {onBack && (
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0"
        >
          <ChevronDown size={18} />
        </Button>
      )}

      {onMenuToggle && (
        <Button
          variant="outline"
          size="sm"
          onClick={onMenuToggle}
          className="h-8 w-8 p-0"
        >
          <Menu size={20} />
        </Button>
      )}

      <div className="flex-1 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-white truncate">{title}</h1>

        {showSearch && (
          <Input
            type="text"
            placeholder="Buscar..."
            className="w-32 py-2 px-3 text-xs border border-white/10 bg-white/[0.05] focus-visible:ring-brand-400/30"
          />
        )}

        <div className="flex items-center gap-2">
          {userEmail && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.05] border border-white/10">
              <User size={16} className="text-slate-400" />
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-medium text-white">{userName}</span>
                <span className="text-[10px] text-slate-500">{userEmail}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
