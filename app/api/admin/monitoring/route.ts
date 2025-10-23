import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { checkSystemHealth } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get system health
    const systemHealth = await checkSystemHealth()

    // Get application metrics
    const metrics = await getApplicationMetrics()

    // Get recent errors
    const recentErrors = await getRecentErrors()

    // Get performance data
    const performanceData = await getPerformanceMetrics()

    const monitoringData = {
      timestamp: new Date().toISOString(),
      system_health: systemHealth,
      metrics,
      recent_errors: recentErrors,
      performance: performanceData
    }

    return NextResponse.json(monitoringData)

  } catch (error) {
    console.error('Monitoring endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    )
  }
}

async function getApplicationMetrics() {
  const now = new Date()
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  try {
    // User metrics
    const { data: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })

    const { data: newUsers24h } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .gte('created_at', last24Hours.toISOString())

    const { data: activeUsers7d } = await supabase
      .from('audit_logs')
      .select('user_id', { count: 'exact' })
      .gte('created_at', last7Days.toISOString())
      .not('user_id', 'is', null)

    // Request metrics
    const { data: totalRequests } = await supabase
      .from('requests')
      .select('id', { count: 'exact' })

    const { data: newRequests24h } = await supabase
      .from('requests')
      .select('id', { count: 'exact' })
      .gte('created_at', last24Hours.toISOString())

    const { data: completedRequests } = await supabase
      .from('requests')
      .select('id', { count: 'exact' })
      .eq('status', 'completed')

    // Payment metrics
    const { data: totalPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')

    const { data: payments24h } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', last24Hours.toISOString())

    const totalRevenue = totalPayments?.reduce((sum, p) => sum + p.amount, 0) || 0
    const revenue24h = payments24h?.reduce((sum, p) => sum + p.amount, 0) || 0

    // Letter metrics
    const { data: lettersGenerated } = await supabase
      .from('letters')
      .select('id', { count: 'exact' })
      .eq('ai_generated', true)

    const { data: lettersSubmitted } = await supabase
      .from('letters')
      .select('id', { count: 'exact' })
      .not('submitted_at', 'is', null)

    // Notification metrics
    const { data: notificationsSent24h } = await supabase
      .from('notification_queue')
      .select('id', { count: 'exact' })
      .eq('status', 'sent')
      .gte('sent_at', last24Hours.toISOString())

    const { data: notificationsFailed24h } = await supabase
      .from('notification_queue')
      .select('id', { count: 'exact' })
      .eq('status', 'failed')
      .gte('created_at', last24Hours.toISOString())

    return {
      users: {
        total: totalUsers?.length || 0,
        new_24h: newUsers24h?.length || 0,
        active_7d: activeUsers7d?.length || 0
      },
      requests: {
        total: totalRequests?.length || 0,
        new_24h: newRequests24h?.length || 0,
        completed: completedRequests?.length || 0,
        completion_rate: totalRequests?.length ? 
          ((completedRequests?.length || 0) / totalRequests.length * 100).toFixed(1) : '0'
      },
      revenue: {
        total: totalRevenue,
        last_24h: revenue24h,
        average_per_request: totalRequests?.length ? 
          (totalRevenue / totalRequests.length).toFixed(2) : '0'
      },
      letters: {
        ai_generated: lettersGenerated?.length || 0,
        submitted: lettersSubmitted?.length || 0,
        submission_rate: lettersGenerated?.length ? 
          ((lettersSubmitted?.length || 0) / lettersGenerated.length * 100).toFixed(1) : '0'
      },
      notifications: {
        sent_24h: notificationsSent24h?.length || 0,
        failed_24h: notificationsFailed24h?.length || 0,
        success_rate: (notificationsSent24h?.length || 0) + (notificationsFailed24h?.length || 0) > 0 ?
          ((notificationsSent24h?.length || 0) / ((notificationsSent24h?.length || 0) + (notificationsFailed24h?.length || 0)) * 100).toFixed(1) : '100'
      }
    }

  } catch (error) {
    console.error('Error fetching application metrics:', error)
    return {
      users: { total: 0, new_24h: 0, active_7d: 0 },
      requests: { total: 0, new_24h: 0, completed: 0, completion_rate: '0' },
      revenue: { total: 0, last_24h: 0, average_per_request: '0' },
      letters: { ai_generated: 0, submitted: 0, submission_rate: '0' },
      notifications: { sent_24h: 0, failed_24h: 0, success_rate: '100' }
    }
  }
}

async function getRecentErrors() {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

  try {
    const { data: errors } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'error')
      .gte('created_at', last24Hours.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    return errors?.map(error => ({
      timestamp: error.created_at,
      message: error.new_values?.message || 'Unknown error',
      context: error.new_values?.context || {},
      user_id: error.user_id
    })) || []

  } catch (error) {
    console.error('Error fetching recent errors:', error)
    return []
  }
}

async function getPerformanceMetrics() {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

  try {
    // Get average response times from audit logs
    const { data: apiCalls } = await supabase
      .from('audit_logs')
      .select('new_values')
      .eq('action', 'api_call')
      .gte('created_at', last24Hours.toISOString())

    const responseTimes = apiCalls
      ?.map(call => call.new_values?.duration)
      .filter(duration => typeof duration === 'number') || []

    const avgResponseTime = responseTimes.length > 0 ?
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0

    // Get database query performance
    const { data: dbQueries } = await supabase
      .from('audit_logs')
      .select('new_values')
      .eq('action', 'db_query')
      .gte('created_at', last24Hours.toISOString())

    const queryTimes = dbQueries
      ?.map(query => query.new_values?.duration)
      .filter(duration => typeof duration === 'number') || []

    const avgQueryTime = queryTimes.length > 0 ?
      queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length : 0

    return {
      api_response_time: {
        average: Math.round(avgResponseTime),
        samples: responseTimes.length
      },
      database_query_time: {
        average: Math.round(avgQueryTime),
        samples: queryTimes.length
      },
      system: {
        uptime: process.uptime(),
        memory_usage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        memory_total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    }

  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    return {
      api_response_time: { average: 0, samples: 0 },
      database_query_time: { average: 0, samples: 0 },
      system: {
        uptime: process.uptime(),
        memory_usage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        memory_total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    }
  }
}