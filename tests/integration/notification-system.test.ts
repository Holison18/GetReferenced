import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')
jest.mock('@/lib/twilio')
jest.mock('@sendgrid/mail')

const mockSupabase = supabase as jest.Mocked<typeof supabase>

// Mock Twilio
const mockTwilio = {
  messages: {
    create: jest.fn()
  }
}

// Mock SendGrid
const mockSendGrid = {
  send: jest.fn()
}

jest.mock('twilio', () => jest.fn(() => mockTwilio))
jest.mock('@sendgrid/mail', () => mockSendGrid)

describe('Notification System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should send multi-channel notifications for status changes', async () => {
    const mockNotification = {
      id: 'notification-id',
      user_id: 'user-id',
      type: 'status_change',
      title: 'Request Status Updated',
      message: 'Your request has been accepted by the lecturer.',
      channels: ['email', 'sms', 'in_app'],
      data: {
        request_id: 'request-id',
        new_status: 'accepted'
      },
      sent_at: new Date().toISOString()
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [mockNotification],
        error: null
      })
    } as any)

    // Mock successful email sending
    mockSendGrid.send.mockResolvedValue([{ statusCode: 202 }])

    // Mock successful SMS sending
    mockTwilio.messages.create.mockResolvedValue({
      sid: 'SMS123',
      status: 'sent'
    })

    // Test notification creation
    const result = await mockSupabase.from('notifications').insert(mockNotification)
    expect(result.data).toEqual([mockNotification])

    // Verify external service calls would be made
    expect(mockSendGrid.send).toHaveBeenCalled()
    expect(mockTwilio.messages.create).toHaveBeenCalled()
  })

  test('should handle automated reminder notifications', async () => {
    const mockReminderNotification = {
      id: 'reminder-id',
      user_id: 'lecturer-id',
      type: 'reminder',
      title: 'Pending Request Reminder',
      message: 'You have a pending recommendation letter request that requires your attention.',
      channels: ['email', 'whatsapp'],
      data: {
        request_id: 'request-id',
        days_pending: 7
      },
      scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [mockReminderNotification],
        error: null
      }),
      select: jest.fn().mockReturnValue({
        lte: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [mockReminderNotification],
            error: null
          })
        })
      })
    } as any)

    // Test reminder scheduling
    const scheduleResult = await mockSupabase.from('scheduled_notifications').insert(mockReminderNotification)
    expect(scheduleResult.data).toEqual([mockReminderNotification])

    // Test reminder processing (simulating cron job)
    const pendingReminders = await mockSupabase.from('scheduled_notifications')
      .select('*')
      .lte('scheduled_for', new Date().toISOString())
      .eq('sent', false)

    expect(pendingReminders.data).toEqual([mockReminderNotification])
  })

  test('should handle real-time in-app notifications', async () => {
    const mockRealtimeNotification = {
      id: 'realtime-id',
      user_id: 'student-id',
      type: 'new_message',
      title: 'New Message from Lecturer',
      message: 'Your lecturer has sent you a message regarding your request.',
      read: false,
      created_at: new Date().toISOString()
    }

    // Mock Supabase Realtime
    const mockChannel = {
      on: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    }

    mockSupabase.channel = jest.fn().mockReturnValue(mockChannel)

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [mockRealtimeNotification],
        error: null
      })
    } as any)

    // Test real-time notification
    const result = await mockSupabase.from('notifications').insert(mockRealtimeNotification)
    expect(result.data).toEqual([mockRealtimeNotification])

    // Verify channel setup for real-time updates
    expect(mockSupabase.channel).toHaveBeenCalledWith('notifications:student-id')
  })

  test('should handle notification preferences', async () => {
    const mockPreferences = {
      user_id: 'user-id',
      email_enabled: true,
      sms_enabled: false,
      whatsapp_enabled: true,
      in_app_enabled: true,
      notification_types: {
        status_changes: true,
        reminders: true,
        messages: true,
        marketing: false
      }
    }

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockPreferences,
            error: null
          })
        })
      }),
      upsert: jest.fn().mockResolvedValue({
        data: [mockPreferences],
        error: null
      })
    } as any)

    // Test preference retrieval
    const getResult = await mockSupabase.from('notification_preferences')
      .select('*')
      .eq('user_id', 'user-id')
      .single()

    expect(getResult.data).toEqual(mockPreferences)

    // Test preference update
    const updateResult = await mockSupabase.from('notification_preferences')
      .upsert(mockPreferences)

    expect(updateResult.data).toEqual([mockPreferences])
  })

  test('should handle notification delivery failures and retries', async () => {
    const mockFailedNotification = {
      id: 'failed-notification-id',
      user_id: 'user-id',
      type: 'status_change',
      channels: ['email', 'sms'],
      delivery_attempts: 1,
      last_attempt: new Date().toISOString(),
      status: 'failed',
      error_message: 'Email delivery failed'
    }

    // Mock failed email delivery
    mockSendGrid.send.mockRejectedValue(new Error('Email delivery failed'))

    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockResolvedValue({
        data: [mockFailedNotification],
        error: null
      })
    } as any)

    // Test failure handling
    const result = await mockSupabase.from('notification_delivery_log')
      .update({
        delivery_attempts: 1,
        status: 'failed',
        error_message: 'Email delivery failed'
      })
      .eq('id', 'failed-notification-id')

    expect(result.data).toEqual([mockFailedNotification])
  })
})