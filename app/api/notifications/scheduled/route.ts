import { NextRequest, NextResponse } from 'next/server'
import { notificationTriggers } from '@/lib/notification-triggers'

export async function POST(request: NextRequest) {
  try {
    // Verify this is from a cron job or authorized source
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { task } = body

    switch (task) {
      case 'send_pending_reminders':
        await notificationTriggers.sendPendingReminders()
        break

      case 'process_auto_cancel':
        await notificationTriggers.processAutoCancel()
        break

      default:
        return NextResponse.json(
          { error: 'Unknown scheduled task' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error running scheduled task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}