import { createClient } from '@supabase/supabase-js'

/**
 * Comprehensive audit logging system for security and compliance
 */

interface AuditLogEntry {
  id?: string
  user_id?: string
  user_email?: string
  user_role?: string
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
  session_id?: string
  timestamp?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'auth' | 'data' | 'system' | 'security' | 'payment' | 'notification'
  success: boolean
  error_message?: string
  metadata?: Record<string, any>
}

interface SecurityEvent extends AuditLogEntry {
  threat_type?: 'brute_force' | 'injection' | 'xss' | 'csrf' | 'rate_limit' | 'unauthorized_access'
  risk_score?: number
  blocked?: boolean
}

class AuditLogger {
  private supabase
  private isEnabled: boolean
  private batchSize: number
  private batchTimeout: number
  private logBatch: AuditLogEntry[]
  private batchTimer?: NodeJS.Timeout

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    this.isEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_AUDIT_LOGS === 'true'
    this.batchSize = parseInt(process.env.AUDIT_BATCH_SIZE || '10')
    this.batchTimeout = parseInt(process.env.AUDIT_BATCH_TIMEOUT || '5000')
    this.logBatch = []
    this.startBatchTimer()
  }

  /**
   * Log a general audit event
   */
  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    if (!this.isEnabled) return

    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      id: this.generateId()
    }

    // Add to batch
    this.logBatch.push(auditEntry)

    // If batch is full, flush immediately
    if (this.logBatch.length >= this.batchSize) {
      await this.flushBatch()
    }

    // Log critical events immediately
    if (entry.severity === 'critical') {
      await this.flushBatch()
      await this.sendAlert(auditEntry)
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(action: string, userId?: string, details?: Record<string, any>, success = true, error?: string): Promise<void> {
    await this.log({
      user_id: userId,
      action,
      resource_type: 'authentication',
      details,
      severity: success ? 'low' : 'medium',
      category: 'auth',
      success,
      error_message: error
    })
  }

  /**
   * Log data access events
   */
  async logDataAccess(action: string, resourceType: string, resourceId?: string, userId?: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      severity: 'low',
      category: 'data',
      success: true
    })
  }

  /**
   * Log security events
   */
  async logSecurity(event: Omit<SecurityEvent, 'timestamp' | 'category'>): Promise<void> {
    await this.log({
      ...event,
      category: 'security',
      severity: event.severity || 'high'
    })
  }

  /**
   * Log payment events
   */
  async logPayment(action: string, paymentId: string, userId?: string, amount?: number, success = true, error?: string): Promise<void> {
    await this.log({
      user_id: userId,
      action,
      resource_type: 'payment',
      resource_id: paymentId,
      details: { amount },
      severity: success ? 'medium' : 'high',
      category: 'payment',
      success,
      error_message: error
    })
  }

  /**
   * Log system events
   */
  async logSystem(action: string, details?: Record<string, any>, severity: AuditLogEntry['severity'] = 'low'): Promise<void> {
    await this.log({
      action,
      resource_type: 'system',
      details,
      severity,
      category: 'system',
      success: true
    })
  }

  /**
   * Log notification events
   */
  async logNotification(action: string, userId?: string, channel?: string, success = true, error?: string): Promise<void> {
    await this.log({
      user_id: userId,
      action,
      resource_type: 'notification',
      details: { channel },
      severity: 'low',
      category: 'notification',
      success,
      error_message: error
    })
  }

  /**
   * Flush the current batch to database
   */
  private async flushBatch(): Promise<void> {
    if (this.logBatch.length === 0) return

    try {
      const batch = [...this.logBatch]
      this.logBatch = []

      const { error } = await this.supabase
        .from('audit_logs')
        .insert(batch)

      if (error) {
        console.error('Failed to write audit logs:', error)
        // In production, you might want to write to a fallback log file
        this.writeToFallbackLog(batch)
      }
    } catch (error) {
      console.error('Audit log batch flush error:', error)
    }
  }

  /**
   * Start the batch timer
   */
  private startBatchTimer(): void {
    this.batchTimer = setInterval(async () => {
      await this.flushBatch()
    }, this.batchTimeout)
  }

  /**
   * Stop the batch timer
   */
  public stopBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
    }
  }

  /**
   * Generate unique ID for audit entries
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Send alert for critical events
   */
  private async sendAlert(entry: AuditLogEntry): Promise<void> {
    // In production, integrate with alerting system (email, Slack, PagerDuty, etc.)
    console.error('CRITICAL AUDIT EVENT:', entry)
    
    // Example: Send to admin notification system
    try {
      // await notificationService.sendAdminAlert({
      //   title: 'Critical Security Event',
      //   message: `${entry.action} - ${entry.error_message}`,
      //   data: entry
      // })
    } catch (error) {
      console.error('Failed to send audit alert:', error)
    }
  }

  /**
   * Write to fallback log file when database is unavailable
   */
  private writeToFallbackLog(entries: AuditLogEntry[]): void {
    // In production, write to file system or external logging service
    console.log('FALLBACK AUDIT LOG:', JSON.stringify(entries, null, 2))
  }

  /**
   * Query audit logs with filters
   */
  async queryLogs(filters: {
    userId?: string
    action?: string
    resourceType?: string
    category?: string
    severity?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<{ data: AuditLogEntry[], count: number }> {
    let query = this.supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })

    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }
    if (filters.action) {
      query = query.ilike('action', `%${filters.action}%`)
    }
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType)
    }
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }
    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate)
    }

    query = query
      .order('timestamp', { ascending: false })
      .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to query audit logs: ${error.message}`)
    }

    return { data: data || [], count: count || 0 }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    totalEvents: number
    criticalEvents: number
    failedLogins: number
    rateLimitHits: number
    suspiciousActivity: number
  }> {
    const now = new Date()
    const timeframes = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const startTime = timeframes[timeframe].toISOString()

    const [total, critical, failedLogins, rateLimits, suspicious] = await Promise.all([
      this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .gte('timestamp', startTime),
      
      this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .gte('timestamp', startTime),
      
      this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'auth')
        .eq('success', false)
        .gte('timestamp', startTime),
      
      this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('action', 'rate_limit_exceeded')
        .gte('timestamp', startTime),
      
      this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'security')
        .gte('timestamp', startTime)
    ])

    return {
      totalEvents: total.count || 0,
      criticalEvents: critical.count || 0,
      failedLogins: failedLogins.count || 0,
      rateLimitHits: rateLimits.count || 0,
      suspiciousActivity: suspicious.count || 0
    }
  }
}

// Singleton instance
export const auditLogger = new AuditLogger()

// Convenience functions
export const logAuth = auditLogger.logAuth.bind(auditLogger)
export const logDataAccess = auditLogger.logDataAccess.bind(auditLogger)
export const logSecurity = auditLogger.logSecurity.bind(auditLogger)
export const logPayment = auditLogger.logPayment.bind(auditLogger)
export const logSystem = auditLogger.logSystem.bind(auditLogger)
export const logNotification = auditLogger.logNotification.bind(auditLogger)

// Middleware helper to extract request context
export function extractRequestContext(req: Request): {
  ip_address?: string
  user_agent?: string
  session_id?: string
} {
  return {
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || 
                req.headers.get('x-real-ip') || 
                'unknown',
    user_agent: req.headers.get('user-agent') || 'unknown',
    session_id: req.headers.get('x-session-id') || undefined
  }
}