/**
 * Comprehensive caching strategies for performance optimization
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
  lastAccessed: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of entries
  serialize?: boolean // Whether to serialize data
}

/**
 * In-memory cache with LRU eviction
 */
export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private accessOrder = new Map<string, number>()
  private accessCounter = 0
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutes
  private readonly maxSize: number
  private cleanupInterval?: NodeJS.Timeout

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // Cleanup every minute
  }

  /**
   * Set cache entry
   */
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.defaultTTL,
      hits: 0,
      lastAccessed: now
    }

    // If cache is full, remove LRU entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    this.cache.set(key, entry)
    this.accessOrder.set(key, ++this.accessCounter)
  }

  /**
   * Get cache entry
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    
    // Check if expired
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      this.accessOrder.delete(key)
      return null
    }

    // Update access statistics
    entry.hits++
    entry.lastAccessed = now
    this.accessOrder.set(key, ++this.accessCounter)

    return entry.data
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    this.accessOrder.delete(key)
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder.clear()
    this.accessCounter = 0
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    memoryUsage: number
    oldestEntry: number
    newestEntry: number
  } {
    const entries = Array.from(this.cache.values())
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0)
    const totalAccesses = entries.length > 0 ? totalHits / entries.length : 0

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalAccesses > 0 ? totalHits / totalAccesses : 0,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null
    let lruAccess = Infinity

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < lruAccess) {
        lruAccess = accessTime
        lruKey = key
      }
    }

    if (lruKey) {
      this.delete(lruKey)
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.delete(key))
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let size = 0
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2 // UTF-16 characters
      size += JSON.stringify(entry).length * 2
    }
    return size
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.clear()
  }
}

/**
 * Redis-like cache interface for future Redis integration
 */
export interface RedisLikeCache {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  del(key: string): Promise<boolean>
  exists(key: string): Promise<boolean>
  expire(key: string, ttl: number): Promise<boolean>
  keys(pattern: string): Promise<string[]>
  flushall(): Promise<void>
}

/**
 * Cache manager with multiple cache layers
 */
export class CacheManager {
  private l1Cache: MemoryCache // Fast in-memory cache
  private l2Cache?: RedisLikeCache // Optional Redis cache
  private cacheHits = 0
  private cacheMisses = 0

  constructor(options: {
    l1Options?: CacheOptions
    l2Cache?: RedisLikeCache
  } = {}) {
    this.l1Cache = new MemoryCache(options.l1Options)
    this.l2Cache = options.l2Cache
  }

  /**
   * Get value from cache (L1 first, then L2)
   */
  async get<T>(key: string): Promise<T | null> {
    // Try L1 cache first
    const l1Result = this.l1Cache.get(key)
    if (l1Result !== null) {
      this.cacheHits++
      return l1Result as T
    }

    // Try L2 cache if available
    if (this.l2Cache) {
      const l2Result = await this.l2Cache.get(key)
      if (l2Result !== null) {
        // Promote to L1 cache
        const parsed = JSON.parse(l2Result) as T
        this.l1Cache.set(key, parsed)
        this.cacheHits++
        return parsed
      }
    }

    this.cacheMisses++
    return null
  }

  /**
   * Set value in both cache layers
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Set in L1 cache
    this.l1Cache.set(key, value, ttl)

    // Set in L2 cache if available
    if (this.l2Cache) {
      await this.l2Cache.set(key, JSON.stringify(value), ttl)
    }
  }

  /**
   * Delete from both cache layers
   */
  async delete(key: string): Promise<boolean> {
    const l1Deleted = this.l1Cache.delete(key)
    let l2Deleted = false

    if (this.l2Cache) {
      l2Deleted = await this.l2Cache.del(key)
    }

    return l1Deleted || l2Deleted
  }

