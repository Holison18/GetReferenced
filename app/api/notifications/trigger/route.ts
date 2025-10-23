import { NextRequest, NextResponse } from 'next/server'
import { triggerNotifications } from '@/lib/notification-triggers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal request or from authorized source
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, data } = body

    switch (type) {
      case 'request_created':
        await triggerNotifications.requestCreated(data)
        break

      case 'request_status_changed':
        await triggerNotifications.requestStatusChanged(
          data.requestId,
          data.oldStatus,
          data.newStatus,
          data.lecturerId,
          data.reason
        )
        break

      case 'request_reassigned':
        await triggerNotifications.requestReassigned(
          data.requestId,
          data.oldLecturerId,
          data.newLecturerId
        )
        break

      case 'payment_status_changed':
        await triggerNotifications.paymentStatusChanged(data)
        break

      case 'payout_completed':
        await triggerNotifications.payoutCompleted(
          data.lecturerId,
          data.amount,
          data.requestId
        )
        break

      case 'complaint_filed':
        await triggerNotifications.complaintFiled(data)
        break

      case 'admin_alert':
        await triggerNotifications.adminAlert(
          data.alertType,
          data.message,
          data.additionalData
        )
        break

      default:
        return NextResponse.json(
          { error: 'Unknown notification type' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error triggering notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}