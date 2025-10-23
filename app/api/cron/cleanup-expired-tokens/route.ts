import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    // Find expired tokens
    const { data: expiredTokens, error: fetchError } = await supabase
      .from('tokens')
      .select('id, code, expiry_date')
      .lt('expiry_date', currentDate)
      .is('used_by', null) // Only unused tokens

    if (fetchError) {
      throw new Error(`Failed to fetch expired tokens: ${fetchError.message}`)
    }

    const results = {
      cleaned: 0,
      errors: [] as string[]
    }

    if (expiredTokens && expiredTokens.length > 0) {
      // Delete expired tokens
      const { error: deleteError } = await supabase
        .from('tokens')
        .delete()
        .lt('expiry_date', currentDate)
        .is('used_by', null)

      if (deleteError) {
        throw new Error(`Failed to delete expired tokens: ${deleteError.message}`)
      }

      results.cleaned = expiredTokens.length

      // Log the cleanup
      await supabase
        .from('audit_logs')
        .insert({
          action: 'cleanup_expired_tokens',
          resource_type: 'token',
          new_values: { 
            cleaned_count: results.cleaned,
            expired_tokens: expiredTokens.map(t => ({ id: t.id, code: t.code, expiry_date: t.expiry_date }))
          },
          created_at: new Date().toISOString()
        })
    }

    // Also cleanup old notification queue entries (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: oldNotifications, error: notificationFetchError } = await supabase
      .from('notification_queue')
      .select('id')
      .in('status', ['sent', 'failed'])
      .lt('created_at', thirtyDaysAgo)

    if (!notificationFetchError && oldNotifications && oldNotifications.length > 0) {
      const { error: notificationDeleteError } = await supabase
        .from('notification_queue')
        .delete()
        .in('status', ['sent', 'failed'])
        .lt('created_at', thirtyDaysAgo)

      if (!notificationDeleteError) {
        results.cleaned += oldNotifications.length
      }
    }

    // Cleanup old audit logs (older than 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: oldAuditLogs, error: auditFetchError } = await supabase
      .from('audit_logs')
      .select('id')
      .lt('created_at', ninetyDaysAgo)

    if (!auditFetchError && oldAuditLogs && oldAuditLogs.length > 0) {
      const { error: auditDeleteError } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', ninetyDaysAgo)

      if (!auditDeleteError) {
        results.cleaned += oldAuditLogs.length
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${results.cleaned} expired/old records`,
      results: {
        expired_tokens: expiredTokens?.length || 0,
        old_notifications: oldNotifications?.length || 0,
        old_audit_logs: oldAuditLogs?.length || 0,
        total_cleaned: results.cleaned
      }
    })

  } catch (error) {
    console.error('Cleanup processing error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process cleanup',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}