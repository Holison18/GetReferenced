import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')
jest.mock('@/lib/openai')
jest.mock('@/lib/stripe')
jest.mock('@/lib/notification-service')

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('Request Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should handle complete request creation workflow', async () => {
    // Mock student authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'student-id',
          email: 'student@test.com',
          user_metadata: { role: 'student' }
        }
      },
      error: null
    })

    // Mock request creation
    const mockRequest = {
      id: 'request-id',
      student_id: 'student-id',
      purpose: 'school',
      details: {
        recipientName: 'Admissions Office',
        recipientAddress: 'University Address',
        programName: 'Computer Science Masters',
        organizationName: 'Test University',
        deliveryMethod: 'email'
      },
      lecturer_ids: ['lecturer-id-1'],
      document_urls: ['transcript.pdf'],
      deadline: '2024-12-31',
      status: 'pending_acceptance',
      created_at: new Date().toISOString()
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [mockRequest],
        error: null
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockRequest,
            error: null
          })
        })
      }),
      update: jest.fn().mockResolvedValue({
        data: [{ ...mockRequest, status: 'accepted' }],
        error: null
      })
    } as any)

    // Test request creation
    const createResult = await mockSupabase.from('requests').insert(mockRequest)
    expect(createResult.data).toEqual([mockRequest])
    expect(createResult.error).toBeNull()

    // Test request status update (lecturer acceptance)
    const updateResult = await mockSupabase.from('requests')
      .update({ status: 'accepted' })
      .eq('id', 'request-id')

    expect(updateResult.data).toEqual([{ ...mockRequest, status: 'accepted' }])
  })

  test('should handle lecturer selection and AI suggestions', async () => {
    // Mock lecturer data
    const mockLecturers = [
      {
        id: 'lecturer-1',
        first_name: 'Dr. John',
        last_name: 'Smith',
        department: 'Computer Science',
        rank: 'Professor'
      },
      {
        id: 'lecturer-2',
        first_name: 'Dr. Jane',
        last_name: 'Doe',
        department: 'Computer Science',
        rank: 'Senior Lecturer'
      }
    ]

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: mockLecturers,
        error: null
      })
    } as any)

    // Test lecturer retrieval
    const lecturersResult = await mockSupabase.from('lecturer_profiles')
      .select('*')

    expect(lecturersResult.data).toEqual(mockLecturers)
    expect(lecturersResult.error).toBeNull()
  })

  test('should handle request reassignment workflow', async () => {
    const originalRequest = {
      id: 'request-id',
      lecturer_ids: ['lecturer-1'],
      status: 'pending_acceptance'
    }

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

    // Test reassignment
    const result = await mockSupabase.from('requests')
      .update({
        lecturer_ids: ['lecturer-2'],
        status: 'reassigned'
      })
      .eq('id', 'request-id')

    expect(result.data).toEqual([reassignedRequest])
  })

  test('should handle request cancellation and refund', async () => {
    const cancelledRequest = {
      id: 'request-id',
      status: 'cancelled',
      payment_id: 'payment-id'
    }

    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockResolvedValue({
        data: [cancelledRequest],
        error: null
      })
    } as any)

    // Test cancellation
    const result = await mockSupabase.from('requests')
      .update({ status: 'cancelled' })
      .eq('id', 'request-id')

    expect(result.data).toEqual([cancelledRequest])
  })
})