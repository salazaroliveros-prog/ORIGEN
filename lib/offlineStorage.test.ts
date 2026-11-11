import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OfflineQueuePayload } from './types';

import {
  saveOfflineData,
  loadOfflineData,
  getOfflineQueue,
  addOfflineAction,
  removeOfflineAction,
  clearOfflineQueue,
  processOfflineQueue,
} from './offlineStorage';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

describe('lib/offlineStorage', () => {
  const originalWindow = global.window;
  const originalLocalStorage = global.localStorage;
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
    Object.defineProperty(global, 'window', {
      value: { ...originalWindow, localStorage: localStorageMock },
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
    global.localStorage = originalLocalStorage;
    vi.restoreAllMocks();
  });

  describe('saveOfflineData / loadOfflineData', () => {
    it('should save and load data', () => {
      saveOfflineData('test-key', { name: 'test', value: 42 });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'constructerp_test-key',
        JSON.stringify({ name: 'test', value: 42 })
      );
      const loaded = loadOfflineData('test-key', null);
      expect(loaded).toEqual({ name: 'test', value: 42 });
    });

    it('should return fallback for missing key', () => {
      expect(loadOfflineData('missing', 'fallback')).toBe('fallback');
    });

    it('should return fallback for corrupted data', () => {
      vi.mocked(localStorageMock.getItem).mockReturnValue('not-json');
      expect(loadOfflineData('bad', 'fallback')).toBe('fallback');
    });

    it('should do nothing when window is undefined', () => {
      Object.defineProperty(global, 'window', { value: undefined, writable: true, configurable: true });
      expect(() => saveOfflineData('key', 'val')).not.toThrow();
      expect(loadOfflineData('key', 'fb')).toBe('fb');
      Object.defineProperty(global, 'window', {
        value: { ...originalWindow, localStorage: localStorageMock },
        writable: true,
        configurable: true,
      });
    });
  });

  describe('getOfflineQueue', () => {
    it('should return valid queue items', () => {
      const validItem = {
        id: 'queue-1',
        type: 'attendance',
        timestamp: '2024-01-01',
        description: 'Test',
        payload: { data: 1 },
        synced: false,
      };
      vi.mocked(localStorageMock.getItem).mockReturnValue(JSON.stringify([validItem]));
      const queue = getOfflineQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('queue-1');
    });

    it('should filter out invalid items', () => {
      const invalidItem = { id: 'bad', type: 'attendance' }; // missing required fields
      const validItem = {
        id: 'queue-1',
        type: 'attendance',
        timestamp: '2024-01-01',
        description: 'Test',
        payload: { data: 1 },
        synced: false,
      };
      vi.mocked(localStorageMock.getItem).mockReturnValue(JSON.stringify([invalidItem, validItem]));
      const queue = getOfflineQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('queue-1');
    });

    it('should return empty array for missing queue', () => {
      vi.mocked(localStorageMock.getItem).mockReturnValue(null as any);
      expect(getOfflineQueue()).toEqual([]);
    });
  });

  describe('addOfflineAction', () => {
    it('should add action to queue', () => {
      vi.mocked(localStorageMock.getItem).mockReturnValue(JSON.stringify([]));
      const payload: OfflineQueuePayload = { projectId: 'proj-1', employeeId: 'emp-1', date: '2024-01-01', hoursWorked: 8, task: 'Test' };
      const item = addOfflineAction('attendance', payload, 'Test attendance');
      expect(item.type).toBe('attendance');
      expect(item.description).toBe('Test attendance');
      expect(item.synced).toBe(false);
      expect(item.id.startsWith('queue-')).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should prepend to existing queue', () => {
      const payload: OfflineQueuePayload = { projectId: 'proj-1', employeeId: 'emp-1', date: '2024-01-01', hoursWorked: 8, task: 'Test' };
      const existing = [{ id: 'existing', type: 'progress', timestamp: '', description: '', payload, synced: false }];
      vi.mocked(localStorageMock.getItem).mockReturnValue(JSON.stringify(existing));
      const item = addOfflineAction('attendance', payload, 'Test');
      const updated = JSON.parse(vi.mocked(localStorageMock.setItem).mock.calls[0][1]);
      expect(updated[0].id).toBe(item.id);
      expect(updated[1].id).toBe('existing');
    });
  });

  describe('removeOfflineAction', () => {
    it('should remove action from queue', () => {
      const existing = [
        { id: 'remove-me', type: 'attendance', timestamp: '', description: '', payload: {}, synced: false },
        { id: 'keep-me', type: 'progress', timestamp: '', description: '', payload: {}, synced: false },
      ];
      vi.mocked(localStorageMock.getItem).mockReturnValue(JSON.stringify(existing));
      removeOfflineAction('remove-me');
      const updated = JSON.parse(vi.mocked(localStorageMock.setItem).mock.calls[0][1]);
      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBe('keep-me');
    });
  });

  describe('clearOfflineQueue', () => {
    it('should clear the queue', () => {
      clearOfflineQueue();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'constructerp_offline_queue',
        '[]'
      );
    });
  });

  describe('processOfflineQueue', () => {
    it('should process all successful items', async () => {
      const item = {
        id: 'queue-1',
        type: 'attendance',
        timestamp: '2024-01-01',
        description: 'Test',
        payload: {},
        synced: false,
      };
      vi.mocked(localStorageMock.getItem).mockReturnValue(JSON.stringify([item]));

      const handler = vi.fn(() => true);
      const result = await processOfflineQueue(handler);

      expect(result.processed).toBe(1);
      expect(result.remaining).toBe(0);
      expect(handler).toHaveBeenCalledWith(item);
    });

    it('should keep failed items', async () => {
      const item = {
        id: 'queue-1',
        type: 'attendance',
        timestamp: '2024-01-01',
        description: 'Test',
        payload: {},
        synced: false,
      };
      vi.mocked(localStorageMock.getItem).mockReturnValue(JSON.stringify([item]));

      const handler = vi.fn(() => false);
      const result = await processOfflineQueue(handler);

      expect(result.processed).toBe(0);
      expect(result.remaining).toBe(1);
    });

    it('should handle handler exceptions', async () => {
      const item = {
        id: 'queue-1',
        type: 'attendance',
        timestamp: '2024-01-01',
        description: 'Test',
        payload: {},
        synced: false,
      };
      vi.mocked(localStorageMock.getItem).mockReturnValue(JSON.stringify([item]));

      const handler = vi.fn(() => {
        throw new Error('sync failed');
      });
      const result = await processOfflineQueue(handler);

      expect(result.processed).toBe(0);
      expect(result.remaining).toBe(1);
    });

    it('should return empty for empty queue', async () => {
      vi.mocked(localStorageMock.getItem).mockReturnValue(JSON.stringify([]));
      const result = await processOfflineQueue(async () => true);
      expect(result.processed).toBe(0);
      expect(result.remaining).toBe(0);
    });
  });
});
