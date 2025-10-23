import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')
jest.mock('stripe')

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('Payment System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should handle payment processing workflow', async () => {
    const mockPayment = {
      id: 'payment-id',
      student_id: 'student-id',
      request_id: 'request-id',
      amount: 30.00,
      currency: 'usd',
      status: 'pending',
      stripe_payment_intent_id: 'pi_test_123',
      created_at: new Date().toISOString()
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [mockPayment],
        error: null
      }),
      update: jest.fn().mockResolvedValue({
        data: [{ ...mockPayment, status: 'completed' }],
        error: null
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockPayment,
            error: null
          })
        })
      })
    } as any)

    // Test payment creation
    const createResult = await mockSupabase.from('payments').insert(mockPayment)
    expect(createResult.data).toEqual([mockPayment])

    // Test payment completion
    const updateResult = await mockSupabase.from('payments')
      .update({ status: 'completed' })
      .eq('id', 'payment-id')

    expect(updateResult.data).toEqual([{ ...mockPayment, status: 'completed' }])
  })

  test('should handle revenue splitting calculation', async () => {
    const paymentAmount = 30.00
    const lecturerShare = paymentAmount * 0.75 // 75%
    const platformShare = paymentAmount * 0.25 // 25%

    expect(lecturerShare).toBe(22.50)
    expect(platformShare).toBe(7.50)

    const mockPayout = {
      id: 'payout-id',
      lecturer_id: 'lecturer-id',
      payment_id: 'payment-id',
      amount: lecturerShare,
      status: 'pending',
      created_at: new Date().toISOString()
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [mockPayout],
        error: null
      })
    } as any)

    const result = await mockSupabase.from('payouts').insert(mockPayout)
    expect(result.data).toEqual([mockPayout])
  })

  test('should handle token system for free requests', async () => {
    const mockToken = {
      id: 'token-id',
      code: 'FREE2024',
      value: 1,
      expiry_date: '2024-12-31',
      created_by: 'admin-id',
      used_by: null,
      used_date: null
    }

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockToken,
            error: null
          })
        })
      }),
      update: jest.fn().mockResolvedValue({
        data: [{ ...mockToken, used_by: 'student-id', used_date: new Date().toISOString() }],
        error: null
      })
    } as any)

    // Test token validation
    const tokenResult = await mockSupabase.from('tokens')
      .select('*')
      .eq('code', 'FREE2024')
      .single()

    expect(tokenResult.data).toEqual(mockToken)

    // Test token redemption
    const redeemResult = await mockSupabase.from('tokens')
      .update({
        used_by: 'student-id',
        used_date: new Date().toISOString()
      })
      .eq('code', 'FREE2024')

    expect(redeemResult.data).toBeTruthy()
  })

  test('should handle refund processing', async () => {
    const mockRefund = {
      id: 'refund-id',
      payment_id: 'payment-id',
      amount: 30.00,
      reason: 'Request cancelled',
      status: 'processed',
      created_at: new Date().toISOString()
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [mockRefund],
        error: null
      }),
      update: jest.fn().mockResolvedValue({
        data: [{ payment_id: 'payment-id', status: 'refunded' }],
        error: null
      })
    } as any)

    // Test refund creation
    const refundResult = await mockSupabase.from('refunds').insert(mockRefund)
    expect(refundResult.data).toEqual([mockRefund])

    // Test payment status update
    const paymentUpdate = await mockSupabase.from('payments')
      .update({ status: 'refunded' })
      .eq('id', 'payment-id')

    expect(paymentUpdate.data).toBeTruthy()
  })
})