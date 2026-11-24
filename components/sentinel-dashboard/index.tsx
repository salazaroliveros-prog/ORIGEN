'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface SentinelIOTDashboardProps {
  className?: string;
}

export function SentinelIOTDashboard({ className }: SentinelIOTDashboardProps) {
  return (
    <div className={`min-h-screen overflow-x-hidden bg-slate-950 ${className}`}>
      <Card variant="outlined" className="my-8">
        <h2 className="text-xl font-bold text-slate-100">Sentinel Dashboard</h2>
        <p className="text-sm text-slate-400">IoT Threat Intelligence</p>
      </Card>
      <Card variant="outlined" className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-sm text-slate-400">Total</p>
            <p className="text-2xl font-bold text-slate-100">128</p>
          </div>
          <div>
            <p className="mb-1 text-sm text-slate-400">Critical</p>
            <p className="text-2xl font-bold text-red-400">12</p>
          </div>
        </div>
      </Card>
      <div className="mt-6">
        <Button variant="primary" size="md" className="glow-primary">
          Refresh
        </Button>
      </div>
    </div>
  );
}
