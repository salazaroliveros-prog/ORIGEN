'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface SentinelIOTDashboardProps {
  className?: string;
}

export function SentinelIOTDashboard({ className }: SentinelIOTDashboardProps) {
  return (
    <div className={`min-h-screen bg-slate-950 p-6 ${className}`}>
      <Card variant='glass-l2' className='my-8'>
        <h2 className='text-xl font-bold text-slate-100'>Sentinel Dashboard</h2>
        <p className='text-slate-400 text-sm'>IoT Threat Intelligence</p>
      </Card>
      <Card variant='glass-l1' className='p-6'>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <p className='text-slate-400 text-sm mb-1'>Total</p>
            <p className='text-2xl font-bold text-slate-100'>128</p>
          </div>
          <div>
            <p className='text-slate-400 text-sm mb-1'>Critical</p>
            <p className='text-2xl font-bold text-red-400'>12</p>
          </div>
        </div>
      </Card>
      <div className='mt-6'>
        <Button variant='glass' size='md' className='glow-primary'>
          Refresh
        </Button>
      </div>
    </div>
  );
}