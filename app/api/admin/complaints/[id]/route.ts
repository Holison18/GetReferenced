import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth'
import { requirePermission } from '@/lib/server-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission('admin', 'read')
    
    const supabase = createServerSupabaseClient()
    
    const { data: complaint, error } = await supabase
      .from('complaints')
      .select(`
        *,
        student:profiles!complaints_student_id_fkey(first_name, last_name, role),
        lecturer:profiles!complaints_lecturer_id_fkey(first_name, last_name, role),
        assigned_admin:profiles!complaints_assigned_to_fkey(first_name, last_name, role),
        request:requests(id, purpose, status, details, deadline)
      `)
      .eq('id', params.id)
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ complaint })
  } catch (error) {
    console.error('Error fetching complaint:', error)
    return NextResponse.json(
      { error: 'Failed to fetch complaint' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userWithProfile = await requirePermission('admin', 'write')
    
    const body = await request.json()
    const { status, priority, assigned_to, resolution_notes } = body
    
    const supabase = createServerSupabaseClient()
    
    const updateData: Record<string, unknown> = {}
    
    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (resolution_notes) updateData.resolution_notes = resolution_notes
    
    // If resolving or closing, set resolved_at timestamp
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString()
    }
    
    const { data: updatedComplaint, error } = await supabase
      .from('complaints')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        student:profiles!complaints_student_id_fkey(first_name, last_name),
        lecturer:profiles!complaints_lecturer_id_fkey(first_name, last_name),
        assigned_admin:profiles!complaints_assigned_to_fkey(first_name, last_name)
      `)
      .single()
    
    if (error) {
      throw error
    }
    
    // Create audit log entry
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userWithProfile.user.id,
        action: 'update_complaint',
        resource_type: 'complaint',
        resource_id: params.id,
        new_values: updateData
      })
    
    return NextResponse.json({ complaint: updatedComplaint })
  } catch (error) {
    console.error('Error updating complaint:', error)
    return NextResponse.json(
      { error: 'Failed to update complaint' },
      { status: 500 }
    )
  }
}