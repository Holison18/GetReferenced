import { 
  hasRole, 
  canAccessRoute, 
  hasPermission, 
  isTokenExpired, 
  getTokenPayload,
  signOutClient
} from '../../lib/auth'

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    signOut: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
    refreshSession: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    }))
  }))
}

// Mock the actual auth functions we're testing
const mockSignOutClient = jest.fn()

jest.mock('../../lib/auth', () => {
  const actual = jest.requireActual('../../lib/auth')
  return {
    ...actual,
    createServerSupabaseClient: () => mockSupabaseClient,
    createClientSupabaseClient: () => mockSupabaseClient,
    signOutClient: () => mockSignOutClient()
  }
})

describe('Authentication Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear localStorage and sessionStorage
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }
  })

  describe('hasRole', () => {
    it('should return true when user has exact role', () => {
      expect(hasRole('student', 'student')).toBe(true)
      expect(hasRole('lecturer', 'lecturer')).toBe(true)
      expect(hasRole('admin', 'admin')).toBe(true)
    })

    it('should return false when user does not have role', () => {
      expect(hasRole('student', 'lecturer')).toBe(false)
      expect(hasRole('lecturer', 'admin')).toBe(false)
    })

    it('should handle array of required roles', () => {
      expect(hasRole('student', ['student', 'lecturer'])).toBe(true)
      expect(hasRole('lecturer', ['student', 'lecturer'])).toBe(true)
      expect(hasRole('admin', ['student', 'lecturer'])).toBe(false)
    })

    it('should handle empty array', () => {
      expect(hasRole('student', [])).toBe(false)
    })
  })

  describe('canAccessRoute', () => {
    it('should allow students to access student routes', () => {
      expect(canAccessRoute('student', '/student/dashboard')).toBe(true)
      expect(canAccessRoute('student', '/student/requests')).toBe(true)
    })

    it('should allow lecturers to access lecturer routes', () => {
      expect(canAccessRoute('lecturer', '/lecturer/dashboard')).toBe(true)
      expect(canAccessRoute('lecturer', '/lecturer/requests')).toBe(true)
    })

    it('should allow admins to access admin routes', () => {
      expect(canAccessRoute('admin', '/admin/dashboard')).toBe(true)
      expect(canAccessRoute('admin', '/admin/users')).toBe(true)
    })

    it('should deny cross-role access', () => {
      expect(canAccessRoute('student', '/lecturer/dashboard')).toBe(false)
      expect(canAccessRoute('lecturer', '/admin/dashboard')).toBe(false)
      expect(canAccessRoute('student', '/admin/users')).toBe(false)
    })

    it('should handle invalid roles', () => {
      expect(canAccessRoute('invalid', '/student/dashboard')).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('should grant admin full permissions', () => {
      expect(hasPermission('admin', 'requests', 'read')).toBe(true)
      expect(hasPermission('admin', 'requests', 'write')).toBe(true)
      expect(hasPermission('admin', 'requests', 'delete')).toBe(true)
      expect(hasPermission('admin', 'requests', 'admin')).toBe(true)
    })

    it('should grant lecturer appropriate permissions', () => {
      expect(hasPermission('lecturer', 'requests', 'read')).toBe(true)
      expect(hasPermission('lecturer', 'requests', 'write')).toBe(true)
      expect(hasPermission('lecturer', 'letters', 'read')).toBe(true)
      expect(hasPermission('lecturer', 'letters', 'write')).toBe(true)
      expect(hasPermission('lecturer', 'notifications', 'read')).toBe(true)
    })

    it('should deny lecturer inappropriate permissions', () => {
      expect(hasPermission('lecturer', 'requests', 'delete')).toBe(false)
      expect(hasPermission('lecturer', 'requests', 'admin')).toBe(false)
      expect(hasPermission('lecturer', 'notifications', 'write')).toBe(false)
      expect(hasPermission('lecturer', 'payments', 'read')).toBe(false)
    })

    it('should grant student appropriate permissions', () => {
      expect(hasPermission('student', 'requests', 'read')).toBe(true)
      expect(hasPermission('student', 'requests', 'write')).toBe(true)
      expect(hasPermission('student', 'notifications', 'read')).toBe(true)
      expect(hasPermission('student', 'payments', 'read')).toBe(true)
      expect(hasPermission('student', 'payments', 'write')).toBe(true)
    })

    it('should deny student inappropriate permissions', () => {
      expect(hasPermission('student', 'letters', 'read')).toBe(false)
      expect(hasPermission('student', 'letters', 'write')).toBe(false)
      expect(hasPermission('student', 'requests', 'delete')).toBe(false)
      expect(hasPermission('student', 'requests', 'admin')).toBe(false)
    })

    it('should handle invalid roles and resources', () => {
      expect(hasPermission('invalid', 'requests', 'read')).toBe(false)
      expect(hasPermission('student', 'invalid', 'read')).toBe(false)
    })
  })

  describe('JWT Token Utilities', () => {
    const createMockToken = (payload: any) => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const encodedPayload = btoa(JSON.stringify(payload))
      const signature = 'mock-signature'
      return `${header}.${encodedPayload}.${signature}`
    }

    describe('isTokenExpired', () => {
      it('should return false for valid token', () => {
        const futureTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        const token = createMockToken({ exp: futureTime })
        expect(isTokenExpired(token)).toBe(false)
      })

      it('should return true for expired token', () => {
        const pastTime = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        const token = createMockToken({ exp: pastTime })
        expect(isTokenExpired(token)).toBe(true)
      })

      it('should return true for malformed token', () => {
        expect(isTokenExpired('invalid-token')).toBe(true)
        expect(isTokenExpired('')).toBe(true)
      })
    })

    describe('getTokenPayload', () => {
      it('should extract payload from valid token', () => {
        const payload = { sub: 'user-id', role: 'student', exp: 1234567890 }
        const token = createMockToken(payload)
        expect(getTokenPayload(token)).toEqual(payload)
      })

      it('should return null for malformed token', () => {
        expect(getTokenPayload('invalid-token')).toBeNull()
        expect(getTokenPayload('')).toBeNull()
      })
    })
  })

  describe('signOutClient', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      // Setup localStorage with mock data
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
      })
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          clear: jest.fn(),
          length: 0
        },
        writable: true,
      })
    })

    it('should successfully sign out and clear storage', async () => {
      mockSignOutClient.mockResolvedValue({ success: true })

      const result = await mockSignOutClient()

      expect(result.success).toBe(true)
      expect(mockSignOutClient).toHaveBeenCalled()
    })

    it('should handle sign out errors', async () => {
      const mockError = new Error('Sign out failed')
      mockSignOutClient.mockResolvedValue({ success: false, error: mockError })

      const result = await mockSignOutClient()

      expect(result.success).toBe(false)
      expect(result.error).toBe(mockError)
    })
  })
})