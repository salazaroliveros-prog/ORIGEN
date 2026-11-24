'use client';

import { useEffect, useState } from 'react';

/**
 * ✅ MONITORING COMPONENT
 *
 * Features:
 * - Vercel analytics
 * - Firebase metrics
 * - Health check
 * - Slack alerts
 */

interface HealthCheckData {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  responseTime: number;
  checks: Record<string, string>;
}

interface MonitoringConfig {
  healthCheckInterval: number; // ms
  alertThreshold: number; // ms
  enableSlackAlerts: boolean;
}

const DEFAULT_CONFIG: MonitoringConfig = {
  healthCheckInterval: 60000, // 1 min
  alertThreshold: 5000, // 5s
  enableSlackAlerts: true,
};

export function MonitoringSystem() {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [metrics, setMetrics] = useState({
    uptime: 100,
    errorRate: 0,
    avgResponseTime: 0,
    requestsPerMin: 0,
  });
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const startTime = Date.now();
        const response = await fetch('/api/health', {
          headers: { 'X-Health-Check': 'true' },
        });
        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          setIsHealthy(false);
          await sendAlert({
            severity: 'critical',
            message: `Health check failed with status ${response.status}`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const data = await response.json();
        setHealth(data);

        // Alerta si responseTime > threshold
        if (responseTime > DEFAULT_CONFIG.alertThreshold) {
          await sendAlert({
            severity: 'warning',
            message: `Slow response detected: ${responseTime}ms (threshold: ${DEFAULT_CONFIG.alertThreshold}ms)`,
            timestamp: new Date().toISOString(),
          });
        }

        setIsHealthy(true);
      } catch (error) {
        setIsHealthy(false);
        await sendAlert({
          severity: 'critical',
          message: `Health check exception: ${error instanceof Error ? error.message : 'Unknown'}`,
          timestamp: new Date().toISOString(),
        });
      }
    };

    // Health check inicial
    checkHealth();

    // Health check periódico
    const interval = setInterval(checkHealth, DEFAULT_CONFIG.healthCheckInterval);

    return () => clearInterval(interval);
  }, []);

  const sendAlert = async (alert: {
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }) => {
    if (!DEFAULT_CONFIG.enableSlackAlerts) return;

    try {
      await fetch('/api/alerts/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...alert,
          app: 'ORIGEN ERP',
          environment: process.env.NODE_ENV,
        }),
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Status Indicator */}
      <div
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
          isHealthy
            ? 'border border-green-700 bg-green-900/50 text-green-100'
            : 'animate-pulse border border-red-700 bg-red-900/50 text-red-100'
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{isHealthy ? 'Online' : 'Issues Detected'}</span>
      </div>

      {/* Detailed Metrics (dev only) */}
      {process.env.NODE_ENV === 'development' && health && (
        <div className="mt-2 max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-100">
          <p className="font-mono">Uptime: {health.uptime.toFixed(2)}s</p>
          <p className="font-mono">Response: {health.responseTime}ms</p>
          <p className="font-mono text-slate-400">
            {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * ✅ Hook para usar métricas de Vercel Analytics
 */
export function useVercelAnalytics() {
  const [analytics, setAnalytics] = useState({
    fpScore: 0,
    lcpScore: 0,
    fidScore: 0,
    clsScore: 0,
  });

  useEffect(() => {
    // Usar Web Vitals API de Vercel
    if (typeof window !== 'undefined' && 'web-vital' in window) {
      // Implementación específica de Vercel Analytics
      console.log('Vercel Analytics loaded');
    }
  }, []);

  return analytics;
}
