import { NextRequest, NextResponse } from 'next/server'
import { processNotificationQueue, cleanupNotificationQueue } from '@/lib/notification-queue-processor'

export async function POST(request: NextRequest) {
  try {
    // Verify this is from a cron job or authorized source
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'process':
        await processNotificationQueue()
        break

      case 'cleanup':
        await cleanupNotificationQueue()
        break

      case 'both':
        await processNotificationQueue()
        await cleanupNotificationQueue()
        break

      default:
        return NextResponse.json(
          { error: 'Unknown action. Use: process, cleanup, or both' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing notification queue:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}