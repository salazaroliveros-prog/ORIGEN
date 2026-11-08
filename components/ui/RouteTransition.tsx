'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { useEffect } from 'react';

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    {children}
  );
}
