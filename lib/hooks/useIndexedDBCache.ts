'use client';

import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

interface IndexedDBCacheOptions {
  dbName?: string;
  storeName?: string;
  ttl?: number; // Time to live in milliseconds
}

/**
 * Hook for IndexedDB caching
 * Useful for caching Firestore queries and API responses for offline use
 */
export function useIndexedDBCache<T>(key: string, options: IndexedDBCacheOptions = {}) {
  const {
    dbName = 'origen-erp-cache',
    storeName = 'cache',
    ttl = 5 * 60 * 1000, // 5 minutes default
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);

  // Initialize IndexedDB
  const initDB = useCallback(async (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'key' });
        }
      };
    });
  }, [dbName, storeName]);

  // Get from cache
  const getFromCache = useCallback(async (): Promise<T | null> => {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const entry = request.result as CacheEntry<T> | undefined;

          if (!entry) {
            resolve(null);
            return;
          }

          // Check if expired
          if (entry.expiresAt && Date.now() > entry.expiresAt) {
            // Delete expired entry
            const deleteTransaction = db.transaction([storeName], 'readwrite');
            deleteTransaction.objectStore(storeName).delete(key);
            resolve(null);
            return;
          }

          resolve(entry.data);
        };
      });
    } catch (error) {
      console.error('[IndexedDB] Error reading from cache:', error);
      return null;
    }
  }, [initDB, key, storeName]);

  // Set to cache
  const setToCache = useCallback(
    async (value: T, customTtl?: number) => {
      try {
        const db = await initDB();
        const entry: CacheEntry<T> = {
          data: value,
          timestamp: Date.now(),
          expiresAt: customTtl ? Date.now() + customTtl : Date.now() + ttl,
        };

        return new Promise<void>((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.put({ ...entry, key });

          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      } catch (error) {
        console.error('[IndexedDB] Error writing to cache:', error);
      }
    },
    [initDB, key, storeName, ttl]
  );

  // Clear cache entry
  const clearCache = useCallback(async () => {
    try {
      const db = await initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('[IndexedDB] Error clearing cache:', error);
    }
  }, [initDB, key, storeName]);

  // Clear all cache
  const clearAllCache = useCallback(async () => {
    try {
      const db = await initDB();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('[IndexedDB] Error clearing all cache:', error);
    }
  }, [initDB, storeName]);

  // Load from cache on mount
  useEffect(() => {
    const loadFromCache = async () => {
      setIsLoading(true);
      const cached = await getFromCache();
      if (cached) {
        setData(cached);
        setIsFromCache(true);
      }
      setIsLoading(false);
    };

    loadFromCache();
  }, [getFromCache]);

  return {
    data,
    setData,
    isLoading,
    isFromCache,
    setIsFromCache,
    setToCache,
    clearCache,
    clearAllCache,
  };
}

/**
 * Hook for Firestore query caching
 * Combines IndexedDB caching with Firestore real-time updates
 */
export function useFirestoreCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: IndexedDBCacheOptions = {}
) {
  const cache = useIndexedDBCache<T>(key, options);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsFetching(true);
    setError(null);

    try {
      const freshData = await fetchFn();
      await cache.setToCache(freshData);
      cache.setData(freshData);
      cache.setIsFromCache(false);
    } catch (err) {
      setError(err as Error);
      // If fetch fails but we have cached data, keep it
      if (!cache.data) {
        throw err;
      }
    } finally {
      setIsFetching(false);
    }
  }, [fetchFn, cache]);

  // Fetch fresh data on mount if cache is empty or expired
  useEffect(() => {
    if (!cache.data || cache.isFromCache) {
      refresh();
    }
  }, [cache.data, cache.isFromCache, refresh]);

  return {
    ...cache,
    isFetching,
    error,
    refresh,
  };
}
