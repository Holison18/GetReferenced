/**
 * Performance monitoring and error tracking utilities
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  tags?: Record<string, string>
  metadata?: Record<string, any>
}

interface ErrorEvent {
  id: string
  message: string
  stack?: string
  timestamp: number
  userId?: string
  url?: string
  userAgent?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, any>
}

interface SystemMetrics {
  memoryUsage: number
  cpuUsage: number
  responseTime: number
  throughput: number
  errorRate: number
  activeUsers: number
}

/**
 * Performance metrics collector
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private errors: ErrorEvent[] = []
  private maxMetrics = 1000
  private maxErrors = 500
  private startTime = Date.now()

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      metadata
    }

    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Send to external monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(metric)
    }
  }

  /**
   * Record an error event
   */
  recordError(error: Error | string, severity: ErrorEvent['severity'] = 'medium', context?: Record<string, any>): void {
    const errorEvent: ErrorEvent = {
      id: this.generateId(),
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      timestamp: Date.now(),
      severity,
      context
    }

    this.errors.push(errorEvent)

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    // Send critical errors immediately
    if (severity === 'critical') {
      this.sendCriticalAlert(errorEvent)
    }

    // Send to external error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorTracking(errorEvent)
    }
  }

  /**
   * Measure function execution time
   */
  measureExecutionTime<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
    const startTime = performance.now()
    
    const result = fn()
    
    if (result instanceof Promise) {
      return result.then(
        (value) => {
          const endTime = performance.now()
          this.recordMetric(`${name}.execution_time`, endTime - startTime, { status: 'success' })
          return value
        },
        (error) => {
          const endTime = performance.now()
          this.recordMetric(`${name}.execution_time`, endTime - startTime, { status: 'error' })
          this.recordError(error, 'medium', { function: name })
          throw error
        }
      )
    } else {
      const endTime = performance.now()
      this.recordMetric(`${name}.execution_time`, endTime - startTime, { status: 'success' })
      return result
    }
  }

  /**
   * Create a timer for manual measurement
   */
  createTimer(name: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      this.recordMetric(`${name}.duration`, endTime - startTime)
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    uptime: number
    totalMetrics: number
    totalErrors: number
    averageResponseTime: number
    errorRate: number
    recentMetrics: PerformanceMetric[]
    recentErrors: ErrorEvent[]
  } {
    const now = Date.now()
    const recentWindow = 5 * 60 * 1000 // 5 minutes

    const recentMetrics = this.metrics.filter(m => now - m.timestamp < recentWindow)
    const recentErrors = this.errors.filter(e => now - e.timestamp < recentWindow)

    const responseTimes = recentMetrics
      .filter(m => m.name.includes('response_time') || m.name.includes('execution_time'))
      .map(m => m.value)

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

    const errorRate = recentMetrics.length > 0
      ? recentErrors.length / recentMetrics.length
      : 0

    return {
      uptime: now - this.startTime,
      totalMetrics: this.metrics.length,
      totalErrors: this.errors.length,
      averageResponseTime,
      errorRate,
      recentMetrics: recentMetrics.slice(-50),
      recentErrors: recentErrors.slice(-20)
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    // In a real implementation, these would come from system monitoring
    const memoryUsage = process.memoryUsage ? process.memoryUsage().heapUsed / 1024 / 1024 : 0
    
    const recentMetrics = this.metrics.filter(m => 
      Date.now() - m.timestamp < 60000 // Last minute
    )

    const responseTimes = recentMetrics
      .filter(m => m.name.includes('response_time'))
      .map(m => m.value)

    const errors = this.errors.filter(e => 
      Date.now() - e.timestamp < 60000 // Last minute
    )

    return {
      memoryUsage,
      cpuUsage: 0, // Would need system monitoring
      responseTime: responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0,
      throughput: recentMetrics.length,
      errorRate: recentMetrics.length > 0 ? errors.length / recentMetrics.length : 0,
      activeUsers: 0 // Would track from session data
    }
  }

  /**
   * Clear old metrics and errors
   */
  cleanup(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000 // 24 hours
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime)
    this.errors = this.errors.filter(e => e.timestamp > cutoffTime)
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async sendToMonitoringService(metric: PerformanceMetric): Promise<void> {
    // Integration with monitoring services like DataDog, New Relic, etc.
    try {
      // Example: await fetch('/api/monitoring/metrics', { method: 'POST', body: JSON.stringify(metric) })
    } catch (error) {
      console.warn('Failed to send metric to monitoring service:', error)
    }
  }

  private async sendToErrorTracking(error: ErrorEvent): Promise<void> {
    // Integration with error tracking services like Sentry, Bugsnag, etc.
    try {
      // Example: await fetch('/api/monitoring/errors', { method: 'POST', body: JSON.stringify(error) })
    } catch (err) {
      console.warn('Failed to send error to tracking service:', err)
    }
  }

  private async sendCriticalAlert(error: ErrorEvent): Promise<void> {
    // Send immediate alerts for critical errors
    try {
      // Integration with alerting systems like PagerDuty, Slack, etc.
      console.error('CRITICAL ERROR:', error)
    } catch (err) {
      console.warn('Failed to send critical alert:', err)
    }
  }
}

/**
 * Web Vitals monitoring for client-side performance
 */
export class WebVitalsMonitor {
  private vitals: Map<string, number> = new Map()

