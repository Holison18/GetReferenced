import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/notification-service'
import { sendSMS, sendWhatsApp } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending notifications
    const { data: pendingNotifications, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(100)

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`)
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const notification of pendingNotifications || []) {
      try {
        // Update status to processing
        await supabase
          .from('notification_queue')
          .update({ status: 'processing' })
          .eq('id', notification.id)

        // Send notification based on channels
        const channels = notification.channels || []
        
        if (channels.includes('email') && notification.email) {
          await sendEmail(
            notification.email,
            notification.subject || notification.title,
            notification.message,
            notification.template_data
          )
        }

        if (channels.includes('sms') && notification.phone_number) {
          await sendSMS(notification.phone_number, notification.message)
        }

        if (channels.includes('whatsapp') && notification.phone_number) {
          await sendWhatsApp(notification.phone_number, notification.message)
        }

        if (channels.includes('in_app') && notification.user_id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: notification.user_id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              data: notification.template_data
            })
        }

        // Mark as sent
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempts: (notification.attempts || 0) + 1
          })
          .eq('id', notification.id)

        results.processed++

      } catch (notificationError) {
        const errorMessage = notificationError instanceof Error ? notificationError.message : 'Unknown error'
        results.errors.push(`Notification ${notification.id}: ${errorMessage}`)
        
        // Mark as failed and increment attempts
        const attempts = (notification.attempts || 0) + 1
        const maxAttempts = 3
        
        await supabase
          .from('notification_queue')
          .update({ 
            status: attempts >= maxAttempts ? 'failed' : 'pending',
            attempts,
            last_error: errorMessage,
            next_retry: attempts < maxAttempts 
              ? new Date(Date.now() + Math.pow(2, attempts) * 60000).toISOString() // Exponential backoff
              : null
          })
          .eq('id', notification.id)

        results.failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} notifications, ${results.failed} failed`,
      results
    })

  } catch (error) {
    console.error('Notification processing error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}