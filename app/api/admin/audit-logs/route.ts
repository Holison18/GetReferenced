import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth'
import { requirePermission } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('admin', 'read')
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const action = searchParams.get('action') || ''
    const resourceType = searchParams.get('resource_type') || ''
    const userId = searchParams.get('user_id') || ''
    const startDate = searchParams.get('start_date') || ''
    const endDate = searchParams.get('end_date') || ''
    
    const supabase = createServerSupabaseClient()
    
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles(first_name, last_name, role)
      `)
    
    // Apply filters
    if (action) {
      query = query.eq('action', action)
    }
    
    if (resourceType) {
      query = query.eq('resource_type', resourceType)
    }
    
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    
    // Get total count
    const { count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data: auditLogs, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      auditLogs: auditLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission('admin', 'write')
    
    const body = await request.json()
    const { format = 'json', filters = {} } = body
    
    const supabase = createServerSupabaseClient()
    
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles(first_name, last_name, role)
      `)
    
    // Apply filters for export
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        query = query.eq(key, value)
      }
    })
    
    const { data: auditLogs, error } = await query
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    if (format === 'csv') {
      const csv = convertToCSV(auditLogs || [])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }
    
    return NextResponse.json({
      auditLogs: auditLogs || [],
      exportedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    )
  }
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''
  
  const headers = ['ID', 'User', 'Action', 'Resource Type', 'Resource ID', 'Created At', 'IP Address']
  const rows = data.map(log => [
    log.id,
    log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System',
    log.action,
    log.resource_type,
    log.resource_id || '',
    log.created_at,
    log.ip_address || ''
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n')
  
  return csvContent
}