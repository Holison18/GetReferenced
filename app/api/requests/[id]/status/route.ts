import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, reason } = body

    // Validate status
    const validStatuses = [
      'pending_acceptance',
      'accepted', 
      'in_progress',
      'completed',
      'declined',
      'cancelled',
      'reassigned'
    ]

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get current request to check permissions and current status
    const { data: currentRequest, error: fetchError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Check if user has permission to update this status
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isStudent = userProfile?.role === 'student' && currentRequest.student_id === user.id
    const isLecturer = userProfile?.role === 'lecturer' && currentRequest.lecturer_ids.includes(user.id)
    const isAdmin = userProfile?.role === 'admin'

    if (!isStudent && !isLecturer && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to update this request' }, { status: 403 })
    }

    // Validate status transitions based on user role
    if (isStudent) {
      // Students can only cancel or reassign their own requests
      if (!['cancelled', 'reassigned'].includes(status)) {
        return NextResponse.json({ 
          error: 'Students can only cancel or reassign requests' 
        }, { status: 403 })
      }
    } else if (isLecturer) {
      // Lecturers can accept, decline, or mark as in_progress/completed
      if (!['accepted', 'declined', 'in_progress', 'completed'].includes(status)) {
        return NextResponse.json({ 
          error: 'Invalid status transition for lecturer' 
        }, { status: 403 })
      }
    }

    // Update the request status
    const { data: updatedRequest, error } = await supabase
      .from('requests')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating request status:', error)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Create notification for status change
    const notificationData = {
      user_id: isStudent ? currentRequest.lecturer_ids[0] : currentRequest.student_id,
      type: 'status_change',
      title: 'Request Status Updated',
      message: `Request status changed to ${status}${reason ? `: ${reason}` : ''}`,
      data: {
        request_id: params.id,
        old_status: currentRequest.status,
        new_status: status,
        reason
      }
    }

    await supabase
      .from('notifications')
      .insert(notificationData)

    // TODO: Send external notifications (email, SMS, WhatsApp) based on user preferences
    // TODO: Handle automatic status transitions (e.g., auto-cancel after 2 weeks)

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('Error in status update API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}