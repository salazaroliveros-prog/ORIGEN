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
  return (
    <Tooltip
      id="advanced-tooltip"
      place={place}
      delayShow={delayShow}
      delayHide={delayHide}
      aria-label={text}
      className={className}
    >
      {children}
      <span className="sr-only">{text}</span>
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
    <div className="relative">
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
      className="relative hover:bg-slate-950 transition-colors duration-200"
      onMouseEnter={() => {}}
      onMouseLeave={() => {}}
    >
      {children}
      <AdvancedTooltip text={text} place={place} />
    </div>
  );
}