'use client';

import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  actions,
  icon,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {icon && <span className="text-sm">{icon}</span>}
          <h2 className="text-sm font-bold text-white">{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-end gap-2">{actions}</div>}
    </div>
  );
}
