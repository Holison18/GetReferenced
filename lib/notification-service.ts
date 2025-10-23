import sgMail from '@sendgrid/mail'
import twilio from 'twilio'
import { supabase } from './supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

// Notification types
export type NotificationType = 
  | 'request_created'
  | 'request_accepted'
  | 'request_declined'
  | 'request_completed'
  | 'request_reassigned'
  | 'request_cancelled'
  | 'payment_received'
  | 'payment_failed'
  | 'payout_completed'
  | 'reminder_pending'
  | 'complaint_filed'
  | 'admin_alert'

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'in_app'

export interface NotificationPreferences {
  email: boolean
  sms: boolean
  whatsapp: boolean
  in_app: boolean
  phone_number?: string
  whatsapp_number?: string
}

export interface NotificationTemplate {
  type: NotificationType
  channels: NotificationChannel[]
  subject: string
  emailTemplate: string
  smsTemplate: string
  whatsappTemplate: string
  inAppTitle: string
  inAppMessage: string
}

export interface NotificationData {
  userId: string
  type: NotificationType
  data: Record<string, any>
  channels?: NotificationChannel[]
}

// Notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  request_created: {
    type: 'request_created',
    channels: ['email', 'sms', 'whatsapp', 'in_app'],
    subject: 'New Recommendation Letter Request',
    emailTemplate: `
      <h2>New Recommendation Letter Request</h2>
      <p>Hello {{lecturerName}},</p>
      <p>You have received a new recommendation letter request from {{studentName}} for {{purpose}}.</p>
      <p><strong>Deadline:</strong> {{deadline}}</p>
      <p><strong>Details:</strong> {{details}}</p>
      <p>Please log in to your dashboard to review and respond to this request.</p>
      <p>Best regards,<br>GetReference Team</p>
    `,
    smsTemplate: 'New letter request from {{studentName}} for {{purpose}}. Deadline: {{deadline}}. Check your dashboard to respond.',
    whatsappTemplate: 'Hello {{lecturerName}}! You have a new recommendation letter request from {{studentName}} for {{purpose}}. Deadline: {{deadline}}. Please check your dashboard.',
    inAppTitle: 'New Request Received',
    inAppMessage: 'You have a new recommendation letter request from {{studentName}} for {{purpose}}'
  },
  request_accepted: {
    type: 'request_accepted',
    channels: ['email', 'sms', 'whatsapp', 'in_app'],
    subject: 'Request Accepted - Recommendation Letter',
    emailTemplate: `
      <h2>Request Accepted</h2>
      <p>Hello {{studentName}},</p>
      <p>Great news! {{lecturerName}} has accepted your recommendation letter request for {{purpose}}.</p>
      <p><strong>Deadline:</strong> {{deadline}}</p>
      <p>Your letter is now in progress. You'll receive another notification when it's completed.</p>
      <p>Best regards,<br>GetReference Team</p>
    `,
    smsTemplate: 'Good news! {{lecturerName}} accepted your letter request for {{purpose}}. Deadline: {{deadline}}.',
    whatsappTemplate: 'Hello {{studentName}}! {{lecturerName}} has accepted your recommendation letter request for {{purpose}}. Deadline: {{deadline}}.',
    inAppTitle: 'Request Accepted',
    inAppMessage: '{{lecturerName}} has accepted your recommendation letter request for {{purpose}}'
  },
  request_declined: {
    type: 'request_declined',
    channels: ['email', 'sms', 'whatsapp', 'in_app'],
    subject: 'Request Declined - Recommendation Letter',
    emailTemplate: `
      <h2>Request Declined</h2>
      <p>Hello {{studentName}},</p>
      <p>Unfortunately, {{lecturerName}} has declined your recommendation letter request for {{purpose}}.</p>
      <p><strong>Reason:</strong> {{reason}}</p>
      <p>You can reassign this request to another lecturer from your dashboard.</p>
      <p>Best regards,<br>GetReference Team</p>
    `,
    smsTemplate: '{{lecturerName}} declined your letter request for {{purpose}}. Reason: {{reason}}. You can reassign from your dashboard.',
    whatsappTemplate: 'Hello {{studentName}}, {{lecturerName}} declined your letter request for {{purpose}}. Reason: {{reason}}. You can reassign from your dashboard.',
    inAppTitle: 'Request Declined',
    inAppMessage: '{{lecturerName}} has declined your recommendation letter request for {{purpose}}'
  },
  request_completed: {
    type: 'request_completed',
    channels: ['email', 'sms', 'whatsapp', 'in_app'],
    subject: 'Letter Completed - Recommendation Letter',
    emailTemplate: `
      <h2>Letter Completed</h2>
      <p>Hello {{studentName}},</p>
      <p>Excellent! {{lecturerName}} has completed your recommendation letter for {{purpose}}.</p>
      <p>The letter has been submitted according to your specified delivery method.</p>
      <p>Payment has been processed and transferred to the lecturer.</p>
      <p>Best regards,<br>GetReference Team</p>
    `,
    smsTemplate: 'Your letter for {{purpose}} is complete! {{lecturerName}} has submitted it. Payment processed.',
    whatsappTemplate: 'Great news {{studentName}}! Your recommendation letter for {{purpose}} is complete and has been submitted by {{lecturerName}}.',
    inAppTitle: 'Letter Completed',
    inAppMessage: 'Your recommendation letter for {{purpose}} has been completed and submitted'
  },
  request_reassigned: {
    type: 'request_reassigned',
    channels: ['email', 'sms', 'whatsapp', 'in_app'],
    subject: 'Request Reassigned - Recommendation Letter',
    emailTemplate: `
      <h2>Request Reassigned</h2>
      <p>Hello {{lecturerName}},</p>
      <p>You have been assigned a recommendation letter request from {{studentName}} for {{purpose}}.</p>
      <p>This request was previously assigned to another lecturer.</p>
      <p><strong>Deadline:</strong> {{deadline}}</p>
      <p>Please log in to your dashboard to review and respond to this request.</p>
      <p>Best regards,<br>GetReference Team</p>
    `,
    smsTemplate: 'Reassigned letter request from {{studentName}} for {{purpose}}. Deadline: {{deadline}}. Check your dashboard.',
    whatsappTemplate: 'Hello {{lecturerName}}! You have been assigned a letter request from {{studentName}} for {{purpose}}. Deadline: {{deadline}}.',
    inAppTitle: 'Request Reassigned',
    inAppMessage: 'You have been assigned a recommendation letter request from {{studentName}}'
  },
  request_cancelled: {
    type: 'request_cancelled',
    channels: ['email', 'sms', 'whatsapp', 'in_app'],
    subject: 'Request Cancelled - Recommendation Letter',
    emailTemplate: `
      <h2>Request Cancelled</h2>
      <p>Hello {{lecturerName}},</p>
      <p>The recommendation letter request from {{studentName}} for {{purpose}} has been cancelled.</p>
      <p><strong>Reason:</strong> {{reason}}</p>
      <p>No further action is required from you.</p>
      <p>Best regards,<br>GetReference Team</p>
    `,
    smsTemplate: 'Letter request from {{studentName}} for {{purpose}} has been cancelled. Reason: {{reason}}.',
    whatsappTemplate: 'Hello {{lecturerName}}, the letter request from {{studentName}} for {{purpose}} has been cancelled.',
    inAppTitle: 'Request Cancelled',
    inAppMessage: 'The recommendation letter request from {{studentName}} has been cancelled'
  },
  payment_received: {
    type: 'payment_received',
    channels: ['email', 'in_app'],
    subject: 'Payment Received - Recommendation Letter',
    emailTemplate: `
      <h2>Payment Received</h2>
      <p>Hello {{studentName}},</p>
      <p>We have successfully received your payment of ${{amount}} for the recommendation letter request.</p>
      <p><strong>Request:</strong> {{purpose}}</p>
      <p><strong>Lecturer:</strong> {{lecturerName}}</p>
      <p>Your request has been sent to the lecturer for review.</p>
      <p>Best regards,<br>GetReference Team</p>
    `,
    smsTemplate: 'Payment of ${{amount}} received for your letter request. Request sent to {{lecturerName}}.',
    whatsappTemplate: 'Payment received! Your letter request for {{purpose}} has been sent to {{lecturerName}}.',
    inAppTitle: 'Payment Received',
    inAppMessage: 'Payment of ${{amount}} received for your recommendation letter request'
  },
  payment_failed: {
    type: 'payment_failed',
    channels: ['email', 'sms', 'whatsapp', 'in_app'],
    subject: 'Payment Failed - Recommendation Letter',
    emailTemplate: `
      <h2>Payment Failed</h2>
      <p>Hello {{studentName}},</p>
      <p>Unfortunately, your payment for the recommendation letter request has failed.</p>
      <p><strong>Reason:</strong> {{reason}}</p>
      <p>Please try again or contact support if the issue persists.</p>
      <p>Best regards,<br>GetReference Team</p>
    `,
    smsTemplate: 'Payment failed for your letter request. Reason: {{reason}}. Please try again.',
    whatsappTemplate: 'Hello {{studentName}}, your payment for the letter request failed. Please try again from your dashboard.',
    inAppTitle: 'Payment Failed',
    inAppMessage: 'Your payment for the recommendation letter request has failed'
  },
  payout_completed: {
    type: 'payout_completed',
    channels: ['email', 'sms', 'whatsapp', 'in_app'],
    subject: 'Payout Completed - Recommendation Letter',
    emailTemplate: `
      <h2>Payout Completed</h2>
      <p>Hello {{lecturerName}},</p>
      <p>Your payout of ${{amount}} for the completed recommendation letter has been processed.</p>
      <p><strong>Student:</strong> {{studentName}}</p>
      <p><strong>Purpose:</strong> {{purpose}}</p>
      <p>The funds should appear in your account within 1-2 business days.</p>
      <p>Best regards,<br>GetReference Team</p>
    `,
    smsTemplate: 'Payout of ${{amount}} processed for completed letter. Funds arriving in 1-2 business days.',
    whatsappTemplate: 'Great news {{lecturerName}}! Your payout of ${{amount}} has been processed and will arrive in 1-2 business days.',
    inAppTitle: 'Payout Completed',
    inAppMessage: 'Your payout of ${{amount}} has been processed successfully'
  },
  reminder_pending: {
    type: 'reminder_pending',
    channels: ['email', 'sms', 'whatsapp', 'in_app'],
    subject: 'Reminder: Pending Recommendation Letter Request',
    emailTemplate: `
      <h2>Reminder: Pending Request</h2>
      <p>Hello {{lecturerName}},</p>
      <p>This is a friendly reminder that you have a pending recommendation letter request from {{studentName}}.</p>
      <p><strong>Purpose:</strong> {{purpose}}</p>
      <p><strong>Deadline:</strong> {{deadline}}</p>
      <p><strong>Days Remaining:</strong> {{daysRemaining}}</p>
      <p>Please log in to your dashboard to respond to this request.</p>
      <p>Best regards,<br>GetReference Team</p>
    `,
    smsTemplate: 'Reminder: Pending letter request from {{studentName}} for {{purpose}}. Deadline: {{deadline}}. {{daysRemaining}} days remaining.',
    whatsappTemplate: 'Hello {{lecturerName}}, reminder about the pending letter request from {{studentName}} for {{purpose}}. Deadline: {{deadline}}.',
    inAppTitle: 'Pending Request Reminder',
    inAppMessage: 'Reminder: You have a pending request from {{studentName}} with deadline {{deadline}}'
  },
  complaint_filed: {
    type: 'complaint_filed',
    channels: ['email', 'in_app'],
    subject: 'New Complaint Filed',
    emailTemplate: `
      <h2>New Complaint Filed</h2>
      <p>Hello Admin,</p>
      <p>A new complaint has been filed by {{studentName}}.</p>
      <p><strong>Type:</strong> {{complaintType}}</p>
      <p><strong>Subject:</strong> {{subject}}</p>
      <p><strong>Priority:</strong> {{priority}}</p>
      <p>Please review and assign the complaint in the admin dashboard.</p>
      <p>Best regards,<br>GetReference System</p>
    `,
    smsTemplate: 'New complaint filed by {{studentName}}. Type: {{complaintType}}. Priority: {{priority}}.',
    whatsappTemplate: 'New complaint filed by {{studentName}}. Please check the admin dashboard.',
    inAppTitle: 'New Complaint Filed',
    inAppMessage: 'A new {{priority}} priority complaint has been filed by {{studentName}}'
  },
  admin_alert: {
    type: 'admin_alert',
    channels: ['email', 'sms', 'in_app'],
    subject: 'System Alert - GetReference',
    emailTemplate: `
      <h2>System Alert</h2>
      <p>Hello Admin,</p>
      <p><strong>Alert Type:</strong> {{alertType}}</p>
      <p><strong>Message:</strong> {{message}}</p>
      <p><strong>Time:</strong> {{timestamp}}</p>
      <p>Please review and take appropriate action if necessary.</p>
      <p>Best regards,<br>GetReference System</p>
    `,
    smsTemplate: 'System Alert: {{alertType}} - {{message}}',
    whatsappTemplate: 'System Alert: {{alertType}} - {{message}}. Please check the admin dashboard.',
    inAppTitle: 'System Alert',
    inAppMessage: '{{alertType}}: {{message}}'
  }
}

