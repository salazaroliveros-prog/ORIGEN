import { describe, expect, it } from 'vitest';
import { settleSyncLog } from './useFirebaseSyncStatus';

const pending = {
  id: 'sync-1',
  operation: 'Guardar gasto',
  path: 'expenses/expense-1',
  timestamp: '18:00:00',
  status: 'sincronizando' as const,
};

describe('settleSyncLog', () => {
  it('marks a pending operation completed only after explicit success', () => {
    expect(settleSyncLog([pending], true)).toEqual([
      {
        ...pending,
        status: 'completado',
        details: 'Operación confirmada por Firestore.',
      },
    ]);
  });

  it('marks an operation as error when the operation ends without confirmation', () => {
    expect(settleSyncLog([pending], false)).toEqual([
      {
        ...pending,
        status: 'error',
        details:
          'La operación no se confirmó correctamente. No se registró como sincronización exitosa.',
      },
    ]);
  });

  it('does not rewrite the log when there is no pending operation', () => {
    const logs = [{ ...pending, status: 'completado' as const }];
    expect(settleSyncLog(logs, false)).toBe(logs);
  });
});
