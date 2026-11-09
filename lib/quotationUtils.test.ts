import { describe, it, expect } from 'vitest';
import { calculateTotals, validateDiscountValue } from './quotationUtils';

describe('quotationUtils', () => {
  it('rejects empty and out-of-range values for discount', () => {
    expect(validateDiscountValue('')).toBe(false);
    expect(validateDiscountValue('-1')).toBe(false);
    expect(validateDiscountValue('51')).toBe(false);
    expect(validateDiscountValue('10')).toBe(true);
    expect(validateDiscountValue('50')).toBe(true);
  });

  it('calculates subtotal, discount, tax and total correctly', () => {
    const result = calculateTotals(
      [
        { total: 1000 },
        { total: 2000 },
      ],
      10
    );

    expect(result.subtotal).toBe(3000);
    expect(result.discountAmount).toBe(300);
    expect(result.tax).toBe(324);
    expect(result.total).toBe(3024);
  });
});
