import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, or external service)
// to send automated reminders and handle status transitions

export async function POST(request: NextRequest) {
  // Verify the request is from an authorized source (e.g., cron job)
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.CRON_SECRET_TOKEN
  
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for admin operations
    {
      cookies: {
        get() { return undefined },
      },
    }
  )

  try {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // 1. Send reminders for requests pending for 1 week
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('requests')
      .select(`
        id,
        student_id,
        lecturer_ids,
        created_at,
        details,
        profiles!student_id(first_name, last_name)
      `)
      .eq('status', 'pending_acceptance')
      .lt('created_at', oneWeekAgo.toISOString())
      .gt('created_at', twoWeeksAgo.toISOString())

    if (pendingError) {
      console.error('Error fetching pending requests:', pendingError)
    } else if (pendingRequests && pendingRequests.length > 0) {
      // Send reminder notifications
      for (const request of pendingRequests) {
        // Create notifications for lecturers
        for (const lecturerId of request.lecturer_ids) {
          await supabase
            .from('notifications')
            .insert({
              user_id: lecturerId,
              type: 'reminder',
              title: 'Pending Request Reminder',
              message: `You have a pending recommendation letter request from ${request.profiles?.first_name} ${request.profiles?.last_name} for ${request.details.organizationName}. Please respond within one week to avoid auto-cancellation.`,
              data: {
                request_id: request.id,
                reminder_type: 'one_week'
              }
            })
        }

        // Create notification for student
        await supabase
          .from('notifications')
          .insert({
            user_id: request.student_id,
            type: 'reminder',
            title: 'Request Pending Response',
            message: `Your request to ${request.details.organizationName} has been pending for one week. We've sent a reminder to your selected lecturers.`,
            data: {
              request_id: request.id,
              reminder_type: 'student_update'
            }
          })
      }

      console.log(`Sent reminders for ${pendingRequests.length} pending requests`)
    }

    // 2. Auto-cancel requests pending for 2 weeks
    const { data: expiredRequests, error: expiredError } = await supabase
      .from('requests')
      .select('id, student_id, lecturer_ids, details, profiles!student_id(first_name, last_name)')
      .eq('status', 'pending_acceptance')
      .lt('created_at', twoWeeksAgo.toISOString())

    if (expiredError) {
      console.error('Error fetching expired requests:', expiredError)
    } else if (expiredRequests && expiredRequests.length > 0) {
      // Auto-cancel expired requests
      const requestIds = expiredRequests.map(r => r.id)
      
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          status: 'auto_cancelled',
          updated_at: now.toISOString()
        })
        .in('id', requestIds)

      if (updateError) {
        console.error('Error auto-cancelling requests:', updateError)
      } else {
        // Send cancellation notifications
        for (const request of expiredRequests) {
          // Notify student
          await supabase
            .from('notifications')
            .insert({
              user_id: request.student_id,
              type: 'auto_cancellation',
              title: 'Request Auto-Cancelled',
              message: `Your request to ${request.details.organizationName} has been automatically cancelled due to no response from lecturers after 2 weeks. You can create a new request or contact support for assistance.`,
              data: {
                request_id: request.id,
                reason: 'no_response_2_weeks'
              }
            })

          // Notify lecturers
          for (const lecturerId of request.lecturer_ids) {
            await supabase
              .from('notifications')
              .insert({
                user_id: lecturerId,
                type: 'auto_cancellation',
                title: 'Request Auto-Cancelled',
                message: `The recommendation letter request from ${request.profiles?.first_name} ${request.profiles?.last_name} has been automatically cancelled due to no response.`,
                data: {
                  request_id: request.id,
                  reason: 'no_response_2_weeks'
                }
              })
          }
        }

        console.log(`Auto-cancelled ${expiredRequests.length} expired requests`)
      }
    }

    // 3. Send deadline reminders for accepted requests
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    
    const { data: upcomingDeadlines, error: deadlineError } = await supabase
      .from('requests')
      .select(`
        id,
        student_id,
        lecturer_ids,
        deadline,
        details,
        profiles!student_id(first_name, last_name)
      `)
      .in('status', ['accepted', 'in_progress'])
      .lt('deadline', threeDaysFromNow.toISOString())
      .gt('deadline', now.toISOString())

    if (deadlineError) {
      console.error('Error fetching upcoming deadlines:', deadlineError)
    } else if (upcomingDeadlines && upcomingDeadlines.length > 0) {
      for (const request of upcomingDeadlines) {
        // Notify lecturers about upcoming deadline
        for (const lecturerId of request.lecturer_ids) {
          await supabase
            .from('notifications')
            .insert({
              user_id: lecturerId,
              type: 'deadline_reminder',
              title: 'Deadline Approaching',
              message: `The deadline for ${request.profiles?.first_name} ${request.profiles?.last_name}'s recommendation letter to ${request.details.organizationName} is in 3 days (${new Date(request.deadline).toLocaleDateString()}).`,
              data: {
                request_id: request.id,
                deadline: request.deadline
              }
            })
        }

        // Notify student
        await supabase
          .from('notifications')
          .insert({
            user_id: request.student_id,
            type: 'deadline_reminder',
            title: 'Deadline Approaching',
            message: `The deadline for your recommendation letter to ${request.details.organizationName} is in 3 days (${new Date(request.deadline).toLocaleDateString()}).`,
            data: {
              request_id: request.id,
              deadline: request.deadline
            }
          })
      }

      console.log(`Sent deadline reminders for ${upcomingDeadlines.length} requests`)
    }

    return NextResponse.json({
      success: true,
      processed: {
        reminders_sent: pendingRequests?.length || 0,
        auto_cancelled: expiredRequests?.length || 0,
        deadline_reminders: upcomingDeadlines?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in cron job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}