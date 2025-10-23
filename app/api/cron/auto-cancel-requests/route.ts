import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    // Find requests pending for more than 14 days
    const { data: expiredRequests, error } = await supabase
      .from('requests')
      .select(`
        *,
        profiles!requests_student_id_fkey(first_name, last_name, email),
        payments(id, amount, status, stripe_payment_intent_id)
      `)
      .eq('status', 'pending_acceptance')
      .lt('created_at', fourteenDaysAgo)

    if (error) {
      throw new Error(`Failed to fetch expired requests: ${error.message}`)
    }

    const results = {
      cancelled: 0,
      refunded: 0,
      errors: [] as string[]
    }

    for (const request of expiredRequests || []) {
      try {
        // Cancel the request
        const { error: updateError } = await supabase
          .from('requests')
          .update({ 
            status: 'auto_cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', request.id)

        if (updateError) {
          throw new Error(`Failed to cancel request: ${updateError.message}`)
        }

        results.cancelled++

        // Process refund if payment exists
        const payment = request.payments?.[0]
        if (payment && payment.status === 'completed') {
          try {
            // Create refund record
            await supabase
              .from('refunds')
              .insert({
                payment_id: payment.id,
                amount: payment.amount,
                reason: 'Auto-cancelled due to no lecturer response',
                status: 'pending',
                created_at: new Date().toISOString()
              })

            // Update payment status
            await supabase
              .from('payments')
              .update({ status: 'refunded' })
              .eq('id', payment.id)

            results.refunded++

            // Note: Actual Stripe refund would be processed by a separate webhook/service
            // This just creates the refund record for processing

          } catch (refundError) {
            results.errors.push(`Refund for request ${request.id}: ${refundError instanceof Error ? refundError.message : 'Unknown error'}`)
          }
        }

        // Send cancellation notification to student
        const studentProfile = request.profiles
        await supabase
          .from('notification_queue')
          .insert({
            user_id: request.student_id,
            type: 'auto_cancellation',
            title: 'Request Automatically Cancelled',
            message: `Your recommendation letter request has been automatically cancelled due to no response from the lecturer after 14 days. ${payment ? 'A refund has been initiated and will be processed within 5-10 business days.' : ''}`,
            channels: ['email', 'in_app'],
            email: studentProfile.email,
            template_data: {
              request_id: request.id,
              purpose: request.purpose,
              refund_amount: payment?.amount || 0
            },
            scheduled_for: new Date().toISOString()
          })

        // Log the auto-cancellation
        await supabase
          .from('audit_logs')
          .insert({
            action: 'auto_cancel_request',
            resource_type: 'request',
            resource_id: request.id,
            new_values: { status: 'auto_cancelled', reason: 'No lecturer response after 14 days' },
            created_at: new Date().toISOString()
          })

      } catch (cancellationError) {
        const errorMessage = cancellationError instanceof Error ? cancellationError.message : 'Unknown error'
        results.errors.push(`Request ${request.id}: ${errorMessage}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-cancelled ${results.cancelled} requests, initiated ${results.refunded} refunds`,
      results
    })

  } catch (error) {
    console.error('Auto-cancellation processing error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process auto-cancellations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}