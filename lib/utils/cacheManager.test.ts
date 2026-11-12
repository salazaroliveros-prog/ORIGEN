import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { queryCache, createCacheKey, queryDeduplicator } from './cacheManager';

describe('lib/utils/cacheManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    queryCache.clearAll();
    queryDeduplicator.clearPending();
  });

  afterEach(() => {
    vi.useRealTimers();
    queryCache.clearAll();
    queryDeduplicator.clearPending();
  });

  describe('QueryCache', () => {
    it('should set and get a value', () => {
      queryCache.set('key-1', { value: 42 });
      expect(queryCache.get('key-1')).toEqual({ value: 42 });
    });

    it('should return null for missing key', () => {
      expect(queryCache.get('missing')).toBeNull();
    });

    it('should check has() for existing key', () => {
      queryCache.set('key-1', 'data');
      expect(queryCache.has('key-1')).toBe(true);
      expect(queryCache.has('missing')).toBe(false);
    });

    it('should clear a specific key', () => {
      queryCache.set('key-1', 'data');
      queryCache.clear('key-1');
      expect(queryCache.get('key-1')).toBeNull();
    });

    it('should clear all keys', () => {
      queryCache.set('key-1', 'data1');
      queryCache.set('key-2', 'data2');
      queryCache.clearAll();
      expect(queryCache.get('key-1')).toBeNull();
      expect(queryCache.get('key-2')).toBeNull();
    });

    it('should track size', () => {
      expect(queryCache.size()).toBe(0);
      queryCache.set('key-1', 'data1');
      queryCache.set('key-2', 'data2');
      expect(queryCache.size()).toBe(2);
      queryCache.clear('key-1');
      expect(queryCache.size()).toBe(1);
    });

    it('should expire entries after TTL', () => {
      queryCache.set('short-ttl', 'data', 10); // 10ms TTL
      expect(queryCache.get('short-ttl')).toBe('data');
      vi.advanceTimersByTime(20);
      expect(queryCache.get('short-ttl')).toBeNull();
    });

    it('should use default 5 minute TTL', () => {
      queryCache.set('default-ttl', 'data');
      expect(queryCache.get('default-ttl')).toBe('data');
    });
  });

  describe('createCacheKey', () => {
    it('should generate consistent keys', () => {
      const key1 = createCacheKey('projects', { companyId: 'c1' });
      const key2 = createCacheKey('projects', { companyId: 'c1' });
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different filters', () => {
      const key1 = createCacheKey('projects', { companyId: 'c1' });
      const key2 = createCacheKey('projects', { companyId: 'c2' });
      expect(key1).not.toBe(key2);
    });

    it('should include collection name in key', () => {
      const key1 = createCacheKey('projects', { companyId: 'c1' });
      const key2 = createCacheKey('expenses', { companyId: 'c1' });
      expect(key1).not.toBe(key2);
    });
  });

  describe('QueryDeduplicator', () => {
    it('should execute a query and return result', async () => {
      const result = await queryDeduplicator.execute('key-1', async () => 'result-1');
      expect(result).toBe('result-1');
    });

    it('should deduplicate simultaneous queries', async () => {
      let resolveValue: (v: string) => void = () => {};
      const promise = new Promise<string>((resolve) => {
        resolveValue = resolve;
      });

      const p1 = queryDeduplicator.execute('shared-key', () => promise);
      const p2 = queryDeduplicator.execute('shared-key', () => promise);

      expect(queryDeduplicator.getPendingCount()).toBe(1);

      resolveValue('shared-result');
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe('shared-result');
      expect(r2).toBe('shared-result');
      expect(queryDeduplicator.getPendingCount()).toBe(0);
    });

    it('should execute different queries independently', async () => {
      const r1 = await queryDeduplicator.execute('key-a', async () => 'a');
      const r2 = await queryDeduplicator.execute('key-b', async () => 'b');
      expect(r1).toBe('a');
      expect(r2).toBe('b');
    });

    it('should clear pending queries', async () => {
      let _resolveValue: (v: string) => void = () => {};
      const promise = new Promise<string>((resolve) => {
        _resolveValue = resolve;
      });
      void _resolveValue;
      queryDeduplicator.execute('pending-key', () => promise);
      expect(queryDeduplicator.getPendingCount()).toBe(1);
      queryDeduplicator.clearPending();
      expect(queryDeduplicator.getPendingCount()).toBe(0);
    });
  });
});
