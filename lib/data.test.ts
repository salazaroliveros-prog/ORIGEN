import { describe, expect, it } from 'vitest';
import { formatUSD } from './data';

describe('formatUSD', () => {
  it('does not invent a conversion when the exchange rate is missing or invalid', () => {
    expect(formatUSD(100)).toBe('N/D (tipo de cambio)');
    expect(formatUSD(100, 0)).toBe('N/D (tipo de cambio)');
    expect(formatUSD(100, Number.NaN)).toBe('N/D (tipo de cambio)');
  });

  it('converts GTQ using the configured rate', () => {
    expect(formatUSD(782, 7.82)).toBe('$100.00');
  });
});
