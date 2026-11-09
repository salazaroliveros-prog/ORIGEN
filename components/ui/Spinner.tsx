'use client';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeStyles = {
  sm: 'h-3 w-3 border-2',
  md: 'h-6 w-6 border-[3px]',
  lg: 'h-8 w-8 border-4',
};

export function Spinner({ size = 'md', label = 'Cargando', className = '' }: SpinnerProps) {
  return (
    <span role="status" className={`inline-flex items-center justify-center ${className}`}>
      <span
        aria-hidden="true"
        className={`animate-spin rounded-full border-brand-secondary border-t-transparent ${sizeStyles[size]}`}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
