'use client';

interface TouchTargetProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: React.ReactNode;
  onPress?: () => void;
  minSize?: number;
  haptic?: boolean;
}

export function TouchTarget({
  children,
  onPress,
  minSize = 48,
  haptic = true,
  className = '',
  style,
  onPointerDown,
  ...buttonProps
}: TouchTargetProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (haptic && event.pointerType === 'touch' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(15);
        }
      }}
      style={{ ...style, minWidth: minSize, minHeight: minSize }}
      className={`touch-target group relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:scale-[0.95] active:opacity-[0.8] transition-transform duration-150 ease-[cubic-bezier(0.4,0,0,0.2,1)] ${className}`}
      {...buttonProps}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-white/[0.05] opacity-0 transition-opacity duration-[150ms] ease-[cubic-bezier(0.4,0,0,0.2,1)] group-hover:opacity-100 group-focusvisible:opacity-100"></span>
      {children}
    </button>
  );
}
