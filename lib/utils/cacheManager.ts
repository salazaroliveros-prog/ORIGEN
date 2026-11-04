/**
 * Query Cache utility for reducing Firestore reads
 * Implements simple in-memory caching with TTL
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Set cache entry with TTL (default 5 minutes)
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Get cache entry if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp >= entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if entry exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const queryCache = new QueryCache();

/**
 * Create cache key from query parameters
 */
export function createCacheKey(collection: string, filters: Record<string, any>): string {
  const filterStr = JSON.stringify(filters);
  return `${collection}:${Buffer.from(filterStr).toString('base64')}`;
}

/**
 * Deduplication wrapper for async queries
 * Prevents duplicate simultaneous requests
 */
class QueryDeduplicator {
  private pending = new Map<string, Promise<any>>();

  /**
   * Execute query with deduplication
   * If same query is in progress, return existing promise
   */
  async execute<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
    // Check if query is already in progress
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // Create new query promise
    const promise = queryFn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Get number of pending queries
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Clear pending queries
   */
  clearPending(): void {
    this.pending.clear();
  }
}

export const queryDeduplicator = new QueryDeduplicator();
