import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
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

    // Get user's requests with lecturer information
    const { data: requests, error } = await supabase
      .from('requests')
      .select(`
        *,
        lecturer_profiles!inner(
          id,
          profiles!inner(
            first_name,
            last_name
          )
        )
      `)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching requests:', error)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    // Format the response to include lecturer names
    const formattedRequests = requests?.map(request => ({
      ...request,
      lecturerNames: request.lecturer_profiles?.map((lp: any) => 
        `${lp.profiles.first_name} ${lp.profiles.last_name}`
      ) || []
    })) || []

    return NextResponse.json(formattedRequests)
  } catch (error) {
    console.error('Error in requests API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    
    // Validate required fields
    const requiredFields = ['purpose', 'details', 'lecturer_ids', 'document_urls', 'deadline']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Create the request
    const { data: newRequest, error } = await supabase
      .from('requests')
      .insert({
        student_id: user.id,
        purpose: body.purpose,
        details: body.details,
        lecturer_ids: body.lecturer_ids,
        document_urls: body.document_urls,
        draft_letter: body.draft_letter,
        additional_notes: body.additional_notes,
        deadline: body.deadline,
        status: 'pending_acceptance'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating request:', error)
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }

    // TODO: Send notifications to selected lecturers
    // This would integrate with the notification system

    return NextResponse.json(newRequest, { status: 201 })
  } catch (error) {
    console.error('Error in requests POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}