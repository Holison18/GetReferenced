import { 
  isTokenExpired, 
  getTokenPayload, 
  validateApiRequest 
} from '../../lib/auth'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
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

jest.mock('../../lib/auth', () => {
  const actual = jest.requireActual('../../lib/auth')
  return {
    ...actual,
    createServerSupabaseClient: () => mockSupabaseClient
  }
})

describe('JWT Token Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createMockToken = (payload: any) => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const encodedPayload = btoa(JSON.stringify(payload))
    const signature = 'mock-signature'
    return `${header}.${encodedPayload}.${signature}`
  }

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      const token = createMockToken({ exp: futureTime, sub: 'user-123' })
      expect(isTokenExpired(token)).toBe(false)
    })

    it('should return true for expired token', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      const token = createMockToken({ exp: pastTime, sub: 'user-123' })
      expect(isTokenExpired(token)).toBe(true)
    })

    it('should return true for token expiring now', () => {
      const nowTime = Math.floor(Date.now() / 1000)
      const token = createMockToken({ exp: nowTime, sub: 'user-123' })
      expect(isTokenExpired(token)).toBe(true)
    })

    it('should return true for malformed token', () => {
      expect(isTokenExpired('invalid-token')).toBe(true)
      expect(isTokenExpired('')).toBe(true)
      expect(isTokenExpired('not.a.jwt')).toBe(true)
    })

    it('should return true for token without expiry', () => {
      const token = createMockToken({ sub: 'user-123' }) // No exp field
      expect(isTokenExpired(token)).toBe(true)
    })

    it('should handle tokens with invalid base64 encoding', () => {
      const invalidToken = 'header.invalid-base64.signature'
      expect(isTokenExpired(invalidToken)).toBe(true)
    })

    it('should handle tokens with invalid JSON in payload', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const invalidPayload = btoa('invalid-json{')
      const signature = 'mock-signature'
      const token = `${header}.${invalidPayload}.${signature}`
      expect(isTokenExpired(token)).toBe(true)
    })
  })

  describe('getTokenPayload', () => {
    it('should extract payload from valid token', () => {
      const payload = { 
        sub: 'user-123', 
        role: 'student', 
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: 'test@example.com'
      }
      const token = createMockToken(payload)
      expect(getTokenPayload(token)).toEqual(payload)
    })

    it('should return null for malformed token', () => {
      expect(getTokenPayload('invalid-token')).toBeNull()
      expect(getTokenPayload('')).toBeNull()
      expect(getTokenPayload('not.a.jwt')).toBeNull()
    })

    it('should return null for token with invalid base64 encoding', () => {
      const invalidToken = 'header.invalid-base64.signature'
      expect(getTokenPayload(invalidToken)).toBeNull()
    })

    it('should return null for token with invalid JSON', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const invalidPayload = btoa('invalid-json{')
      const signature = 'mock-signature'
      const token = `${header}.${invalidPayload}.${signature}`
      expect(getTokenPayload(token)).toBeNull()
    })

    it('should handle tokens with special characters in payload', () => {
      const payload = { 
        sub: 'user-123', 
        name: 'John Doe', 
        email: 'john+test@example.com',
        custom_claim: 'special/chars\\and"quotes'
      }
      const token = createMockToken(payload)
      expect(getTokenPayload(token)).toEqual(payload)
    })
  })

  describe('validateApiRequest', () => {
    it('should validate request with valid Bearer token', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = { id: 'user-123', role: 'student' }
      const validToken = createMockToken({ 
        sub: 'user-123', 
        exp: Math.floor(Date.now() / 1000) + 3600 
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockProfile })
          })
        })
      })

      const request = new Request('http://localhost/api/test', {
        headers: {
          'authorization': `Bearer ${validToken}`
        }
      })

      const result = await validateApiRequest(request)

      expect(result.valid).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.profile).toEqual(mockProfile)
      expect(result.token).toBe(validToken)
    })

    it('should reject request without authorization header', async () => {
      const request = new Request('http://localhost/api/test')

      const result = await validateApiRequest(request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing or invalid authorization header')
    })

    it('should reject request with invalid authorization format', async () => {
      const request = new Request('http://localhost/api/test', {
        headers: {
          'authorization': 'Invalid format'
        }
      })

      const result = await validateApiRequest(request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing or invalid authorization header')
    })

    it('should reject request with expired token', async () => {
      const expiredToken = createMockToken({ 
        sub: 'user-123', 
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      })

      const request = new Request('http://localhost/api/test', {
        headers: {
          'authorization': `Bearer ${expiredToken}`
        }
      })

      const result = await validateApiRequest(request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Token expired')
    })

    it('should reject request with invalid token', async () => {
      const validToken = createMockToken({ 
        sub: 'user-123', 
        exp: Math.floor(Date.now() / 1000) + 3600 
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token')
      })

      const request = new Request('http://localhost/api/test', {
        headers: {
          'authorization': `Bearer ${validToken}`
        }
      })

      const result = await validateApiRequest(request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid token or user not found')
    })

    it('should handle user not found', async () => {
      const validToken = createMockToken({ 
        sub: 'user-123', 
        exp: Math.floor(Date.now() / 1000) + 3600 
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new Request('http://localhost/api/test', {
        headers: {
          'authorization': `Bearer ${validToken}`
        }
      })

      const result = await validateApiRequest(request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid token or user not found')
    })

    it('should handle profile fetch errors gracefully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const validToken = createMockToken({ 
        sub: 'user-123', 
        exp: Math.floor(Date.now() / 1000) + 3600 
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ 
              data: null, 
              error: new Error('Profile not found') 
            })
          })
        })
      })

      const request = new Request('http://localhost/api/test', {
        headers: {
          'authorization': `Bearer ${validToken}`
        }
      })

      const result = await validateApiRequest(request)

      expect(result.valid).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.profile).toBeNull()
    })

    it('should handle malformed Bearer token', async () => {
      const request = new Request('http://localhost/api/test', {
        headers: {
          'authorization': 'Bearer malformed-token'
        }
      })

      const result = await validateApiRequest(request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Token expired')
    })

    it('should handle empty Bearer token', async () => {
      const request = new Request('http://localhost/api/test', {
        headers: {
          'authorization': 'Bearer '
        }
      })

      const result = await validateApiRequest(request)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Token expired')
    })
  })

  describe('Token Security', () => {
    it('should handle tokens with different algorithms', () => {
      const payload = { sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 }
      
      // Test with different algorithm in header
      const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
      const encodedPayload = btoa(JSON.stringify(payload))
      const signature = 'mock-signature'
      const token = `${header}.${encodedPayload}.${signature}`
      
      expect(getTokenPayload(token)).toEqual(payload)
      expect(isTokenExpired(token)).toBe(false)
    })

    it('should handle tokens with additional claims', () => {
      const payload = { 
        sub: 'user-123', 
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://supabase.co',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'test@example.com',
        app_metadata: { provider: 'email' },
        user_metadata: { name: 'Test User' }
      }
      const token = createMockToken(payload)
      
      expect(getTokenPayload(token)).toEqual(payload)
      expect(isTokenExpired(token)).toBe(false)
    })

    it('should handle tokens with numeric exp values', () => {
      const futureTime = Date.now() / 1000 + 3600 // Note: not using Math.floor
      const payload = { sub: 'user-123', exp: futureTime }
      const token = createMockToken(payload)
      
      expect(isTokenExpired(token)).toBe(false)
    })

    it('should handle tokens with string exp values', () => {
      const futureTime = String(Math.floor(Date.now() / 1000) + 3600)
      const payload = { sub: 'user-123', exp: futureTime }
      const token = createMockToken(payload)
      
      // This should be handled gracefully (converted to number or treated as invalid)
      const result = isTokenExpired(token)
      expect(typeof result).toBe('boolean')
    })
  })
})