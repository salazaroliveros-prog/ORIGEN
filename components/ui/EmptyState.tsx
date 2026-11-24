'use client';

import React from 'react';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, subtitle, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-4 py-12 text-center ${className}`}
    >
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
        {icon || (
          <svg className="h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24">
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.707L19 18l-2 2m-7-2v2m0 0V5.806a1 1 0 01.31-.948l2.02-1.01a1 1 0 011.13.105l1.58 1.58c.186.186.293.452.293.748v1.412M4 15a1 1 0 01-1-1V6a1 1 0 011-1h2.586a1 1 0 01.707.293l1.58 1.58a1 1 0 01.707.707L13 8l-2 2H7a1 1 0 01-1-1z"
            />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {subtitle && (
        <p className="mt-1 max-w-[240px] text-center text-sm text-slate-400">{subtitle}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
