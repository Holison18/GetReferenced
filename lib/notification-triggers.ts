import { notificationService, NotificationType } from './notification-service'
import { createSupabaseServerClient } from './supabase-server'
import { Database } from './supabase'

type RequestStatus = Database['public']['Tables']['requests']['Row']['status']
type PaymentStatus = Database['public']['Tables']['payments']['Row']['status']

interface RequestData {
  id: string
  student_id: string
  lecturer_ids: string[]
  purpose: string
  deadline: string
  status: RequestStatus
  details: any
}

interface PaymentData {
  id: string
  student_id: string
  request_id: string
  amount: number
  status: PaymentStatus
}

interface ComplaintData {
  id: string
  student_id: string
  type: string
  subject: string
  priority: string
}

class NotificationTriggers {
  private supabase = createSupabaseServerClient()

  // Get user profile information for notifications
  private async getUserProfile(userId: string) {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select(`
        *,
        student_profiles(*),
        lecturer_profiles(*)
      `)
      .eq('id', userId)
      .single()

    return profile
  }

  // Get request details with related data
  private async getRequestDetails(requestId: string) {
    const { data: request } = await this.supabase
      .from('requests')
      .select(`
        *,
        profiles!requests_student_id_fkey(first_name, last_name)
      `)
      .eq('id', requestId)
      .single()

    return request
  }

  // Trigger notification for new request creation
  async onRequestCreated(requestData: RequestData) {
    try {
      const studentProfile = await this.getUserProfile(requestData.student_id)
      if (!studentProfile) return

      const studentName = `${studentProfile.first_name} ${studentProfile.last_name}`

      // Notify each assigned lecturer
      for (const lecturerId of requestData.lecturer_ids) {
        const lecturerProfile = await this.getUserProfile(lecturerId)
        if (!lecturerProfile) continue

        await notificationService.sendNotification({
          userId: lecturerId,
          type: 'request_created',
          data: {
            lecturerName: `${lecturerProfile.first_name} ${lecturerProfile.last_name}`,
            studentName,
            purpose: requestData.purpose,
            deadline: new Date(requestData.deadline).toLocaleDateString(),
            details: requestData.details.organizationName || 'N/A',
            requestId: requestData.id
          }
        })
      }
    } catch (error) {
      console.error('Error triggering request created notification:', error)
    }
  }

  // Trigger notification for request status changes
  async onRequestStatusChanged(
    requestId: string,
    oldStatus: RequestStatus,
    newStatus: RequestStatus,
    lecturerId?: string,
    reason?: string
  ) {
    try {
      const request = await this.getRequestDetails(requestId)
      if (!request) return

      const studentProfile = await this.getUserProfile(request.student_id)
      if (!studentProfile) return

      const studentName = `${studentProfile.first_name} ${studentProfile.last_name}`

      let notificationType: NotificationType
      let targetUserId: string
      let lecturerName = ''

      // Get lecturer name if applicable
      if (lecturerId) {
        const lecturerProfile = await this.getUserProfile(lecturerId)
        if (lecturerProfile) {
          lecturerName = `${lecturerProfile.first_name} ${lecturerProfile.last_name}`
        }
      }

      switch (newStatus) {
        case 'accepted':
          notificationType = 'request_accepted'
          targetUserId = request.student_id
          break
        case 'declined':
          notificationType = 'request_declined'
          targetUserId = request.student_id
          break
        case 'completed':
          notificationType = 'request_completed'
          targetUserId = request.student_id
          break
        case 'cancelled':
        case 'auto_cancelled':
          notificationType = 'request_cancelled'
          // Notify all assigned lecturers
          for (const assignedLecturerId of request.lecturer_ids) {
            await notificationService.sendNotification({
              userId: assignedLecturerId,
              type: 'request_cancelled',
              data: {
                lecturerName: lecturerName || 'Lecturer',
                studentName,
                purpose: request.purpose,
                reason: reason || 'Request was cancelled',
                requestId
              }
            })
          }
          return
        case 'reassigned':
          notificationType = 'request_reassigned'
          // This will be handled separately in onRequestReassigned
          return
        default:
          return
      }

      await notificationService.sendNotification({
        userId: targetUserId,
        type: notificationType,
        data: {
          studentName,
          lecturerName,
          purpose: request.purpose,
          deadline: new Date(request.deadline).toLocaleDateString(),
          reason: reason || '',
          requestId
        }
      })
    } catch (error) {
      console.error('Error triggering status change notification:', error)
    }
  }

