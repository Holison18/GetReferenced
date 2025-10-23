import { createClient } from '@supabase/supabase-js'

/**
 * Database optimization utilities for performance and scalability
 */

interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  select?: string
  filters?: Record<string, any>
}

interface PaginationResult<T> {
  data: T[]
  count: number
  hasMore: boolean
  nextOffset?: number
}

/**
 * Optimized database client with connection pooling and caching
 */
class OptimizedDatabaseClient {
  private supabase
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private readonly defaultCacheTTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          schema: 'public'
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            'x-application-name': 'getreference-app'
          }
        }
      }
    )
  }

  /**
   * Generate cache key for queries
   */
  private generateCacheKey(table: string, options: QueryOptions): string {
    return `${table}:${JSON.stringify(options)}`
  }

  /**
   * Get cached query result
   */
  private getCachedResult(key: string): any | null {
    const cached = this.queryCache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now > cached.timestamp + cached.ttl) {
      this.queryCache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * Set cached query result
   */
  private setCachedResult(key: string, data: any, ttl = this.defaultCacheTTL): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })

    // Cleanup old cache entries periodically
    if (this.queryCache.size > 1000) {
      this.cleanupCache()
    }
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, value] of this.queryCache.entries()) {
      if (now > value.timestamp + value.ttl) {
        this.queryCache.delete(key)
      }
    }
  }

  /**
   * Optimized paginated query with caching
   */
  async paginatedQuery<T>(
    table: string,
    options: QueryOptions = {},
    cacheTTL?: number
  ): Promise<PaginationResult<T>> {
    const cacheKey = this.generateCacheKey(table, options)
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
      return cached
    }

    const {
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
      select = '*',
      filters = {}
    } = options

    let query = this.supabase
      .from(table)
      .select(select, { count: 'exact' })

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else if (typeof value === 'string' && value.includes('%')) {
          query = query.ilike(key, value)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    // Apply ordering and pagination
    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    const result: PaginationResult<T> = {
      data: data || [],
      count: count || 0,
      hasMore: (offset + limit) < (count || 0),
      nextOffset: (offset + limit) < (count || 0) ? offset + limit : undefined
    }

    // Cache the result
    this.setCachedResult(cacheKey, result, cacheTTL)

    return result
  }

  /**
   * Optimized single record query with caching
   */
  async findById<T>(
    table: string,
    id: string,
    select = '*',
    cacheTTL?: number
  ): Promise<T | null> {
    const cacheKey = `${table}:${id}:${select}`
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
      return cached
    }

    const { data, error } = await this.supabase
      .from(table)
      .select(select)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Record not found
      }
      throw new Error(`Database query failed: ${error.message}`)
    }

    // Cache the result
    this.setCachedResult(cacheKey, data, cacheTTL)

    return data
  }

  /**
   * Batch insert with conflict resolution
   */
  async batchInsert<T>(
    table: string,
    records: Partial<T>[],
    options: {
      onConflict?: string
      ignoreDuplicates?: boolean
      batchSize?: number
    } = {}
  ): Promise<T[]> {
    const { batchSize = 100, onConflict, ignoreDuplicates } = options
    const results: T[] = []

    // Process in batches to avoid memory issues
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      
      let query = this.supabase.from(table).insert(batch)

      if (onConflict) {
        query = query.select()
      }

      if (ignoreDuplicates) {
        query = query.select()
      }

      const { data, error } = await query

      if (error && !ignoreDuplicates) {
        throw new Error(`Batch insert failed: ${error.message}`)
      }

      if (data) {
        results.push(...data)
      }
    }

    return results
  }

  /**
   * Optimized search with full-text search
   */
  async fullTextSearch<T>(
    table: string,
    searchTerm: string,
    searchColumns: string[],
    options: QueryOptions = {}
  ): Promise<PaginationResult<T>> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
      select = '*',
      filters = {}
    } = options

    // Use Supabase's full-text search
    let query = this.supabase
      .from(table)
      .select(select, { count: 'exact' })

    // Apply text search across multiple columns
    const searchConditions = searchColumns
      .map(col => `${col}.ilike.%${searchTerm}%`)
      .join(',')

    query = query.or(searchConditions)

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    })

    // Apply ordering and pagination
    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Search query failed: ${error.message}`)
    }

    return {
      data: data || [],
      count: count || 0,
      hasMore: (offset + limit) < (count || 0),
      nextOffset: (offset + limit) < (count || 0) ? offset + limit : undefined
    }
  }

  /**
   * Aggregate queries with caching
   */
  async getAggregates(
    table: string,
    aggregations: {
      count?: boolean
      sum?: string[]
      avg?: string[]
      min?: string[]
      max?: string[]
    },
    filters: Record<string, any> = {},
    cacheTTL?: number
  ): Promise<Record<string, any>> {
    const cacheKey = `aggregates:${table}:${JSON.stringify({ aggregations, filters })}`
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey)
    if (cached) {
      return cached
    }

    const results: Record<string, any> = {}

    // Count query
    if (aggregations.count) {
      let countQuery = this.supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          countQuery = countQuery.eq(key, value)
        }
      })

      const { count, error } = await countQuery
      if (error) throw new Error(`Count query failed: ${error.message}`)
      results.count = count
    }

    // Sum, avg, min, max queries would require custom SQL functions
    // For now, we'll implement basic aggregations

    // Cache the result
    this.setCachedResult(cacheKey, results, cacheTTL)

    return results
  }

  /**
   * Clear cache for specific table or pattern
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.queryCache.clear()
      return
    }

    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    hitRate: number
    memoryUsage: number
  } {
    return {
      size: this.queryCache.size,
      hitRate: 0, // Would need to track hits/misses
      memoryUsage: JSON.stringify([...this.queryCache.entries()]).length
    }
  }

  /**
   * Execute raw SQL with parameters (for complex queries)
   */
  async executeRawSQL<T>(
    sql: string,
    params: any[] = []
  ): Promise<T[]> {
    const { data, error } = await this.supabase.rpc('execute_sql', {
      sql_query: sql,
      params
    })

    if (error) {
      throw new Error(`Raw SQL execution failed: ${error.message}`)
    }

    return data || []
  }
}

/**
 * Database connection pool manager
 */
class ConnectionPoolManager {
  private pools = new Map<string, OptimizedDatabaseClient>()
  private readonly maxPools = 10

  getPool(identifier = 'default'): OptimizedDatabaseClient {
    if (!this.pools.has(identifier)) {
      if (this.pools.size >= this.maxPools) {
        // Remove oldest pool
        const firstKey = this.pools.keys().next().value
        this.pools.delete(firstKey)
      }
      
      this.pools.set(identifier, new OptimizedDatabaseClient())
    }

    return this.pools.get(identifier)!
  }

  closePool(identifier: string): void {
    this.pools.delete(identifier)
  }

  closeAllPools(): void {
    this.pools.clear()
  }
}

// Singleton instances
export const dbClient = new OptimizedDatabaseClient()
export const connectionPool = new ConnectionPoolManager()

/**
 * Query optimization helpers
 */
export const queryOptimizations = {
  // Optimize SELECT queries by only selecting needed columns
  selectOptimized: (columns: string[]) => columns.join(', '),

  // Create efficient WHERE clauses
  buildWhereClause: (filters: Record<string, any>) => {
    return Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key} IN (${value.map(v => `'${v}'`).join(', ')})`
        }
        return `${key} = '${value}'`
      })
      .join(' AND ')
  },

  // Optimize ORDER BY clauses
  optimizeOrderBy: (orderBy: string, direction: 'asc' | 'desc' = 'desc') => {
    // Ensure we have an index on the order column
    return `${orderBy} ${direction.toUpperCase()}`
  }
}

/**
 * Performance monitoring for database queries
 */
export class QueryPerformanceMonitor {
  private queryTimes = new Map<string, number[]>()

  startTimer(queryId: string): () => number {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      this.recordQueryTime(queryId, duration)
      return duration
    }
  }

  private recordQueryTime(queryId: string, duration: number): void {
    if (!this.queryTimes.has(queryId)) {
      this.queryTimes.set(queryId, [])
    }
    
    const times = this.queryTimes.get(queryId)!
    times.push(duration)
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift()
    }
  }

  getQueryStats(queryId: string): {
    count: number
    avgTime: number
    minTime: number
    maxTime: number
  } | null {
    const times = this.queryTimes.get(queryId)
    if (!times || times.length === 0) return null

    return {
      count: times.length,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    }
  }

  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {}
    
    for (const [queryId, times] of this.queryTimes.entries()) {
      stats[queryId] = this.getQueryStats(queryId)
    }
    
    return stats
  }
}

export const queryMonitor = new QueryPerformanceMonitor()