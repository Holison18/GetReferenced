// Monitoring and Analytics Configuration

export interface MetricData {
  name: string
  value: number
  tags?: Record<string, string>
  timestamp?: Date
}

export interface ErrorData {
  message: string
  stack?: string
  context?: Record<string, any>
  user_id?: string
  request_id?: string
  timestamp?: Date
}

class MonitoringService {
  private isProduction = process.env.NODE_ENV === 'production'

  // Performance monitoring
  async trackMetric(metric: MetricData) {
    if (!this.isProduction) {
      console.log('📊 Metric:', metric)
      return
    }

    try {
      // In production, send to monitoring service (e.g., DataDog, New Relic)
      // await this.sendToMonitoringService(metric)
      
      // For now, log to console and could be picked up by log aggregation
      console.log(JSON.stringify({
        type: 'metric',
        ...metric,
        timestamp: metric.timestamp || new Date()
      }))
    } catch (error) {
      console.error('Failed to track metric:', error)
    }
  }

  // Error tracking
  async trackError(error: ErrorData) {
    try {
      // Log error with structured format
      console.error(JSON.stringify({
        type: 'error',
        ...error,
        timestamp: error.timestamp || new Date()
      }))

      // In production, send to error tracking service (e.g., Sentry)
      if (this.isProduction && process.env.SENTRY_DSN) {
        // Sentry integration would go here
        // Sentry.captureException(error)
      }
    } catch (trackingError) {
      console.error('Failed to track error:', trackingError)
    }
  }

  // Business metrics
  async trackUserAction(action: string, userId: string, metadata?: Record<string, any>) {
    await this.trackMetric({
      name: 'user_action',
      value: 1,
      tags: {
        action,
        user_id: userId,
        ...metadata
      }
    })
  }

  async trackRequestCreated(purpose: string, amount: number) {
    await this.trackMetric({
      name: 'request_created',
      value: 1,
      tags: { purpose }
    })

    await this.trackMetric({
      name: 'revenue_potential',
      value: amount,
      tags: { purpose }
    })
  }

  async trackPaymentProcessed(amount: number, success: boolean) {
    await this.trackMetric({
      name: 'payment_processed',
      value: 1,
      tags: { success: success.toString() }
    })

    if (success) {
      await this.trackMetric({
        name: 'revenue_actual',
        value: amount
      })
    }
  }

  async trackAILetterGeneration(duration: number, success: boolean) {
    await this.trackMetric({
      name: 'ai_letter_generation',
      value: 1,
      tags: { success: success.toString() }
    })

    await this.trackMetric({
      name: 'ai_generation_duration',
      value: duration,
      tags: { success: success.toString() }
    })
  }

  async trackNotificationSent(channel: string, success: boolean) {
    await this.trackMetric({
      name: 'notification_sent',
      value: 1,
      tags: { channel, success: success.toString() }
    })
  }

  // Performance tracking
  async trackApiResponse(endpoint: string, method: string, duration: number, status: number) {
    await this.trackMetric({
      name: 'api_response_time',
      value: duration,
      tags: {
        endpoint,
        method,
        status: status.toString(),
        status_class: `${Math.floor(status / 100)}xx`
      }
    })
  }

  async trackDatabaseQuery(table: string, operation: string, duration: number) {
    await this.trackMetric({
      name: 'database_query_time',
      value: duration,
      tags: { table, operation }
    })
  }

  // System health metrics
  async trackSystemHealth() {
    const memoryUsage = process.memoryUsage()
    
    await this.trackMetric({
      name: 'memory_usage_heap',
      value: memoryUsage.heapUsed / 1024 / 1024 // MB
    })

    await this.trackMetric({
      name: 'memory_usage_total',
      value: memoryUsage.heapTotal / 1024 / 1024 // MB
    })

    await this.trackMetric({
      name: 'uptime',
      value: process.uptime()
    })
  }
}

export const monitoring = new MonitoringService()

// Middleware for automatic API monitoring
export function withMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: { name: string; tags?: Record<string, string> }
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    
    try {
      const result = await fn(...args)
      const duration = Date.now() - startTime
      
      await monitoring.trackMetric({
        name: `${context.name}_duration`,
        value: duration,
        tags: { ...context.tags, success: 'true' }
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      await monitoring.trackMetric({
        name: `${context.name}_duration`,
        value: duration,
        tags: { ...context.tags, success: 'false' }
      })
      
      await monitoring.trackError({
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        context: { ...context, args: args.slice(0, 2) } // Limit args to prevent large logs
      })
      
      throw error
    }
  }
}

// Health check utilities
export async function checkSystemHealth() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    checks: {} as Record<string, { status: string; message?: string; duration?: number }>
  }

  // Database check
  try {
    const start = Date.now()
    // Simple database connectivity check would go here
    const duration = Date.now() - start
    checks.checks.database = { status: 'healthy', duration }
  } catch (error) {
    checks.checks.database = { 
      status: 'unhealthy', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }
    checks.status = 'unhealthy'
  }

  // Memory check
  const memoryUsage = process.memoryUsage()
  const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024
  const memoryTotalMB = memoryUsage.heapTotal / 1024 / 1024
  const memoryUsagePercent = (memoryUsedMB / memoryTotalMB) * 100

  if (memoryUsagePercent > 90) {
    checks.checks.memory = { status: 'unhealthy', message: `Memory usage at ${memoryUsagePercent.toFixed(1)}%` }
    checks.status = 'unhealthy'
  } else if (memoryUsagePercent > 75) {
    checks.checks.memory = { status: 'degraded', message: `Memory usage at ${memoryUsagePercent.toFixed(1)}%` }
    if (checks.status === 'healthy') checks.status = 'degraded'
  } else {
    checks.checks.memory = { status: 'healthy' }
  }

  return checks
}