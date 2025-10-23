import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Find requests pending for more than 7 days
    const { data: pendingRequests, error } = await supabase
      .from('requests')
      .select(`
        *,
        profiles!requests_student_id_fkey(first_name, last_name, email),
        lecturer_profiles!inner(
          id,
          profiles!lecturer_profiles_id_fkey(first_name, last_name, email),
          notification_preferences
        )
      `)
      .eq('status', 'pending_acceptance')
      .lt('created_at', sevenDaysAgo)

    if (error) {
      throw new Error(`Failed to fetch pending requests: ${error.message}`)
    }

    const results = {
      reminders_sent: 0,
      errors: [] as string[]
    }

    for (const request of pendingRequests || []) {
      try {
        // Check if reminder was already sent recently
        const { data: recentReminder } = await supabase
          .from('notification_queue')
          .select('id')
          .eq('type', 'reminder')
          .eq('user_id', request.lecturer_profiles[0]?.id)
          .contains('template_data', { request_id: request.id })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .limit(1)

        if (recentReminder && recentReminder.length > 0) {
          continue // Skip if reminder already sent recently
        }

        const lecturerProfile = request.lecturer_profiles[0]
        const studentProfile = request.profiles
        const preferences = lecturerProfile.notification_preferences || {}

        // Determine notification channels
        const channels = []
        if (preferences.email_enabled !== false) channels.push('email')
        if (preferences.sms_enabled) channels.push('sms')
        if (preferences.whatsapp_enabled) channels.push('whatsapp')
        if (preferences.in_app_enabled !== false) channels.push('in_app')

        // Create reminder notification
        const daysPending = Math.floor((Date.now() - new Date(request.created_at).getTime()) / (24 * 60 * 60 * 1000))
        
        await supabase
          .from('notification_queue')
          .insert({
            user_id: lecturerProfile.id,
            type: 'reminder',
            title: 'Pending Request Reminder',
            message: `You have a pending recommendation letter request from ${studentProfile.first_name} ${studentProfile.last_name} that has been waiting for ${daysPending} days. Please review and respond at your earliest convenience.`,
            channels,
            email: lecturerProfile.profiles.email,
            phone_number: preferences.phone_number,
            template_data: {
              request_id: request.id,
              student_name: `${studentProfile.first_name} ${studentProfile.last_name}`,
              purpose: request.purpose,
              deadline: request.deadline,
              days_pending: daysPending
            },
            scheduled_for: new Date().toISOString()
          })

        results.reminders_sent++

      } catch (reminderError) {
        const errorMessage = reminderError instanceof Error ? reminderError.message : 'Unknown error'
        results.errors.push(`Request ${request.id}: ${errorMessage}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${results.reminders_sent} reminder notifications`,
      results
    })

  } catch (error) {
    console.error('Reminder processing error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process reminders',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}