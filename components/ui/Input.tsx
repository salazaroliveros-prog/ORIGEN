'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none">
            {leftIcon}
          </div>
        )}
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none">
            {rightIcon}
          </div>
        )}
        <input
          className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary/50 focus:border-transparent transition-all bg-white/[0.03] placeholder-slate-500 ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-white/10 focus:border-white/30'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      {helperText && !error && (
        <p className="text-[10px] text-slate-500">{helperText}</p>
      )}
    </div>
  );
};