  /**
   * Check if key exists in any cache layer
   */
  async has(key: string): Promise<boolean> {
    if (this.l1Cache.has(key)) {
      return true
    }

    if (this.l2Cache) {
      return await this.l2Cache.exists(key)
    }

    return false
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    await this.set(key, value, ttl)
    return value
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // For L1 cache, we need to iterate through keys
    // This is not efficient, but necessary without Redis
    
    if (this.l2Cache) {
      const keys = await this.l2Cache.keys(pattern)
      await Promise.all(keys.map(key => this.delete(key)))
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    l1Stats: any
    hitRate: number
    totalRequests: number
  } {
    const totalRequests = this.cacheHits + this.cacheMisses
    return {
      l1Stats: this.l1Cache.getStats(),
      hitRate: totalRequests > 0 ? this.cacheHits / totalRequests : 0,
      totalRequests
    }
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.l1Cache.clear()
    if (this.l2Cache) {
      await this.l2Cache.flushall()
    }
    this.cacheHits = 0
    this.cacheMisses = 0
  }
}

/**
 * Specialized caches for different data types
 */

// User profile cache
export const userProfileCache = new MemoryCache({
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 500
})

// Request data cache
export const requestCache = new MemoryCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000
})

// Lecturer data cache
export const lecturerCache = new MemoryCache({
  ttl: 15 * 60 * 1000, // 15 minutes
  maxSize: 200
})

// AI generation cache (longer TTL for expensive operations)
export const aiCache = new MemoryCache({
  ttl: 60 * 60 * 1000, // 1 hour
  maxSize: 100
})

// Static data cache (departments, etc.)
export const staticDataCache = new MemoryCache({
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 50
})

/**
 * Cache key generators
 */
export const cacheKeys = {
  userProfile: (userId: string) => `user:profile:${userId}`,
  userRequests: (userId: string, page = 0) => `user:requests:${userId}:${page}`,
  lecturerProfile: (lecturerId: string) => `lecturer:profile:${lecturerId}`,
  lecturerRequests: (lecturerId: string, status?: string) => 
    `lecturer:requests:${lecturerId}:${status || 'all'}`,
  requestDetails: (requestId: string) => `request:details:${requestId}`,
  aiGeneration: (prompt: string, userId: string) => 
    `ai:generation:${Buffer.from(prompt).toString('base64').slice(0, 50)}:${userId}`,
  departments: () => 'static:departments',
  lecturersByDepartment: (department: string) => `lecturers:department:${department}`,
  paymentDetails: (paymentId: string) => `payment:details:${paymentId}`,
  notifications: (userId: string) => `notifications:${userId}`,
  auditLogs: (userId: string, page = 0) => `audit:logs:${userId}:${page}`
}

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  // Invalidate user-related caches
  invalidateUser: async (userId: string) => {
    await Promise.all([
      userProfileCache.delete(cacheKeys.userProfile(userId)),
      requestCache.delete(cacheKeys.userRequests(userId)),
      requestCache.delete(cacheKeys.notifications(userId))
    ])
  },

  // Invalidate request-related caches
  invalidateRequest: async (requestId: string, studentId: string, lecturerIds: string[]) => {
    await Promise.all([
      requestCache.delete(cacheKeys.requestDetails(requestId)),
      requestCache.delete(cacheKeys.userRequests(studentId)),
      ...lecturerIds.map(id => requestCache.delete(cacheKeys.lecturerRequests(id)))
    ])
  },

  // Invalidate lecturer-related caches
  invalidateLecturer: async (lecturerId: string) => {
    await Promise.all([
      lecturerCache.delete(cacheKeys.lecturerProfile(lecturerId)),
      requestCache.delete(cacheKeys.lecturerRequests(lecturerId))
    ])
  }
}

/**
 * Cache warming strategies
 */
export const cacheWarming = {
  // Warm up user profile cache
  warmUserProfile: async (userId: string, profileData: any) => {
    userProfileCache.set(cacheKeys.userProfile(userId), profileData)
  },

  // Warm up static data
  warmStaticData: async () => {
    // This would typically fetch and cache departments, etc.
    // Implementation depends on your data structure
  },

  // Warm up frequently accessed lecturer data
  warmPopularLecturers: async (lecturerIds: string[]) => {
    // Implementation would fetch and cache popular lecturer profiles
  }
}

/**
 * Cache middleware for API routes
 */
export function withCache<T>(
  cache: MemoryCache<T>,
  keyGenerator: (...args: any[]) => string,
  ttl?: number
) {
  return function cacheMiddleware(
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(...args)
      
      // Try to get from cache
      const cached = cache.get(cacheKey)
      if (cached !== null) {
        return cached
      }

      // Execute original method
      const result = await method.apply(this, args)
      
      // Cache the result
      cache.set(cacheKey, result, ttl)
      
      return result
    }

    return descriptor
  }
}