  // Trigger notification for request reassignment
  async onRequestReassigned(
    requestId: string,
    oldLecturerId: string,
    newLecturerId: string
  ) {
    try {
      const request = await this.getRequestDetails(requestId)
      if (!request) return

      const studentProfile = await this.getUserProfile(request.student_id)
      if (!studentProfile) return

      const studentName = `${studentProfile.first_name} ${studentProfile.last_name}`

      // Notify the new lecturer
      await notificationService.sendNotification({
        userId: newLecturerId,
        type: 'request_reassigned',
        data: {
          lecturerName: 'New Lecturer',
          studentName,
          purpose: request.purpose,
          deadline: new Date(request.deadline).toLocaleDateString(),
          requestId
        }
      })

      // Optionally notify the old lecturer about reassignment
      await notificationService.sendNotification({
        userId: oldLecturerId,
        type: 'request_cancelled',
        data: {
          lecturerName: 'Previous Lecturer',
          studentName,
          purpose: request.purpose,
          reason: 'Request has been reassigned to another lecturer',
          requestId
        }
      })
    } catch (error) {
      console.error('Error triggering reassignment notification:', error)
    }
  }

  // Trigger notification for payment events
  async onPaymentStatusChanged(paymentData: PaymentData) {
    try {
      const request = await this.getRequestDetails(paymentData.request_id)
      if (!request) return

      const studentProfile = await this.getUserProfile(paymentData.student_id)
      if (!studentProfile) return

      const studentName = `${studentProfile.first_name} ${studentProfile.last_name}`

      let notificationType: NotificationType
      let targetUserId = paymentData.student_id

      switch (paymentData.status) {
        case 'succeeded':
          notificationType = 'payment_received'
          // Get lecturer name for the notification
          let lecturerName = 'Lecturer'
          if (request.lecturer_ids.length > 0) {
            const lecturerProfile = await this.getUserProfile(request.lecturer_ids[0])
            if (lecturerProfile) {
              lecturerName = `${lecturerProfile.first_name} ${lecturerProfile.last_name}`
            }
          }

          await notificationService.sendNotification({
            userId: targetUserId,
            type: notificationType,
            data: {
              studentName,
              lecturerName,
              amount: paymentData.amount,
              purpose: request.purpose,
              paymentId: paymentData.id
            }
          })
          break

        case 'failed':
          notificationType = 'payment_failed'
          await notificationService.sendNotification({
            userId: targetUserId,
            type: notificationType,
            data: {
              studentName,
              amount: paymentData.amount,
              reason: 'Payment processing failed',
              paymentId: paymentData.id
            }
          })
          break
      }
    } catch (error) {
      console.error('Error triggering payment notification:', error)
    }
  }

  // Trigger notification for payout completion
  async onPayoutCompleted(lecturerId: string, amount: number, requestId: string) {
    try {
      const request = await this.getRequestDetails(requestId)
      if (!request) return

      const lecturerProfile = await this.getUserProfile(lecturerId)
      const studentProfile = await this.getUserProfile(request.student_id)

      if (!lecturerProfile || !studentProfile) return

      const lecturerName = `${lecturerProfile.first_name} ${lecturerProfile.last_name}`
      const studentName = `${studentProfile.first_name} ${studentProfile.last_name}`

      await notificationService.sendNotification({
        userId: lecturerId,
        type: 'payout_completed',
        data: {
          lecturerName,
          studentName,
          amount,
          purpose: request.purpose,
          requestId
        }
      })
    } catch (error) {
      console.error('Error triggering payout notification:', error)
    }
  }

  // Trigger reminder notifications for pending requests
  async sendPendingReminders() {
    try {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      // Get requests that are pending for more than a week
      const { data: pendingRequests } = await this.supabase
        .from('requests')
        .select(`
          *,
          profiles!requests_student_id_fkey(first_name, last_name)
        `)
        .eq('status', 'pending_acceptance')
        .lt('created_at', oneWeekAgo.toISOString())

      if (!pendingRequests) return

      for (const request of pendingRequests) {
        const studentName = `${request.profiles.first_name} ${request.profiles.last_name}`
        const deadline = new Date(request.deadline)
        const now = new Date()
        const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Send reminder to each assigned lecturer
        for (const lecturerId of request.lecturer_ids) {
          const lecturerProfile = await this.getUserProfile(lecturerId)
          if (!lecturerProfile) continue

          await notificationService.sendNotification({
            userId: lecturerId,
            type: 'reminder_pending',
            data: {
              lecturerName: `${lecturerProfile.first_name} ${lecturerProfile.last_name}`,
              studentName,
              purpose: request.purpose,
              deadline: deadline.toLocaleDateString(),
              daysRemaining: Math.max(0, daysRemaining),
              requestId: request.id
            }
          })
        }
      }
    } catch (error) {
      console.error('Error sending pending reminders:', error)
    }
  }

