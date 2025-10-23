import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth'
import { requirePermission } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('admin', 'read')
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'all'
    const priority = searchParams.get('priority') || 'all'
    
    const supabase = createServerSupabaseClient()
    
    let query = supabase
      .from('complaints')
      .select(`
        *,
        student:profiles!complaints_student_id_fkey(first_name, last_name),
        lecturer:profiles!complaints_lecturer_id_fkey(first_name, last_name),
        assigned_admin:profiles!complaints_assigned_to_fkey(first_name, last_name),
        request:requests(id, purpose, status)
      `)
    
    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }
    
    // Get total count
    const { count } = await supabase
      .from('complaints')
      .select('*', { count: 'exact', head: true })
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data: complaints, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      complaints: complaints || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching complaints:', error)
    return NextResponse.json(
      { error: 'Failed to fetch complaints' },
      { status: 500 }
    )
  }
}