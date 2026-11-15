import { describe, expect, it } from 'vitest';
import { stripUndefined } from './firestorePayload';

describe('stripUndefined', () => {
  it('elimina las propiedades con valor undefined', () => {
    const result = stripUndefined({
      id: 'exp-1',
      amount: 1500,
      receiptPhotoUrl: undefined,
      receiptPhotoDate: undefined,
    });

    expect(result).toEqual({ id: 'exp-1', amount: 1500 });
    expect('receiptPhotoUrl' in result).toBe(false);
    expect('receiptPhotoDate' in result).toBe(false);
  });

  it('conserva null (Firestore lo acepta)', () => {
    const result = stripUndefined({ id: 'exp-1', receiptPhotoUrl: null });

    expect(result).toEqual({ id: 'exp-1', receiptPhotoUrl: null });
    expect('receiptPhotoUrl' in result).toBe(true);
  });

  it('limpia los objetos anidados', () => {
    const result = stripUndefined({
      id: 'att-1',
      gpsCoords: { lat: 14.6, lng: -90.4, accuracy: undefined },
    });

    expect(result).toEqual({ id: 'att-1', gpsCoords: { lat: 14.6, lng: -90.4 } });
  });

  it('limpia los elementos de un arreglo', () => {
    const result = stripUndefined({
      auditTrail: [
        { action: 'create', at: '2026-01-01', note: undefined },
        { action: 'update', at: '2026-01-02', note: 'ok' },
      ],
    });

    expect(result).toEqual({
      auditTrail: [
        { action: 'create', at: '2026-01-01' },
        { action: 'update', at: '2026-01-02', note: 'ok' },
      ],
    });
  });

  it('no modifica el objeto original', () => {
    const original = { id: 'exp-1', receiptPhotoUrl: undefined };

    stripUndefined(original);

    expect('receiptPhotoUrl' in original).toBe(true);
    expect(original.receiptPhotoUrl).toBeUndefined();
  });

  it('deja intactos los valores primitivos y los objetos no planos', () => {
    const date = new Date('2026-01-01');
    const result = stripUndefined({ date, total: 10, active: false, note: '' });

    expect(result.date).toBe(date);
    expect(result.total).toBe(10);
    expect(result.active).toBe(false);
    expect(result.note).toBe('');
  });

  it('devuelve tal cual un arreglo en la raíz', () => {
    const result = stripUndefined([{ id: 'a', x: undefined }, { id: 'b' }]);

    expect(result).toEqual([{ id: 'a' }, { id: 'b' }]);
  });
});
