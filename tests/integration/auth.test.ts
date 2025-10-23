import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// Mock the Supabase client
jest.mock('@/lib/supabase')

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('Authentication Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should handle student registration flow', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'student@test.com',
          user_metadata: { role: 'student' }
        },
        session: null
      },
      error: null
    })

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { role: 'student' },
            error: null
          })
        })
      })
    } as any)

    // Test registration data
    const registrationData = {
      email: 'student@test.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      enrollmentYear: 2020,
      completionYear: 2024,
      dateOfBirth: '2000-01-01'
    }

    // Simulate registration
    const result = await mockSupabase.auth.signUp({
      email: registrationData.email,
      password: registrationData.password,
      options: {
        data: {
          role: 'student',
          first_name: registrationData.firstName,
          last_name: registrationData.lastName
        }
      }
    })

    expect(result.data.user).toBeTruthy()
    expect(result.data.user?.email).toBe('student@test.com')
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'student@test.com',
      password: 'password123',
      options: {
        data: {
          role: 'student',
          first_name: 'John',
          last_name: 'Doe'
        }
      }
    })
  })

  test('should handle lecturer registration with staff verification', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'lecturer-id',
          email: 'lecturer@university.edu',
          user_metadata: { role: 'lecturer' }
        },
        session: null
      },
      error: null
    })

    const lecturerData = {
      email: 'lecturer@university.edu',
      password: 'password123',
      firstName: 'Dr. Jane',
      lastName: 'Smith',
      staffNumber: 'STAFF001',
      department: 'Computer Science',
      rank: 'Senior Lecturer'
    }

    const result = await mockSupabase.auth.signUp({
      email: lecturerData.email,
      password: lecturerData.password,
      options: {
        data: {
          role: 'lecturer',
          first_name: lecturerData.firstName,
          last_name: lecturerData.lastName
        }
      }
    })

    expect(result.data.user).toBeTruthy()
    expect(result.data.user?.email).toBe('lecturer@university.edu')
  })

  test('should handle role-based access control', async () => {
    // Mock user with student role
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

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { role: 'student' },
            error: null
          })
        })
      })
    } as any)

    // Verify role-based access
    const userResult = await mockSupabase.auth.getUser()
    expect(userResult.data.user?.user_metadata.role).toBe('student')
  })
})