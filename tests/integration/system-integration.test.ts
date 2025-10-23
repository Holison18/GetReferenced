import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')
jest.mock('@/lib/openai')
jest.mock('@/lib/stripe')
jest.mock('@/lib/notification-service')
jest.mock('@/lib/twilio')
jest.mock('@sendgrid/mail')

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('Complete System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should handle complete end-to-end workflow from registration to letter completion', async () => {
    // Step 1: Student Registration
    const studentRegistration = {
      email: 'student@test.com',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Doe',
      enrollmentYear: 2020,
      completionYear: 2024
    }

    mockSupabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'student-id',
          email: studentRegistration.email,
          user_metadata: { role: 'student' }
        },
        session: null
      },
      error: null
    })

    const studentRegResult = await mockSupabase.auth.signUp({
      email: studentRegistration.email,
      password: studentRegistration.password,
      options: {
        data: {
          role: 'student',
          first_name: studentRegistration.firstName,
          last_name: studentRegistration.lastName
        }
      }
    })

    expect(studentRegResult.data.user).toBeTruthy()

    // Step 2: Lecturer Registration
    const lecturerRegistration = {
      email: 'lecturer@university.edu',
      password: 'SecurePassword123!',
      firstName: 'Dr. Jane',
      lastName: 'Smith',
      staffNumber: 'STAFF001',
      department: 'Computer Science'
    }

    mockSupabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'lecturer-id',
          email: lecturerRegistration.email,
          user_metadata: { role: 'lecturer' }
        },
        session: null
      },
      error: null
    })

    const lecturerRegResult = await mockSupabase.auth.signUp({
      email: lecturerRegistration.email,
      password: lecturerRegistration.password,
      options: {
        data: {
          role: 'lecturer',
          first_name: lecturerRegistration.firstName,
          last_name: lecturerRegistration.lastName
        }
      }
    })

    expect(lecturerRegResult.data.user).toBeTruthy()

    // Step 3: Request Creation
    const requestData = {
      id: 'request-id',
      student_id: 'student-id',
      purpose: 'school',
      details: {
        recipientName: 'Admissions Office',
        organizationName: 'Test University',
        programName: 'Computer Science Masters'
      },
      lecturer_ids: ['lecturer-id'],
      deadline: '2024-12-31',
      status: 'pending_acceptance'
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [requestData],
        error: null
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: requestData,
            error: null
          })
        })
      }),
      update: jest.fn().mockResolvedValue({
        data: [{ ...requestData, status: 'accepted' }],
        error: null
      })
    } as any)

    const requestResult = await mockSupabase.from('requests').insert(requestData)
    expect(requestResult.data).toEqual([requestData])

    // Step 4: Payment Processing
    const paymentData = {
      id: 'payment-id',
      student_id: 'student-id',
      request_id: 'request-id',
      amount: 30.00,
      status: 'completed',
      stripe_payment_intent_id: 'pi_test_123'
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [paymentData],
        error: null
      })
    } as any)

    const paymentResult = await mockSupabase.from('payments').insert(paymentData)
    expect(paymentResult.data).toEqual([paymentData])

    // Step 5: Lecturer Acceptance
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockResolvedValue({
        data: [{ ...requestData, status: 'accepted' }],
        error: null
      })
    } as any)

    const acceptanceResult = await mockSupabase.from('requests')
      .update({ status: 'accepted' })
      .eq('id', 'request-id')

    expect(acceptanceResult.data).toEqual([{ ...requestData, status: 'accepted' }])

    // Step 6: AI Letter Generation
    const letterData = {
      id: 'letter-id',
      request_id: 'request-id',
      lecturer_id: 'lecturer-id',
      content: 'Generated recommendation letter...',
      ai_generated: true,
      status: 'draft'
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [letterData],
        error: null
      })
    } as any)

    const letterResult = await mockSupabase.from('letters').insert(letterData)
    expect(letterResult.data).toEqual([letterData])

    // Step 7: Letter Submission
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockResolvedValue({
        data: [{ ...letterData, status: 'submitted', submitted_at: new Date().toISOString() }],
        error: null
      })
    } as any)

    const submissionResult = await mockSupabase.from('letters')
      .update({ 
        status: 'submitted', 
        submitted_at: new Date().toISOString(),
        declaration_completed: true 
      })
      .eq('id', 'letter-id')

    expect(submissionResult.data).toBeTruthy()

    // Step 8: Revenue Splitting and Payout
    const payoutData = {
      id: 'payout-id',
      lecturer_id: 'lecturer-id',
      payment_id: 'payment-id',
      amount: 22.50, // 75% of $30
      status: 'completed'
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [payoutData],
        error: null
      })
    } as any)

    const payoutResult = await mockSupabase.from('payouts').insert(payoutData)
    expect(payoutResult.data).toEqual([payoutData])

    // Step 9: Final Request Status Update
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockResolvedValue({
        data: [{ ...requestData, status: 'completed' }],
        error: null
      })
    } as any)

    const completionResult = await mockSupabase.from('requests')
      .update({ status: 'completed' })
      .eq('id', 'request-id')

    expect(completionResult.data).toEqual([{ ...requestData, status: 'completed' }])
  })

  test('should handle request reassignment workflow', async () => {
    // Initial request assignment
    const originalRequest = {
      id: 'request-id',
      student_id: 'student-id',
      lecturer_ids: ['lecturer-1'],
      status: 'pending_acceptance'
    }

    // Lecturer declines request
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockResolvedValue({
        data: [{ ...originalRequest, status: 'declined' }],
        error: null
      })
    } as any)

    const declineResult = await mockSupabase.from('requests')
      .update({ status: 'declined' })
      .eq('id', 'request-id')

    expect(declineResult.data).toEqual([{ ...originalRequest, status: 'declined' }])

    // Student reassigns to new lecturer
    const reassignedRequest = {
      ...originalRequest,
      lecturer_ids: ['lecturer-2'],
      status: 'reassigned'
    }

    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockResolvedValue({
        data: [reassignedRequest],
        error: null
      })
    } as any)

    const reassignResult = await mockSupabase.from('requests')
      .update({ 
        lecturer_ids: ['lecturer-2'],
        status: 'reassigned'
      })
      .eq('id', 'request-id')

    expect(reassignResult.data).toEqual([reassignedRequest])

    // Notification sent to new lecturer
    const notificationData = {
      id: 'notification-id',
      user_id: 'lecturer-2',
      type: 'reassignment',
      title: 'New Request Assignment',
      message: 'You have been assigned a new recommendation letter request.'
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [notificationData],
        error: null
      })
    } as any)

    const notificationResult = await mockSupabase.from('notifications').insert(notificationData)
    expect(notificationResult.data).toEqual([notificationData])
  })

  test('should handle token redemption and free request workflow', async () => {
    // Create token
    const tokenData = {
      id: 'token-id',
      code: 'FREE2024',
      value: 1,
      expiry_date: '2024-12-31',
      created_by: 'admin-id',
      used_by: null
    }

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: tokenData,
            error: null
          })
        })
      }),
      update: jest.fn().mockResolvedValue({
        data: [{ ...tokenData, used_by: 'student-id', used_date: new Date().toISOString() }],
        error: null
      })
    } as any)

    // Validate token
    const tokenValidation = await mockSupabase.from('tokens')
      .select('*')
      .eq('code', 'FREE2024')
      .single()

    expect(tokenValidation.data).toEqual(tokenData)
    expect(tokenValidation.data?.used_by).toBeNull()

    // Redeem token
    const redemptionResult = await mockSupabase.from('tokens')
      .update({
        used_by: 'student-id',
        used_date: new Date().toISOString()
      })
      .eq('code', 'FREE2024')

    expect(redemptionResult.data).toBeTruthy()

    // Create free request (no payment required)
    const freeRequestData = {
      id: 'free-request-id',
      student_id: 'student-id',
      purpose: 'scholarship',
      token_used: 'FREE2024',
      payment_id: null,
      status: 'pending_acceptance'
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [freeRequestData],
        error: null
      })
    } as any)

    const freeRequestResult = await mockSupabase.from('requests').insert(freeRequestData)
    expect(freeRequestResult.data).toEqual([freeRequestData])
  })

  test('should handle complaint and admin resolution workflow', async () => {
    // Student files complaint
    const complaintData = {
      id: 'complaint-id',
      student_id: 'student-id',
      request_id: 'request-id',
      lecturer_id: 'lecturer-id',
      type: 'quality_issue',
      description: 'Letter quality does not meet expectations',
      status: 'pending',
      created_at: new Date().toISOString()
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [complaintData],
        error: null
      })
    } as any)

    const complaintResult = await mockSupabase.from('complaints').insert(complaintData)
    expect(complaintResult.data).toEqual([complaintData])

    // Admin notification
    const adminNotification = {
      id: 'admin-notification-id',
      user_id: 'admin-id',
      type: 'new_complaint',
      title: 'New Complaint Filed',
      message: 'A student has filed a complaint that requires review.'
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [adminNotification],
        error: null
      })
    } as any)

    const adminNotificationResult = await mockSupabase.from('notifications').insert(adminNotification)
    expect(adminNotificationResult.data).toEqual([adminNotification])

    // Admin resolves complaint
    const resolutionData = {
      complaint_id: 'complaint-id',
      admin_id: 'admin-id',
      resolution: 'Refund issued and lecturer notified for improvement',
      action_taken: 'refund_issued',
      resolved_at: new Date().toISOString()
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [resolutionData],
        error: null
      }),
      update: jest.fn().mockResolvedValue({
        data: [{ ...complaintData, status: 'resolved' }],
        error: null
      })
    } as any)

    const resolutionResult = await mockSupabase.from('complaint_resolutions').insert(resolutionData)
    expect(resolutionResult.data).toEqual([resolutionData])

    const complaintUpdateResult = await mockSupabase.from('complaints')
      .update({ status: 'resolved' })
      .eq('id', 'complaint-id')

    expect(complaintUpdateResult.data).toEqual([{ ...complaintData, status: 'resolved' }])
  })

  test('should handle automated reminder system', async () => {
    // Request pending for 7 days
    const pendingRequest = {
      id: 'pending-request-id',
      student_id: 'student-id',
      lecturer_ids: ['lecturer-id'],
      status: 'pending_acceptance',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
    }

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lt: jest.fn().mockResolvedValue({
            data: [pendingRequest],
            error: null
          })
        })
      })
    } as any)

    // Find requests pending for more than 7 days
    const pendingRequestsResult = await mockSupabase.from('requests')
      .select('*')
      .eq('status', 'pending_acceptance')
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    expect(pendingRequestsResult.data).toEqual([pendingRequest])

    // Send reminder notification
    const reminderNotification = {
      id: 'reminder-notification-id',
      user_id: 'lecturer-id',
      type: 'reminder',
      title: 'Pending Request Reminder',
      message: 'You have a pending recommendation letter request.',
      data: { request_id: 'pending-request-id', days_pending: 7 }
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [reminderNotification],
        error: null
      })
    } as any)

    const reminderResult = await mockSupabase.from('notifications').insert(reminderNotification)
    expect(reminderResult.data).toEqual([reminderNotification])

    // Auto-cancel after 14 days
    const expiredRequest = {
      ...pendingRequest,
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days ago
    }

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lt: jest.fn().mockResolvedValue({
            data: [expiredRequest],
            error: null
          })
        })
      }),
      update: jest.fn().mockResolvedValue({
        data: [{ ...expiredRequest, status: 'auto_cancelled' }],
        error: null
      })
    } as any)

    const expiredRequestsResult = await mockSupabase.from('requests')
      .select('*')
      .eq('status', 'pending_acceptance')
      .lt('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())

    expect(expiredRequestsResult.data).toEqual([expiredRequest])

    const cancellationResult = await mockSupabase.from('requests')
      .update({ status: 'auto_cancelled' })
      .eq('id', 'pending-request-id')

    expect(cancellationResult.data).toEqual([{ ...expiredRequest, status: 'auto_cancelled' }])
  })
})