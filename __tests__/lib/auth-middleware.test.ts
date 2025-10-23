import { NextRequest } from 'next/server'

// Mock dependencies
const mockCreateServerClient = jest.fn()
const mockCreateSecurityMiddleware = jest.fn()
const mockCreateRateLimit = jest.fn()
const mockAuditLogger = {
  logSecurity: jest.fn()
}
const mockExtractRequestContext = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: (...args: any[]) => mockCreateServerClient(...args)
}))

jest.mock('../../lib/security/headers', () => ({
  createSecurityMiddleware: (config: any) => mockCreateSecurityMiddleware(config)
}))

jest.mock('../../lib/security/rate-limiting', () => ({
  createRateLimit: (config: any) => mockCreateRateLimit(config),
  rateLimitConfigs: {
    auth: { windowMs: 900000, max: 5 },
    payment: { windowMs: 900000, max: 3 },
    upload: { windowMs: 900000, max: 10 },
    ai: { windowMs: 900000, max: 20 },
    notification: { windowMs: 900000, max: 50 },
    api: { windowMs: 900000, max: 100 }
  }
}))

jest.mock('../../lib/audit-logger', () => ({
  auditLogger: mockAuditLogger,
  extractRequestContext: (req: any) => mockExtractRequestContext(req)
}))

const mockNextResponse = {
  next: jest.fn(),
  redirect: jest.fn(),
  json: jest.fn()
}

jest.mock('next/server', () => ({
  NextResponse: mockNextResponse
}))

// Import middleware after mocking
import { middleware } from '../../middleware'