  /**
   * Initialize Web Vitals monitoring
   */
  init(): void {
    if (typeof window === 'undefined') return

    // Largest Contentful Paint
    this.observeLCP()
    
    // First Input Delay
    this.observeFID()
    
    // Cumulative Layout Shift
    this.observeCLS()
    
    // First Contentful Paint
    this.observeFCP()
    
    // Time to First Byte
    this.observeTTFB()
  }

  private observeLCP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        this.vitals.set('LCP', lastEntry.startTime)
        this.reportVital('LCP', lastEntry.startTime)
      })
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
    }
  }

  private observeFID(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.vitals.set('FID', entry.processingStart - entry.startTime)
          this.reportVital('FID', entry.processingStart - entry.startTime)
        })
      })
      
      observer.observe({ entryTypes: ['first-input'] })
    }
  }

  private observeCLS(): void {
    if ('PerformanceObserver' in window) {
      let clsValue = 0
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
            this.vitals.set('CLS', clsValue)
            this.reportVital('CLS', clsValue)
          }
        })
      })
      
      observer.observe({ entryTypes: ['layout-shift'] })
    }
  }

  private observeFCP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (entry.name === 'first-contentful-paint') {
            this.vitals.set('FCP', entry.startTime)
            this.reportVital('FCP', entry.startTime)
          }
        })
      })
      
      observer.observe({ entryTypes: ['paint'] })
    }
  }

  private observeTTFB(): void {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as any
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.requestStart
        this.vitals.set('TTFB', ttfb)
        this.reportVital('TTFB', ttfb)
      }
    }
  }

  private reportVital(name: string, value: number): void {
    // Send to analytics or monitoring service
    performanceMonitor.recordMetric(`web_vitals.${name}`, value, {
      page: window.location.pathname,
      userAgent: navigator.userAgent
    })
  }

  getVitals(): Record<string, number> {
    return Object.fromEntries(this.vitals)
  }
}

/**
 * API performance monitoring middleware
 */
export function withPerformanceMonitoring(
  handler: (req: any, res: any) => Promise<any>
) {
  return async (req: any, res: any) => {
    const startTime = performance.now()
    const endpoint = req.url || 'unknown'
    
    try {
      const result = await handler(req, res)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      performanceMonitor.recordMetric('api.response_time', duration, {
        endpoint,
        method: req.method,
        status: 'success'
      })
      
      return result
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      performanceMonitor.recordMetric('api.response_time', duration, {
        endpoint,
        method: req.method,
        status: 'error'
      })
      
      performanceMonitor.recordError(error as Error, 'medium', {
        endpoint,
        method: req.method
      })
      
      throw error
    }
  }
}

/**
 * Database query performance monitoring
 */
export function withQueryMonitoring<T>(
  queryName: string,
  query: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measureExecutionTime(`db.${queryName}`, query) as Promise<T>
}

/**
 * Memory usage monitoring
 */
export class MemoryMonitor {
  private samples: Array<{ timestamp: number; usage: NodeJS.MemoryUsage }> = []
  private interval?: NodeJS.Timeout

  start(intervalMs = 30000): void {
    this.interval = setInterval(() => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage()
        this.samples.push({
          timestamp: Date.now(),
          usage
        })

        // Keep only last 100 samples
        if (this.samples.length > 100) {
          this.samples.shift()
        }

        // Record metrics
        performanceMonitor.recordMetric('memory.heap_used', usage.heapUsed / 1024 / 1024)
        performanceMonitor.recordMetric('memory.heap_total', usage.heapTotal / 1024 / 1024)
        performanceMonitor.recordMetric('memory.external', usage.external / 1024 / 1024)
        performanceMonitor.recordMetric('memory.rss', usage.rss / 1024 / 1024)
      }
    }, intervalMs)
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
    }
  }

  getStats(): {
    current: NodeJS.MemoryUsage | null
    average: NodeJS.MemoryUsage | null
    peak: NodeJS.MemoryUsage | null
  } {
    if (this.samples.length === 0) {
      return { current: null, average: null, peak: null }
    }

    const current = this.samples[this.samples.length - 1].usage
    
    const average = {
      rss: this.samples.reduce((sum, s) => sum + s.usage.rss, 0) / this.samples.length,
      heapTotal: this.samples.reduce((sum, s) => sum + s.usage.heapTotal, 0) / this.samples.length,
      heapUsed: this.samples.reduce((sum, s) => sum + s.usage.heapUsed, 0) / this.samples.length,
      external: this.samples.reduce((sum, s) => sum + s.usage.external, 0) / this.samples.length,
      arrayBuffers: this.samples.reduce((sum, s) => sum + (s.usage.arrayBuffers || 0), 0) / this.samples.length
    }

    const peak = {
      rss: Math.max(...this.samples.map(s => s.usage.rss)),
      heapTotal: Math.max(...this.samples.map(s => s.usage.heapTotal)),
      heapUsed: Math.max(...this.samples.map(s => s.usage.heapUsed)),
      external: Math.max(...this.samples.map(s => s.usage.external)),
      arrayBuffers: Math.max(...this.samples.map(s => s.usage.arrayBuffers || 0))
    }

    return { current, average, peak }
  }
}

// Singleton instances
export const performanceMonitor = new PerformanceMonitor()
export const webVitalsMonitor = new WebVitalsMonitor()
export const memoryMonitor = new MemoryMonitor()

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  memoryMonitor.start()
  
  // Cleanup old data periodically
  setInterval(() => {
    performanceMonitor.cleanup()
  }, 60 * 60 * 1000) // Every hour
}