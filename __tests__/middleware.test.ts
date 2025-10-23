import { NextRequest } from 'next/server'

// Mock dependencies first
const mockCreateServerClient = jest.fn()
const mockCreateSecurityMidt = jest.fn()
const mockCreateSecurityMiddleware = jest.fn()
const mockCreateRateLimit = jest.fn()
const mockAuditLogger = {
  logSecurity: jest.fn()
}
const mockExtractRequestContext = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: (...args: any[]) => mockCreateServerClient(...args)
}))

jest.mock('../lib/security/headers', () => ({
  createSecurityMiddleware: (config: any) => mockCreateSecurityMiddleware(config)
}))

jest.mock('../lib/security/rate-limiting', () => ({
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

jest.mock('../lib/audit-logger', () => ({
  auditLogger: mockAuditLogger,
  extractRequestContext: (req: any) => mockExtractRequestContext(req)
}))

// Mock NextResponse
const mockNextResponse = {
  next: jest.fn(),
  redirect: jest.fn(),
  json: jest.fn()
}

jest.mock('next/server', () => ({
  NextResponse: mockNextResponse
}))

// Import middleware after mocking
import { middleware } from '../middleware'

describe('Middleware', () => {
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

  describe('Public Routes', () => {
    it('should allow access to public routes without authentication', async () => {
      mockRequest.nextUrl = { pathname: '/' }
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      await middleware(mockRequest as NextRequest)

      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should allow access to about page', async () => {
      mockRequest.nextUrl = { pathname: '/about' }
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      await middleware(mockRequest as NextRequest)

      expect(mockNextResponse.next).toHaveBeenCalled()
    })
  })

  describe('Authentication Routes', () => {
    it('should allow unauthenticated users to access login page', async () => {
      mockRequest.nextUrl = { pathname: '/login' }
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      await middleware(mockRequest as NextRequest)

      expect(mockNextResponse.next).toHaveBeenCalled()
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should redirect authenticated users away from auth pages', async () => {
      mockRequest.nextUrl = { pathname: '/login' }
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
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
  })

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', async () => {
      mockRequest.nextUrl = { pathname: '/student/dashboard' }
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      await middleware(mockRequest as NextRequest)

      expect(mockNextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/login')
        })
      )
    })

    it('should allow users to access their role-specific routes', async () => {
      mockRequest.nextUrl = { pathname: '/student/dashboard' }
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
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

    it('should redirect users trying to access wrong role routes', async () => {
      mockRequest.nextUrl = { pathname: '/lecturer/dashboard' }
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
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

    it('should allow admin to access all routes', async () => {
      mockRequest.nextUrl = { pathname: '/lecturer/dashboard' }
      const mockSession = {
        user: { id: 'admin-123', email: 'admin@example.com' }
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
  })

  describe('API Routes', () => {
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

    it('should require authentication for protected API routes', async () => {
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

    it('should add user context headers for authenticated API requests', async () => {
      mockRequest.nextUrl = { pathname: '/api/requests' }
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
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

  describe('Session Error Handling', () => {
    it('should handle session errors and redirect to login', async () => {
      mockRequest.nextUrl = { pathname: '/student/dashboard' }
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Invalid JWT')
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

    it('should clear cookies on session error', async () => {
      mockRequest.nextUrl = { pathname: '/student/dashboard' }
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Token expired')
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

  describe('Rate Limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      mockRequest.nextUrl = { pathname: '/api/auth/login' }
      const mockRateLimit = jest.fn().mockResolvedValue({ status: 429 })
      mockCreateRateLimit.mockReturnValue(mockRateLimit)

      await middleware(mockRequest as NextRequest)

      expect(mockCreateRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({ windowMs: 900000, max: 5 })
      )
      expect(mockRateLimit).toHaveBeenCalledWith(mockRequest)
    })

    it('should log rate limit violations', async () => {
      mockRequest.nextUrl = { pathname: '/api/payments' }
      const mockRateLimit = jest.fn().mockResolvedValue({ status: 429 })
      mockCreateRateLimit.mockReturnValue(mockRateLimit)

      await middleware(mockRequest as NextRequest)

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
  })

  describe('Profile Errors', () => {
    it('should handle profile fetch errors', async () => {
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
})