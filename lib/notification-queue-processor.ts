import { createSupabaseServerClient } from './supabase-server'
import { triggerNotifications } from './notification-triggers'

interface QueueItem {
  id: string
  type: string
  data: any
  created_at: string
}

class NotificationQueueProcessor {
  private supabase = createSupabaseServerClient()
  private isProcessing = false

  async processQueue() {
    if (this.isProcessing) {
      console.log('Queue processor already running')
      return
    }

    this.isProcessing = true
    console.log('Starting notification queue processing...')

    try {
      // Get unprocessed notifications
      const { data: queueItems, error } = await this.supabase
        .from('notification_queue')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) {
        console.error('Error fetching queue items:', error)
        return
      }

      if (!queueItems || queueItems.length === 0) {
        console.log('No notifications to process')
        return
      }

      console.log(`Processing ${queueItems.length} notifications...`)

      for (const item of queueItems) {
        try {
          await this.processQueueItem(item)
          
          // Mark as processed
          await this.supabase
            .from('notification_queue')
            .update({ 
              processed: true, 
              processed_at: new Date().toISOString() 
            })
            .eq('id', item.id)

          console.log(`Processed notification: ${item.type} (${item.id})`)
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error)
          
          // Optionally mark as failed or retry later
          // For now, we'll leave it unprocessed to retry
        }
      }

      console.log('Queue processing completed')
    } catch (error) {
      console.error('Error in queue processing:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processQueueItem(item: QueueItem) {
    const { type, data } = item

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

      case 'payment_status_changed':
        await triggerNotifications.paymentStatusChanged(data)
        break

      case 'payout_completed':
        // Get request ID from payment
        const { data: payment } = await this.supabase
          .from('payments')
          .select('request_id')
          .eq('id', data.paymentId)
          .single()

        if (payment) {
          await triggerNotifications.payoutCompleted(
            data.lecturerId,
            data.amount,
            payment.request_id
          )
        }
        break

      case 'complaint_filed':
        await triggerNotifications.complaintFiled(data)
        break

      default:
        console.warn(`Unknown notification type: ${type}`)
    }
  }

  // Clean up old processed notifications (older than 30 days)
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { error } = await this.supabase
        .from('notification_queue')
        .delete()
        .eq('processed', true)
        .lt('created_at', thirtyDaysAgo.toISOString())

      if (error) {
        console.error('Error cleaning up old notifications:', error)
      } else {
        console.log('Cleaned up old processed notifications')
      }
    } catch (error) {
      console.error('Error in cleanup:', error)
    }
  }
}

export const notificationQueueProcessor = new NotificationQueueProcessor()

// Export function for API route
export async function processNotificationQueue() {
  await notificationQueueProcessor.processQueue()
}

export async function cleanupNotificationQueue() {
  await notificationQueueProcessor.cleanupOldNotifications()
}