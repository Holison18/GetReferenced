import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
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

    // Get specific request with lecturer information
    const { data: request, error } = await supabase
      .from('requests')
      .select(`
        *,
        lecturer_profiles!inner(
          id,
          department,
          rank,
          profiles!inner(
            first_name,
            last_name
          )
        ),
        letters(
          id,
          content,
          submitted_at,
          declaration_completed,
          lecturer_id
        )
      `)
      .eq('id', params.id)
      .eq('student_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching request:', error)
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    return NextResponse.json(request)
  } catch (error) {
    console.error('Error in request GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    
    // Check if request exists and belongs to user
    const { data: existingRequest, error: fetchError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', params.id)
      .eq('student_id', user.id)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only allow editing if request is in pending_acceptance status
    if (existingRequest.status !== 'pending_acceptance') {
      return NextResponse.json({ 
        error: 'Request cannot be edited after lecturer acceptance' 
      }, { status: 400 })
    }

    // Update the request
    const { data: updatedRequest, error } = await supabase
      .from('requests')
      .update({
        purpose: body.purpose || existingRequest.purpose,
        details: body.details || existingRequest.details,
        lecturer_ids: body.lecturer_ids || existingRequest.lecturer_ids,
        document_urls: body.document_urls || existingRequest.document_urls,
        draft_letter: body.draft_letter !== undefined ? body.draft_letter : existingRequest.draft_letter,
        additional_notes: body.additional_notes !== undefined ? body.additional_notes : existingRequest.additional_notes,
        deadline: body.deadline || existingRequest.deadline,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating request:', error)
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('Error in request PUT API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    // Check if request exists and belongs to user
    const { data: existingRequest, error: fetchError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', params.id)
      .eq('student_id', user.id)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only allow cancellation if request is not completed
    if (existingRequest.status === 'completed') {
      return NextResponse.json({ 
        error: 'Cannot cancel completed request' 
      }, { status: 400 })
    }

    // Update status to cancelled instead of deleting
    const { error } = await supabase
      .from('requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (error) {
      console.error('Error cancelling request:', error)
      return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 })
    }

    // TODO: Handle refund logic here if payment was processed
    // TODO: Send cancellation notifications to lecturers

    return NextResponse.json({ message: 'Request cancelled successfully' })
  } catch (error) {
    console.error('Error in request DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}