'use client';

import { useEffect, useState } from 'react';
import { Activity, Clock, Layout, Zap } from 'lucide-react';

interface Metric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  threshold: { good: number; poor: number };
}

/**
 * Simple Web Vitals indicator using native Performance API
 * No external dependencies required
 */
export function WebVitalsIndicator() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    // Toggle visibility with keyboard shortcut (Ctrl+Shift+V)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Collect Web Vitals using Performance API
    const collectWebVitals = () => {
      const newMetrics: Metric[] = [];

      // CLS - Cumulative Layout Shift
      if (window.PerformanceObserver) {
        try {
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const layoutEntry = entry as any;
              if (!layoutEntry.hadRecentInput) {
                const value = layoutEntry.value || 0;
                const rating = value < 0.1 ? 'good' : value < 0.25 ? 'needs-improvement' : 'poor';
                newMetrics.push({
                  id: 'CLS',
                  name: 'Cumulative Layout Shift',
                  value,
                  rating,
                  threshold: { good: 0.1, poor: 0.25 },
                });
              }
            }
            setMetrics([...newMetrics]);
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          console.log('[WebVitals] CLS observer not supported');
        }

        // LCP - Largest Contentful Paint
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as any;
            const value = lastEntry?.startTime || 0;
            const rating = value < 2500 ? 'good' : value < 4000 ? 'needs-improvement' : 'poor';
            newMetrics.push({
              id: 'LCP',
              name: 'Largest Contentful Paint',
              value,
              rating,
              threshold: { good: 2500, poor: 4000 },
            });
            setMetrics([...newMetrics]);
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          console.log('[WebVitals] LCP observer not supported');
        }

        // FCP - First Contentful Paint
        const perfEntries = performance.getEntriesByName('first-contentful-paint');
        if (perfEntries.length > 0) {
          const value = perfEntries[0].startTime;
          const rating = value < 1800 ? 'good' : value < 3000 ? 'needs-improvement' : 'poor';
          newMetrics.push({
            id: 'FCP',
            name: 'First Contentful Paint',
            value,
            rating,
            threshold: { good: 1800, poor: 3000 },
          });
          setMetrics([...newMetrics]);
        }

        // TTFB - Time to First Byte
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        if (navigation) {
          const value = navigation.responseStart - navigation.requestStart;
          const rating = value < 800 ? 'good' : value < 1800 ? 'needs-improvement' : 'poor';
          newMetrics.push({
            id: 'TTFB',
            name: 'Time to First Byte',
            value,
            rating,
            threshold: { good: 800, poor: 1800 },
          });
          setMetrics([...newMetrics]);
        }
      }
    };

    collectWebVitals();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isVisible || metrics.length === 0) {
    return null;
  }

  const getIcon = (id: string) => {
    switch (id) {
      case 'CLS':
        return <Layout className="h-4 w-4" />;
      case 'FCP':
      case 'LCP':
        return <Clock className="h-4 w-4" />;
      case 'TTFB':
        return <Zap className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'text-emerald-400 bg-emerald-400/20';
      case 'needs-improvement':
        return 'text-amber-400 bg-amber-400/20';
      case 'poor':
        return 'text-rose-400 bg-rose-400/20';
      default:
        return 'text-slate-400 bg-slate-400/20';
    }
  };

  const formatValue = (id: string, value: number) => {
    switch (id) {
      case 'CLS':
        return value.toFixed(3);
      case 'FCP':
      case 'LCP':
      case 'TTFB':
        return `${Math.round(value)}ms`;
      default:
        return value.toFixed(2);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm rounded-xl border border-white/10 bg-slate-900/95 p-4 shadow-xl backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Core Web Vitals</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
      <div className="space-y-2">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${getRatingColor(metric.rating)}`}>
                {getIcon(metric.id)}
              </div>
              <div>
                <p className="text-xs font-medium text-white">{metric.name}</p>
                <p className="text-[10px] text-slate-400">{metric.id}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">
                {formatValue(metric.id, metric.value)}
              </p>
              <p
                className={`text-[10px] font-medium capitalize ${
                  metric.rating === 'good'
                    ? 'text-emerald-400'
                    : metric.rating === 'needs-improvement'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                }`}
              >
                {metric.rating.replace('-', ' ')}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-slate-500">Presiona Ctrl+Shift+V para alternar</p>
    </div>
  );
}

/**
 * Simple Web Vitals badge (always visible in dev)
 */
export function WebVitalsBadge() {
  const [cls, setCLS] = useState<number | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const collectCLS = () => {
      if (window.PerformanceObserver) {
        try {
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const layoutEntry = entry as any;
              if (!layoutEntry.hadRecentInput) {
                setCLS(layoutEntry.value || 0);
              }
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          console.log('[WebVitals] CLS observer not supported');
        }
      }
    };

    collectCLS();
  }, []);

  if (process.env.NODE_ENV !== 'development' || cls === null) {
    return null;
  }

  const rating = cls < 0.1 ? 'good' : cls < 0.25 ? 'needs-improvement' : 'poor';
  const color =
    rating === 'good'
      ? 'text-emerald-400'
      : rating === 'needs-improvement'
        ? 'text-amber-400'
        : 'text-rose-400';

  return (
    <div
      className={`fixed bottom-20 right-4 z-[9998] rounded-full border border-white/10 bg-slate-900/95 px-3 py-1.5 text-xs font-medium backdrop-blur-sm ${color}`}
      title={`CLS: ${cls.toFixed(3)} - ${rating}`}
    >
      CLS: {cls.toFixed(3)}
    </div>
  );
}
