// src/lib/utils/cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: Set<string>;
}

class SmartCache {
  private cache = new Map<string, CacheEntry<any>>();
  private tagIndex = new Map<string, Set<string>>(); // tag -> set of cache keys

  /**
   * Get cached data or fetch and cache if not found/expired
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
      ttl: number; // Time to live in milliseconds
      tags?: string[]; // Tags for invalidation
    }
  ): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();

    // Check if cache hit and not expired
    if (entry && (now - entry.timestamp) < entry.ttl) {
      console.log(`[Cache] HIT: ${key} (age: ${now - entry.timestamp}ms)`);
      return entry.data;
    }

    // Cache miss or expired - fetch new data
    console.log(`[Cache] MISS: ${key} - fetching...`);
    try {
      const data = await fetchFn();
      
      // Store in cache with tags
      const tags = new Set(options.tags || []);
      this.cache.set(key, {
        data,
        timestamp: now,
        ttl: options.ttl,
        tags
      });

      // Update tag index
      if (options.tags) {
        for (const tag of options.tags) {
          if (!this.tagIndex.has(tag)) {
            this.tagIndex.set(tag, new Set());
          }
          this.tagIndex.get(tag)!.add(key);
        }
      }

      console.log(`[Cache] STORED: ${key} (ttl: ${options.ttl}ms) tags: [${options.tags?.join(', ') || 'none'}]`);
      return data;
    } catch (error) {
      // If fetch fails and we have expired data, return it
      if (entry) {
        console.warn(`[Cache] FETCH FAILED for ${key}, returning stale data:`, error);
        return entry.data;
      }
      throw error;
    }
  }

  /**
   * Invalidate cache entries by tag
   */
  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;

    let invalidatedCount = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) {
        invalidatedCount++;
      }
    }

    // Clean up tag index
    this.tagIndex.delete(tag);
    
    console.log(`[Cache] INVALIDATED ${invalidatedCount} entries with tag: ${tag}`);
    return invalidatedCount;
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      // Remove from tag index
      for (const tag of entry.tags) {
        const tagKeys = this.tagIndex.get(tag);
        if (tagKeys) {
          tagKeys.delete(key);
          if (tagKeys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
    }

    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`[Cache] INVALIDATED key: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > entry.ttl) {
        this.invalidate(key);
        cleanedCount++;
      }
    }

    console.log(`[Cache] CLEANUP: Removed ${cleanedCount} expired entries`);
    return cleanedCount;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      totalEntries: this.cache.size,
      totalTags: this.tagIndex.size,
      memoryUsage: JSON.stringify([...this.cache.entries()]).length // Rough estimate
    };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    console.log('[Cache] CLEARED all entries');
  }
}

// Global cache instance
export const cache = new SmartCache();

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  VERY_SHORT: 1 * 60 * 1000,      // 1 minute
  SHORT: 5 * 60 * 1000,           // 5 minutes  
  MEDIUM: 15 * 60 * 1000,         // 15 minutes
  LONG: 60 * 60 * 1000,           // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Cache tag constants for invalidation
export const CacheTags = {
  ROOM: (roomId: string) => `room:${roomId}`,
  STUDENT: (studentId: string) => `student:${studentId}`,
  CHATBOT: (chatbotId: string) => `chatbot:${chatbotId}`,
  TEACHER: (teacherId: string) => `teacher:${teacherId}`,
  ROOM_MEMBERSHIPS: (roomId: string) => `memberships:${roomId}`,
  STUDENT_ROOMS: (studentId: string) => `student-rooms:${studentId}`,
  ROOM_CHATBOTS: (roomId: string) => `room-chatbots:${roomId}`,
} as const;

// Auto-cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 10 * 60 * 1000);
}