class NotificationService {
  private supabaseClient

  constructor() {
    this.supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookies().get(name)?.value
          },
        },
      }
    )
  }

  // Template rendering helper
  private renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match
    })
  }

  // Get user notification preferences
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const { data: profile } = await this.supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role === 'lecturer') {
      const { data: lecturerProfile } = await this.supabaseClient
        .from('lecturer_profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .single()

      return lecturerProfile?.notification_preferences || {
        email: true,
        sms: false,
        whatsapp: false,
        in_app: true
      }
    }

    if (profile?.role === 'student') {
      const { data: studentProfile } = await this.supabaseClient
        .from('student_profiles')
        .select('contact_info')
        .eq('id', userId)
        .single()

      const contactInfo = studentProfile?.contact_info || {}
      return {
        email: true,
        sms: contactInfo.sms_notifications || false,
        whatsapp: contactInfo.whatsapp_notifications || false,
        in_app: true,
        phone_number: contactInfo.phone_number,
        whatsapp_number: contactInfo.whatsapp_number
      }
    }

    // Default for admin
    return {
      email: true,
      sms: true,
      whatsapp: false,
      in_app: true
    }
  }

  // Send email notification
  private async sendEmail(
    email: string,
    subject: string,
    htmlContent: string
  ): Promise<void> {
    try {
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject,
        html: htmlContent
      })
    } catch (error) {
      console.error('Email sending failed:', error)
      throw error
    }
  }

  // Send SMS notification
  private async sendSMS(
    phoneNumber: string,
    message: string
  ): Promise<void> {
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: phoneNumber
      })
    } catch (error) {
      console.error('SMS sending failed:', error)
      throw error
    }
  }

  // Send WhatsApp notification
  private async sendWhatsApp(
    phoneNumber: string,
    message: string
  ): Promise<void> {
    try {
      await twilioClient.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER!}`,
        to: `whatsapp:${phoneNumber}`
      })
    } catch (error) {
      console.error('WhatsApp sending failed:', error)
      throw error
    }
  }

  // Send in-app notification
  private async sendInApp(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabaseClient
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          data
        })
    } catch (error) {
      console.error('In-app notification failed:', error)
      throw error
    }
  }

  // Main notification sending method
  async sendNotification(notificationData: NotificationData): Promise<void> {
    const { userId, type, data, channels } = notificationData
    const template = NOTIFICATION_TEMPLATES[type]
    
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`)
    }

    // Get user preferences and profile
    const preferences = await this.getUserPreferences(userId)
    const { data: profile } = await this.supabaseClient
      .from('profiles')
      .select('*, student_profiles(*), lecturer_profiles(*)')
      .eq('id', userId)
      .single()

    if (!profile) {
      throw new Error(`User not found: ${userId}`)
    }

    const userEmail = profile.email || data.email
    const channelsToUse = channels || template.channels.filter(channel => 
      preferences[channel as keyof NotificationPreferences]
    )

    // Send notifications through each enabled channel
    const promises = channelsToUse.map(async (channel) => {
      try {
        switch (channel) {
          case 'email':
            if (preferences.email && userEmail) {
              const subject = this.renderTemplate(template.subject, data)
              const htmlContent = this.renderTemplate(template.emailTemplate, data)
              await this.sendEmail(userEmail, subject, htmlContent)
            }
            break

          case 'sms':
            if (preferences.sms && preferences.phone_number) {
              const message = this.renderTemplate(template.smsTemplate, data)
              await this.sendSMS(preferences.phone_number, message)
            }
            break

          case 'whatsapp':
            if (preferences.whatsapp && preferences.whatsapp_number) {
              const message = this.renderTemplate(template.whatsappTemplate, data)
              await this.sendWhatsApp(preferences.whatsapp_number, message)
            }
            break

          case 'in_app':
            if (preferences.in_app) {
              const title = this.renderTemplate(template.inAppTitle, data)
              const message = this.renderTemplate(template.inAppMessage, data)
              await this.sendInApp(userId, type, title, message, data)
            }
            break
        }
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error)
        // Continue with other channels even if one fails
      }
    })

    await Promise.allSettled(promises)
  }

  // Bulk notification sending
  async sendBulkNotifications(notifications: NotificationData[]): Promise<void> {
    const promises = notifications.map(notification => 
      this.sendNotification(notification)
    )
    await Promise.allSettled(promises)
  }

  // Get user notifications (for in-app display)
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    return await this.supabaseClient
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.supabaseClient
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    await this.supabaseClient
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await this.supabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    return count || 0
  }
}

export const notificationService = new NotificationService()
export { NOTIFICATION_TEMPLATES }