  // Trigger notification for complaint filing
  async onComplaintFiled(complaintData: ComplaintData) {
    try {
      const studentProfile = await this.getUserProfile(complaintData.student_id)
      if (!studentProfile) return

      const studentName = `${studentProfile.first_name} ${studentProfile.last_name}`

      // Get all admin users
      const { data: adminProfiles } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (!adminProfiles) return

      // Notify all admins
      for (const admin of adminProfiles) {
        await notificationService.sendNotification({
          userId: admin.id,
          type: 'complaint_filed',
          data: {
            studentName,
            complaintType: complaintData.type,
            subject: complaintData.subject,
            priority: complaintData.priority,
            complaintId: complaintData.id
          }
        })
      }
    } catch (error) {
      console.error('Error triggering complaint notification:', error)
    }
  }

  // Trigger admin alert notifications
  async sendAdminAlert(alertType: string, message: string, data?: any) {
    try {
      // Get all admin users
      const { data: adminProfiles } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (!adminProfiles) return

      // Notify all admins
      for (const admin of adminProfiles) {
        await notificationService.sendNotification({
          userId: admin.id,
          type: 'admin_alert',
          data: {
            alertType,
            message,
            timestamp: new Date().toISOString(),
            ...data
          }
        })
      }
    } catch (error) {
      console.error('Error sending admin alert:', error)
    }
  }

  // Auto-cancel requests after 2 weeks of inactivity
  async processAutoCancel() {
    try {
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

      // Get requests that are pending for more than 2 weeks
      const { data: expiredRequests } = await this.supabase
        .from('requests')
        .select('*')
        .eq('status', 'pending_acceptance')
        .lt('created_at', twoWeeksAgo.toISOString())

      if (!expiredRequests) return

      for (const request of expiredRequests) {
        // Update request status to auto_cancelled
        await this.supabase
          .from('requests')
          .update({ status: 'auto_cancelled' })
          .eq('id', request.id)

        // Trigger cancellation notifications
        await this.onRequestStatusChanged(
          request.id,
          'pending_acceptance',
          'auto_cancelled',
          undefined,
          'Request automatically cancelled due to inactivity (2 weeks)'
        )

        // Process refund if payment exists
        if (request.payment_id) {
          // This would integrate with the payment service to process refunds
          console.log(`Processing refund for auto-cancelled request: ${request.id}`)
        }
      }
    } catch (error) {
      console.error('Error processing auto-cancel:', error)
    }
  }
}

export const notificationTriggers = new NotificationTriggers()

// Utility functions for easy integration
export const triggerNotifications = {
  requestCreated: (requestData: RequestData) => 
    notificationTriggers.onRequestCreated(requestData),
  
  requestStatusChanged: (requestId: string, oldStatus: RequestStatus, newStatus: RequestStatus, lecturerId?: string, reason?: string) =>
    notificationTriggers.onRequestStatusChanged(requestId, oldStatus, newStatus, lecturerId, reason),
  
  requestReassigned: (requestId: string, oldLecturerId: string, newLecturerId: string) =>
    notificationTriggers.onRequestReassigned(requestId, oldLecturerId, newLecturerId),
  
  paymentStatusChanged: (paymentData: PaymentData) =>
    notificationTriggers.onPaymentStatusChanged(paymentData),
  
  payoutCompleted: (lecturerId: string, amount: number, requestId: string) =>
    notificationTriggers.onPayoutCompleted(lecturerId, amount, requestId),
  
  complaintFiled: (complaintData: ComplaintData) =>
    notificationTriggers.onComplaintFiled(complaintData),
  
  adminAlert: (alertType: string, message: string, data?: any) =>
    notificationTriggers.sendAdminAlert(alertType, message, data)
}