/**
 * Performance monitoring hooks for React components
 * Tracks render time, memoization, and performance metrics
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Hook to measure component render time
 * Useful for identifying performance bottlenecks
 */
export function useRenderTime(componentName: string): void {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;

    if (process.env.NODE_ENV === 'development') {
      const renderTime = performance.now();
      return () => {
        const endTime = performance.now();
        console.debug(
          `[${componentName}] Render #${renderCount.current} took ${(endTime - renderTime).toFixed(2)}ms`
        );
      };
    }
  });
}

/**
 * Hook to track when a component re-renders
 */
export function useWhyDidYouUpdate(name: string, props: any): void {
  const previousProps = useRef<any>();

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.debug(`[${name}] Props changed:`, changedProps);
      }
    }

    previousProps.current = props;
  }, [props, name]);
}

/**
 * Hook to measure function execution time
 */
export function useMeasure<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return useCallback(
    (...args: any[]) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();

      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${name}] Execution time: ${(end - start).toFixed(2)}ms`);
      }

      return result;
    },
    [fn, name]
  ) as T;
}

/**
 * Hook to track memory usage (rough estimate)
 */
export function useMemoryWarning(threshold: number = 50): void {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && (performance as any).memory) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);
        const percent = Math.round((usedMB / limitMB) * 100);

        if (percent > threshold) {
          console.warn(
            `[Memory] High memory usage: ${usedMB}MB / ${limitMB}MB (${percent}%)`
          );
        }
      };

      const interval = setInterval(checkMemory, 30000); // Check every 30s
      return () => clearInterval(interval);
    }
  }, [threshold]);
}

/**
 * Hook to measure list rendering performance
 * Useful for virtual scrolling optimization
 */
export function useLargeListPerformance<T>(
  items: T[],
  itemsPerPage: number = 25
): {
  shouldVirtualize: boolean;
  estimatedTotalHeight: number;
  itemHeight: number;
} {
  const estimateItemHeight = useMemo(() => {
    // Estimate item height based on content (adjust as needed)
    return 80; // pixels, default row height
  }, []);

  return useMemo(
    () => ({
      shouldVirtualize: items.length > itemsPerPage * 4, // Virtualize if > 4 pages
      estimatedTotalHeight: items.length * estimateItemHeight,
      itemHeight: estimateItemHeight,
    }),
    [items.length, itemsPerPage, estimateItemHeight]
  );
}

/**
 * Hook to log component lifecycle
 */
export function useLifecycleLog(componentName: string): void {
  useEffect(() => {
    console.debug(`[${componentName}] Mounted`);
    return () => console.debug(`[${componentName}] Unmounted`);
  }, [componentName]);

  useEffect(() => {
    console.debug(`[${componentName}] Updated`);
  });
}
