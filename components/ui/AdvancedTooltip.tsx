'use client';

import React from 'react';
import { Tooltip } from 'react-tooltip';

interface AdvancedTooltipProps {
  children?: React.ReactNode;
  text: string;
  place?: 'top' | 'bottom' | 'left' | 'right';
  delayShow?: number;
  delayHide?: number;
  effect?: 'light' | 'dark';
  className?: string;
}

export function AdvancedTooltip({
  children,
  text,
  place = 'top',
  delayShow = 300,
  delayHide = 100,
  effect = 'light',
  className = '',
}: AdvancedTooltipProps) {
  const tooltipClass = `tooltip-${effect} transition-all duration-200 ease-[cubic-bezier(0.4,0,0,0.2,1)]`;
  const ariaClass = 'sr-only text-xs text-slate-500';

  return (
    <Tooltip
      id="advanced-tooltip"
      place={place}
      delayShow={delayShow}
      delayHide={delayHide}
      aria-label={text}
      className={tooltipClass + ' ' + className}
    >
      {children}
      <span className={ariaClass}>{text}</span>
    </Tooltip>
  );
}

interface TooltipWithIconProps {
  icon: React.ReactNode;
  text: string;
  place?: 'top' | 'bottom';
}

export function TooltipWithIcon({ icon, text, place = 'top' }: TooltipWithIconProps) {
  return (
    <div className="relative inline-block" style={{ display: 'inline-block' }}>
      {icon}
      <AdvancedTooltip text={text} place={place} />
    </div>
  );
}

interface HoverableAreaProps {
  text: string;
  place?: 'top' | 'bottom';
  children: React.ReactNode;
}

export function HoverableArea({ text, place = 'top', children }: HoverableAreaProps) {
  return (
    <div
      className="relative group hover:tooltip-show transition-colors duration-200"
      onMouseEnter={() => {}}
      onMouseLeave={() => {}}
    >
      {children}
      <AdvancedTooltip text={text} place={place} />
    </div>
  );
}