'use client';

import { ViewTransition, addTransitionType } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    addTransitionType('route-change');
  }, [pathname, searchParams?.toString()]);

  return (
    <ViewTransition
      enter={{ 'route-change': 'route-fade', default: 'none' }}
      exit={{ 'route-change': 'route-fade', default: 'none' }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
