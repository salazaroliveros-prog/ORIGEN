import { describe, it, expect } from 'vitest';

import { designTokens, sentinelIotDesignTokens, getColorWithOpacity } from './design-tokens';

describe('lib/design-tokens', () => {
  describe('designTokens', () => {
    it('should have color tokens', () => {
      expect(designTokens.colors.brand.primary).toBe('#f59e0b');
      expect(designTokens.colors.success.base).toBe('#10b981');
      expect(designTokens.colors.danger.base).toBe('#ef4444');
    });

    it('should have neutral color scale', () => {
      expect(designTokens.colors.neutral[50]).toBe('#f8fafc');
      expect(designTokens.colors.neutral[900]).toBe('#0f172a');
      expect(designTokens.colors.neutral[950]).toBe('#020617');
    });

    it('should have spacing tokens', () => {
      expect(designTokens.spacing.xs).toBe('0.5rem');
      expect(designTokens.spacing.md).toBe('1rem');
      expect(designTokens.spacing['2xl']).toBe('3rem');
    });

    it('should have typography tokens', () => {
      expect(designTokens.typography.fontFamily.sans).toContain('system-ui');
      expect(designTokens.typography.fontSize.base[0]).toBe('1rem');
      expect(designTokens.typography.fontWeight.bold).toBe('700');
    });

    it('should have radius tokens', () => {
      expect(designTokens.radius.sm).toBe('0.375rem');
      expect(designTokens.radius.full).toBe('9999px');
    });

    it('should have shadow tokens', () => {
      expect(designTokens.shadows.sm).toContain('0 1px 2px');
      expect(designTokens.shadows.glow).toContain('rgba(245, 158, 11, 0.4)');
    });

    it('should have transition tokens', () => {
      expect(designTokens.transitions.fast).toContain('150ms');
      expect(designTokens.transitions.normal).toContain('200ms');
    });

    it('should have touch target tokens', () => {
      expect(designTokens.touch.minSize).toBe('44px');
    });
  });

  describe('sentinelIotDesignTokens', () => {
    it('should have glass variants', () => {
      expect(sentinelIotDesignTokens.glass.l1).toContain('backdrop-blur-sm');
      expect(sentinelIotDesignTokens.glass.darkL1).toContain('backdrop-blur-sm');
    });

    it('should have threat status colors', () => {
      expect(sentinelIotDesignTokens.threatStatus.critical).toContain('bg-red-500/10');
      expect(sentinelIotDesignTokens.threatStatus.low).toContain('bg-green-500/10');
    });

    it('should have threat types', () => {
      expect(sentinelIotDesignTokens.threatTypes.ssh).toContain('bg-slate-950/20');
      expect(sentinelIotDesignTokens.threatTypes.malware).toContain('bg-slate-950/20');
    });

    it('should have chart colors', () => {
      expect(sentinelIotDesignTokens.chartColors.critical).toContain('rgba(239, 68, 68, 0.8)');
      expect(sentinelIotDesignTokens.chartColors.background).toContain('rgba(30, 64, 175, 0.5)');
    });

    it('should have animation durations', () => {
      expect(sentinelIotDesignTokens.animations.fadeIn).toContain('150ms');
      expect(sentinelIotDesignTokens.animations.pulseSlow).toContain('2s');
    });
  });

  describe('getColorWithOpacity', () => {
    it('should convert hex to rgba', () => {
      expect(getColorWithOpacity('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
      expect(getColorWithOpacity('#00ff00', 1)).toBe('rgba(0, 255, 0, 1)');
      expect(getColorWithOpacity('#0000ff', 0)).toBe('rgba(0, 0, 255, 0)');
    });

    it('should handle hex without #', () => {
      expect(getColorWithOpacity('ff0000', 0.3)).toBe('rgba(255, 0, 0, 0.3)');
    });
  });
});
