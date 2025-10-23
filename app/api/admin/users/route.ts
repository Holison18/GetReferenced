import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth'
import { requirePermission } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('admin', 'read')
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    
    const supabase = createServerSupabaseClient()
    
    let query = supabase
      .from('profiles')
      .select(`
        *,
        student_profiles(*),
        lecturer_profiles(*)
      `)
    
    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }
    
    if (role && role !== 'all') {
      query = query.eq('role', role)
    }
    
    // Get total count
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    const { data: users, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}