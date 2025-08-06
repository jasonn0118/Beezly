import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../dto/store-search.dto';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hitCount: number;
}

@Injectable()
export class StoreCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly GEOSPATIAL_TTL = 2 * 60 * 1000; // 2 minutes (more dynamic)
  private readonly POPULAR_TTL = 15 * 60 * 1000; // 15 minutes (less frequent changes)

  /**
   * Generate cache key from search parameters
   */
  private generateCacheKey(
    method: string,
    params: Record<string, unknown> | object,
  ): string {
    // Sort params for consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce<Record<string, unknown>>((obj, key) => {
        obj[key] = (params as Record<string, unknown>)[key];
        return obj;
      }, {});

    return `store:${method}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Get cached result if available and not expired
   */
  get<T>(method: string, params: Record<string, unknown> | object): T | null {
    const key = this.generateCacheKey(method, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.data as T;
  }

  /**
   * Store result in cache with appropriate TTL
   */
  set<T>(
    method: string,
    params: Record<string, unknown> | object,
    data: T,
    customTtl?: number,
  ): void {
    const key = this.generateCacheKey(method, params);
    let ttl = customTtl || this.DEFAULT_TTL;

    // Use method-specific TTL
    switch (method) {
      case 'findStoresNearLocation':
      case 'advancedStoreSearch':
        ttl = this.GEOSPATIAL_TTL;
        break;
      case 'getPopularStores':
        ttl = this.POPULAR_TTL;
        break;
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      hitCount: 0,
    };

    this.cache.set(key, entry);

    // Cleanup old entries periodically
    this.cleanupExpiredEntries();
  }

  /**
   * Clear cache entries matching pattern
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    totalHits: number;
    memoryUsage: number;
    hitRate: number;
  } {
    let totalHits = 0;
    let totalRequests = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
      totalRequests += entry.hitCount + 1; // +1 for initial set
    }

    return {
      totalEntries: this.cache.size,
      totalHits,
      memoryUsage: JSON.stringify([...this.cache.entries()]).length,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
    };
  }

  /**
   * Remove expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Enhanced cache wrapper for paginated results
   */
  async getOrSetPaginated<T>(
    method: string,
    params: Record<string, unknown> | object,
    fetchFn: () => Promise<PaginatedResponse<T>>,
    customTtl?: number,
  ): Promise<PaginatedResponse<T>> {
    const startTime = Date.now();

    // Try to get from cache
    const cached = this.get<PaginatedResponse<T>>(method, params);
    if (cached) {
      // Add cache hit metadata
      const queryTime = Date.now() - startTime;
      return {
        ...cached,
        meta: {
          ...cached.meta,
          queryTime,
          cacheHit: true,
        },
      };
    }

    // Cache miss - fetch data
    const result = await fetchFn();
    const queryTime = Date.now() - startTime;

    // Add performance metadata
    const enhancedResult: PaginatedResponse<T> = {
      ...result,
      meta: {
        ...result.meta,
        queryTime,
        cacheHit: false,
      },
    };

    // Store in cache
    this.set(method, params, enhancedResult, customTtl);

    return enhancedResult;
  }
}