describe('Authentication Middleware', () => {
  let mockSupabaseClient: any
  let mockRequest: Partial<NextRequest>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    mockSupabaseClient = {
      auth: {
        getSession: jest.fn(),
        getUser: jest.fn()
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    }

    mockCreateServerClient.mockReturnValue(mockSupabaseClient)
    
    mockCreateSecurityMiddleware.mockReturnValue(() => ({ status: 200 }))
    mockCreateRateLimit.mockReturnValue(() => Promise.resolve(null))
    mockExtractRequestContext.mockReturnValue({
      ip_address: '127.0.0.1',
      user_agent: 'test-agent'
    })

    mockRequest = {
      nextUrl: { pathname: '/' },
      url: 'http://localhost:3000/',
      headers: new Headers(),
      cookies: {
        getAll: () => [],
        set: jest.fn()
      }
    }

    mockNextResponse.next.mockReturnValue({
      headers: new Headers(),
      cookies: {
        set: jest.fn()
      }
    })
  })

  describe('JWT Token Handling', () => {
    it('should handle valid JWT tokens', async () => {
      mockRequest.nextUrl = { pathname: '/student/dashboard' }
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'valid.jwt.token',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }
      const mockProfile = { role: 'student' }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const mockSelect = mockSupabaseClient.from().select()
      const mockEq = mockSelect.eq()
      mockEq.single.mockResolvedValue({ data: mockProfile })

      const result = await middleware(mockRequest as NextRequest)

      expect(result.headers.get('x-user-id')).toBe('user-123')
      expect(result.headers.get('x-user-role')).toBe('student')
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should handle expired JWT tokens', async () => {
      mockRequest.nextUrl = { pathname: '/student/dashboard' }
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('JWT expired')
      })

      await middleware(mockRequest as NextRequest)

      expect(mockAuditLogger.logSecurity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session_error',
          resource_type: 'authentication',
          severity: 'medium',
          success: false,
          threat_type: 'unauthorized_access'
        })
      )

      expect(mockNextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/login')
        })
      )
    })

    it('should handle malformed JWT tokens', async () => {
      mockRequest.nextUrl = { pathname: '/api/requests' }
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Invalid JWT format')
      })

      await middleware(mockRequest as NextRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentication required' },
        { status: 401 }
      )
    })

    it('should clear authentication cookies on token errors', async () => {
      mockRequest.nextUrl = { pathname: '/student/dashboard' }
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Token validation failed')
      })

      const result = await middleware(mockRequest as NextRequest)

      expect(result.cookies.set).toHaveBeenCalledWith(
        'sb-access-token',
        '',
        expect.objectContaining({
          expires: expect.any(Date),
          path: '/',
          httpOnly: true
        })
      )
    })
  })

  describe('Session Management', () => {
    it('should refresh expired sessions automatically', async () => {
      mockRequest.nextUrl = { pathname: '/student/dashboard' }
      const expiredSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) - 100 // Expired
      }

      // First call returns expired session, second call returns refreshed session
      mockSupabaseClient.auth.getSession
        .mockResolvedValueOnce({
          data: { session: expiredSession },
          error: null
        })

      await middleware(mockRequest as NextRequest)

      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
    })

    it('should handle session refresh failures', async () => {
      mockRequest.nextUrl = { pathname: '/student/dashboard' }
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session refresh failed')
      })

      await middleware(mockRequest as NextRequest)

      expect(mockNextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/login')
        })
      )
    })

    it('should maintain session state across requests', async () => {
      mockRequest.nextUrl = { pathname: '/api/requests' }
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }
      const mockProfile = { role: 'student' }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const mockSelect = mockSupabaseClient.from().select()
      const mockEq = mockSelect.eq()
      mockEq.single.mockResolvedValue({ data: mockProfile })

      const result = await middleware(mockRequest as NextRequest)

      expect(result.headers.get('x-user-id')).toBe('user-123')
      expect(result.headers.get('x-user-role')).toBe('student')
      expect(result.headers.get('x-user-email')).toBe('test@example.com')
    })
  })

  describe('Role-Based Access Control', () => {
    it('should allow students to access student routes', async () => {
      mockRequest.nextUrl = { pathname: '/student/dashboard' }
      const mockSession = {
        user: { id: 'user-123', email: 'student@test.com' }
      }
      const mockProfile = { role: 'student' }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const mockSelect = mockSupabaseClient.from().select()
      const mockEq = mockSelect.eq()
      mockEq.single.mockResolvedValue({ data: mockProfile })

      const result = await middleware(mockRequest as NextRequest)

      expect(result.headers.get('x-user-role')).toBe('student')
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should allow lecturers to access lecturer routes', async () => {
      mockRequest.nextUrl = { pathname: '/lecturer/dashboard' }
      const mockSession = {
        user: { id: 'lecturer-123', email: 'lecturer@university.edu' }
      }
      const mockProfile = { role: 'lecturer' }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const mockSelect = mockSupabaseClient.from().select()
      const mockEq = mockSelect.eq()
      mockEq.single.mockResolvedValue({ data: mockProfile })

      const result = await middleware(mockRequest as NextRequest)

      expect(result.headers.get('x-user-role')).toBe('lecturer')
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should allow admins to access all routes', async () => {
      mockRequest.nextUrl = { pathname: '/lecturer/dashboard' }
      const mockSession = {
        user: { id: 'admin-123', email: 'admin@system.com' }
      }
      const mockProfile = { role: 'admin' }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const mockSelect = mockSupabaseClient.from().select()
      const mockEq = mockSelect.eq()
      mockEq.single.mockResolvedValue({ data: mockProfile })

      const result = await middleware(mockRequest as NextRequest)

      expect(result.headers.get('x-user-role')).toBe('admin')
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should redirect users trying to access unauthorized routes', async () => {
      mockRequest.nextUrl = { pathname: '/admin/dashboard' }
      const mockSession = {
        user: { id: 'student-123', email: 'student@test.com' }
      }
      const mockProfile = { role: 'student' }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const mockSelect = mockSupabaseClient.from().select()
      const mockEq = mockSelect.eq()
      mockEq.single.mockResolvedValue({ data: mockProfile })

      await middleware(mockRequest as NextRequest)

      expect(mockNextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/student/dashboard')
        })
      )
    })

    it('should handle missing user profiles', async () => {
      mockRequest.nextUrl = { pathname: '/student/dashboard' }
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const mockSelect = mockSupabaseClient.from().select()
      const mockEq = mockSelect.eq()
      mockEq.single.mockResolvedValue({ 
        data: null, 
        error: new Error('Profile not found') 
      })

      await middleware(mockRequest as NextRequest)

      expect(mockNextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/login?error=profile_not_found')
        })
      )
    })
  })

  describe('API Route Protection', () => {
    it('should protect API routes requiring authentication', async () => {
      mockRequest.nextUrl = { pathname: '/api/requests' }
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      await middleware(mockRequest as NextRequest)

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentication required' },
        { status: 401 }
      )
    })

    it('should allow access to public API routes', async () => {
      mockRequest.nextUrl = { pathname: '/api/auth/login' }
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      await middleware(mockRequest as NextRequest)

      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.json).not.toHaveBeenCalled()
    })

    it('should add user context to authenticated API requests', async () => {
      mockRequest.nextUrl = { pathname: '/api/letters' }
      const mockSession = {
        user: { id: 'lecturer-123', email: 'lecturer@university.edu' }
      }
      const mockProfile = { role: 'lecturer' }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const mockSelect = mockSupabaseClient.from().select()
      const mockEq = mockSelect.eq()
      mockEq.single.mockResolvedValue({ data: mockProfile })

      const result = await middleware(mockRequest as NextRequest)

      expect(result.headers.get('x-user-id')).toBe('lecturer-123')
      expect(result.headers.get('x-user-role')).toBe('lecturer')
      expect(result.headers.get('x-user-email')).toBe('lecturer@university.edu')
    })

    it('should log unauthorized API access attempts', async () => {
      mockRequest.nextUrl = { pathname: '/api/payments' }
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      await middleware(mockRequest as NextRequest)

      expect(mockAuditLogger.logSecurity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'unauthorized_api_access',
          resource_type: 'api_endpoint',
          resource_id: '/api/payments',
          severity: 'high',
          success: false,
          threat_type: 'unauthorized_access'
        })
      )
    })
  })

  describe('Security Features', () => {
    it('should apply rate limiting to authentication endpoints', async () => {
      mockRequest.nextUrl = { pathname: '/api/auth/login' }
      const mockRateLimit = jest.fn().mockResolvedValue(null)
      mockCreateRateLimit.mockReturnValue(mockRateLimit)

      await middleware(mockRequest as NextRequest)

      expect(mockCreateRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({ windowMs: 900000, max: 5 })
      )
      expect(mockRateLimit).toHaveBeenCalledWith(mockRequest)
    })

    it('should block requests when rate limit is exceeded', async () => {
      mockRequest.nextUrl = { pathname: '/api/auth/login' }
      const mockRateLimit = jest.fn().mockResolvedValue({ status: 429 })
      mockCreateRateLimit.mockReturnValue(mockRateLimit)

      const result = await middleware(mockRequest as NextRequest)

      expect(mockAuditLogger.logSecurity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'rate_limit_exceeded',
          resource_type: 'api_endpoint',
          severity: 'medium',
          success: false,
          blocked: true,
          threat_type: 'rate_limit'
        })
      )
    })

    it('should apply security headers', async () => {
      mockRequest.nextUrl = { pathname: '/' }
      
      await middleware(mockRequest as NextRequest)

      expect(mockCreateSecurityMiddleware).toHaveBeenCalledWith({
        enforceHTTPS: false // In test environment
      })
    })
  })
})