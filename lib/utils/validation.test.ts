import { describe, it, expect } from 'vitest';

import {
  validationSchemas,
  validateData,
  sanitizeInput,
  safeJSONParse,
  validateCurrencyAmount,
  validateDateRange,
  validateBatch,
} from './validation';

describe('lib/utils/validation', () => {
  describe('validationSchemas', () => {
    it('should validate project code', () => {
      expect(validationSchemas.projectCode.safeParse('OBRA-2026-01').success).toBe(true);
      expect(validationSchemas.projectCode.safeParse('').success).toBe(false);
    });

    it('should validate project name', () => {
      expect(validationSchemas.projectName.safeParse('Casa Test').success).toBe(true);
      expect(validationSchemas.projectName.safeParse('ab').success).toBe(false);
    });

    it('should validate project budget', () => {
      expect(validationSchemas.projectBudget.safeParse(500000).success).toBe(true);
      expect(validationSchemas.projectBudget.safeParse(0).success).toBe(false);
      expect(validationSchemas.projectBudget.safeParse(-100).success).toBe(false);
    });

    it('should validate APU code', () => {
      expect(validationSchemas.apuCode.safeParse('CONC-001').success).toBe(true);
      expect(validationSchemas.apuCode.safeParse('').success).toBe(false);
    });

    it('should validate APU quantity and cost', () => {
      expect(validationSchemas.apuQuantity.safeParse(50).success).toBe(true);
      expect(validationSchemas.apuQuantity.safeParse(0).success).toBe(false);
      expect(validationSchemas.apuUnitCost.safeParse(500).success).toBe(true);
      expect(validationSchemas.apuUnitCost.safeParse(-1).success).toBe(false);
    });

    it('should validate expense amount', () => {
      expect(validationSchemas.expenseAmount.safeParse(100).success).toBe(true);
      expect(validationSchemas.expenseAmount.safeParse(0).success).toBe(false);
    });

    it('should validate expense category', () => {
      expect(
        validationSchemas.expenseCategory.safeParse('Materiales (Cementos, Hierro)').success
      ).toBe(true);
      expect(validationSchemas.expenseCategory.safeParse('Invalid').success).toBe(false);
    });

    it('should validate email', () => {
      expect(validationSchemas.email.safeParse('test@example.com').success).toBe(true);
      expect(validationSchemas.email.safeParse('not-email').success).toBe(false);
    });

    it('should validate phone', () => {
      expect(validationSchemas.phone.safeParse('+502 5555-1234').success).toBe(true);
      expect(validationSchemas.phone.safeParse('123').success).toBe(false);
    });

    it('should validate GPS coordinates', () => {
      expect(validationSchemas.gpsCoordinates.safeParse({ lat: 14.6349, lng: -90.5069 }).success).toBe(
        true
      );
      expect(validationSchemas.gpsCoordinates.safeParse({ lat: 91, lng: 0 }).success).toBe(false);
      expect(validationSchemas.gpsCoordinates.safeParse({ lat: 0, lng: 181 }).success).toBe(false);
    });

    it('should validate currency', () => {
      expect(validationSchemas.currency.safeParse('GTQ').success).toBe(true);
      expect(validationSchemas.currency.safeParse('USD').success).toBe(true);
      expect(validationSchemas.currency.safeParse('EUR').success).toBe(false);
    });
  });

  describe('validateData', () => {
    it('should return valid for matching data', () => {
      const result = validateData(validationSchemas.projectCode, 'OBRA-001');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return invalid with errors for non-matching data', () => {
      const result = validateData(validationSchemas.projectCode, '');
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });

    it('should validate nested object schema', () => {
      const result = validateData(validationSchemas.projectDates, {
        start: '2024-01-01T00:00:00Z',
        end: '2024-12-31T00:00:00Z',
      });
      expect(result.valid).toBe(true);
    });

    it('should invalidate when start date is after end date', () => {
      const result = validateData(validationSchemas.projectDates, {
        start: '2024-12-31T00:00:00Z',
        end: '2024-01-01T00:00:00Z',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim text input', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)script');
    });

    it('should sanitize number input', () => {
      expect(sanitizeInput('123abc', 'number')).toBe('123');
    });

    it('should lowercase email input', () => {
      expect(sanitizeInput('Test@Email.com', 'email')).toBe('test@email.com');
    });
  });

  describe('safeJSONParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJSONParse('{"key": "value"}', null);
      expect(result).toEqual({ key: 'value' });
    });

    it('should return fallback for invalid JSON', () => {
      const result = safeJSONParse('not json', { fallback: true });
      expect(result).toEqual({ fallback: true });
    });
  });

  describe('validateCurrencyAmount', () => {
    it('should validate positive amounts', () => {
      const result = validateCurrencyAmount(100.50);
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(100.5);
    });

    it('should reject negative amounts', () => {
      const result = validateCurrencyAmount(-50);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount cannot be negative');
    });

    it('should reject non-numeric amounts', () => {
      const result = validateCurrencyAmount('abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid amount');
    });

    it('should round to 2 decimal places', () => {
      const result = validateCurrencyAmount(100.555);
      expect(result.valid).toBe(true);
      expect(result.amount).toBe(100.56);
    });
  });

  describe('validateDateRange', () => {
    it('should validate valid date ranges', () => {
      const result = validateDateRange('2024-01-01', '2024-12-31');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid start date', () => {
      const result = validateDateRange('not-a-date', '2024-12-31');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid start date');
    });

    it('should reject invalid end date', () => {
      const result = validateDateRange('2024-01-01', 'not-a-date');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid end date');
    });

    it('should reject start date after end date', () => {
      const result = validateDateRange('2024-12-31', '2024-01-01');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Start date must be before end date');
    });
  });

  describe('validateBatch', () => {
    it('should separate valid and invalid items', () => {
      const items = [1, 2, 3, 4, 5];
      const result = validateBatch(items, (item) => ({
        valid: item > 2,
        errors: item <= 2 ? { value: 'too small' } : ({} as Record<string, string>),
      }));
      expect(result.validItems).toEqual([3, 4, 5]);
      expect(result.invalidItems).toEqual([
        { item: 1, errors: { value: 'too small' } },
        { item: 2, errors: { value: 'too small' } },
      ]);
    });

    it('should handle empty array', () => {
      const result = validateBatch([], () => ({ valid: true }));
      expect(result.validItems).toEqual([]);
      expect(result.invalidItems).toEqual([]);
    });
  });
});
