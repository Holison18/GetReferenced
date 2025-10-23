import { 
  checkPermission,
  validateServerSession
} from '../../lib/server-auth'

// Mock the auth module
const mockGetUserWithProfile = jest.fn()
const mockCreateServerSupabaseClient = jest.fn()

jest.mock('../../lib/auth', () => ({
  getUserWithProfile: () => mockGetUserWithProfile(),
  createServerSupabaseClient: () => mockCreateServerSupabaseClient()
}))

// Mock Next.js navigation
const mockRedirect = jest.fn()
jest.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url)
}))

describe('Server Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkPermission', () => {
    it('should grant admin full permissions', () => {
      expect(checkPermission('admin', 'requests', 'read')).toBe(true)
      expect(checkPermission('admin', 'requests', 'write')).toBe(true)
      expect(checkPermission('admin', 'requests', 'delete')).toBe(true)
      expect(checkPermission('admin', 'requests', 'admin')).toBe(true)
      expect(checkPermission('admin', 'any-resource', 'admin')).toBe(true)
    })

    it('should grant lecturer appropriate permissions', () => {
      expect(checkPermission('lecturer', 'requests', 'read')).toBe(true)
      expect(checkPermission('lecturer', 'requests', 'write')).toBe(true)
      expect(checkPermission('lecturer', 'letters', 'read')).toBe(true)
      expect(checkPermission('lecturer', 'letters', 'write')).toBe(true)
      expect(checkPermission('lecturer', 'notifications', 'read')).toBe(true)
      expect(checkPermission('lecturer', 'profile', 'read')).toBe(true)
      expect(checkPermission('lecturer', 'profile', 'write')).toBe(true)
      expect(checkPermission('lecturer', 'students', 'read')).toBe(true)
    })

    it('should deny lecturer inappropriate permissions', () => {
      expect(checkPermission('lecturer', 'requests', 'delete')).toBe(false)
      expect(checkPermission('lecturer', 'requests', 'admin')).toBe(false)
      expect(checkPermission('lecturer', 'notifications', 'write')).toBe(false)
      expect(checkPermission('lecturer', 'payments', 'read')).toBe(false)
      expect(checkPermission('lecturer', 'unknown-resource', 'read')).toBe(false)
    })

    it('should grant student appropriate permissions', () => {
      expect(checkPermission('student', 'requests', 'read')).toBe(true)
      expect(checkPermission('student', 'requests', 'write')).toBe(true)
      expect(checkPermission('student', 'notifications', 'read')).toBe(true)
      expect(checkPermission('student', 'profile', 'read')).toBe(true)
      expect(checkPermission('student', 'profile', 'write')).toBe(true)
      expect(checkPermission('student', 'payments', 'read')).toBe(true)
      expect(checkPermission('student', 'payments', 'write')).toBe(true)
    })

    it('should deny student inappropriate permissions', () => {
      expect(checkPermission('student', 'letters', 'read')).toBe(false)
      expect(checkPermission('student', 'letters', 'write')).toBe(false)
      expect(checkPermission('student', 'requests', 'delete')).toBe(false)
      expect(checkPermission('student', 'requests', 'admin')).toBe(false)
      expect(checkPermission('student', 'students', 'read')).toBe(false)
    })

    it('should handle invalid roles', () => {
      expect(checkPermission('invalid-role', 'requests', 'read')).toBe(false)
      expect(checkPermission('', 'requests', 'read')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(checkPermission('student', '', 'read')).toBe(false)
      expect(checkPermission('student', 'requests', 'invalid' as any)).toBe(false)
    })
  })

  describe('validateServerSession', () => {
    const mockSupabaseClient = {
      auth: {
        getSession: jest.fn()
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    }

    beforeEach(() => {
      jest.clearAllMocks()
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)
    })

    it('should return valid session for authenticated user', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      }
      const mockProfile = {
        id: 'user-123',
        role: 'student',
        first_name: 'John',
        last_name: 'Doe'
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockProfile })
          })
        })
      })

      const result = await validateServerSession()

      expect(result.valid).toBe(true)
      expect(result.user).toEqual(mockSession.user)
      expect(result.profile).toEqual(mockProfile)
      expect(result.session).toEqual(mockSession)
    })

    it('should return invalid for no session', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await validateServerSession()

      expect(result.valid).toBe(false)
      expect(result.user).toBeNull()
      expect(result.profile).toBeNull()
      expect(result.session).toBeNull()
    })

    it('should return invalid for session error', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session error')
      })

      const result = await validateServerSession()

      expect(result.valid).toBe(false)
      expect(result.user).toBeNull()
      expect(result.profile).toBeNull()
      expect(result.session).toBeNull()
    })

    it('should return invalid for expired session', async () => {
      const expiredSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: expiredSession },
        error: null
      })

      const result = await validateServerSession()

      expect(result.valid).toBe(false)
      expect(result.user).toBeNull()
      expect(result.profile).toBeNull()
      expect(result.session).toBeNull()
    })

    it('should handle profile fetch errors gracefully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: new Error('Profile not found') })
          })
        })
      })

      const result = await validateServerSession()

      expect(result.valid).toBe(true)
      expect(result.user).toEqual(mockSession.user)
      expect(result.profile).toBeNull()
      expect(result.session).toEqual(mockSession)
    })

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error('Unexpected error'))

      const result = await validateServerSession()

      expect(result.valid).toBe(false)
      expect(result.user).toBeNull()
      expect(result.profile).toBeNull()
      expect(result.session).toBeNull()
    })
  })
})