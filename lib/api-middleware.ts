import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string
    email: string
    role: string
  }
  profile: any
}

/**
 * Middleware to authenticate API requests
 */
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const cookieStore = cookies()
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            },
          },
        }
      )

      // Get session from cookies or Authorization header
      let session = null
      let sessionError = null

      // Try to get session from cookies first
      const sessionResult = await supabase.auth.getSession()
      session = sessionResult.data.session
      sessionError = sessionResult.error

      // If no session from cookies, try Authorization header
      if (!session) {
        const authHeader = req.headers.get('authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7)
          const { data, error } = await supabase.auth.getUser(token)
          if (!error && data.user) {
            // Create a mock session for API requests with Bearer token
            session = {
              user: data.user,
              access_token: token,
              expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
            } as any
          }
        }
      }

      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Check if session is expired
      const now = Math.floor(Date.now() / 1000)
      if (session.expires_at && session.expires_at < now) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        )
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileError || !profile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }

      // Add user data to request
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = {
        id: session.user.id,
        email: session.user.email || '',
        role: profile.role
      }
      authenticatedReq.profile = profile

      return handler(authenticatedReq)

    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware to check role-based permissions
 */
export function withRole(
  requiredRole: string | string[],
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    const userRole = req.user.role
    const hasRequiredRole = Array.isArray(requiredRole)
      ? requiredRole.includes(userRole)
      : userRole === requiredRole

    if (!hasRequiredRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return handler(req)
  })
}

/**
 * Middleware to check resource permissions
 */
export function withPermission(
  resource: string,
  action: 'read' | 'write' | 'delete' | 'admin',
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    const hasPermission = checkApiPermission(req.user.role, resource, action)

    if (!hasPermission) {
      return NextResponse.json(
        { error: `Permission denied: cannot ${action} ${resource}` },
        { status: 403 }
      )
    }

    return handler(req)
  })
}

/**
 * Check API permissions
 */
function checkApiPermission(
  userRole: string,
  resource: string,
  action: 'read' | 'write' | 'delete' | 'admin'
): boolean {
  const permissions = {
    admin: {
      '*': ['read', 'write', 'delete', 'admin'] as const
    },
    lecturer: {
      'requests': ['read', 'write'] as const,
      'letters': ['read', 'write'] as const,
      'notifications': ['read'] as const,
      'profile': ['read', 'write'] as const,
      'students': ['read'] as const
    },
    student: {
      'requests': ['read', 'write'] as const,
      'notifications': ['read'] as const,
      'profile': ['read', 'write'] as const,
      'payments': ['read', 'write'] as const
    }
  } as const

  const userPermissions = permissions[userRole as keyof typeof permissions]
  if (!userPermissions) return false

  // Admin has access to everything
  if (userRole === 'admin' && '*' in userPermissions) {
    return (userPermissions['*'] as readonly string[]).includes(action)
  }

  const resourcePermissions = userPermissions[resource as keyof typeof userPermissions] as readonly string[] | undefined
  if (!resourcePermissions) return false

  return resourcePermissions.includes(action)
}

/**
 * Rate limiting middleware
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  handler: ((req: NextRequest) => Promise<NextResponse>) | ((req: NextRequest) => NextResponse)
) {
  return async (req: NextRequest) => {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean up old entries
    rateLimitMap.forEach((value, key) => {
      if (value.resetTime < windowStart) {
        rateLimitMap.delete(key)
      }
    })

    // Check current rate limit
    const current = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs }
    
    if (current.count >= maxRequests && current.resetTime > now) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString()
          }
        }
      )
    }

    // Update rate limit
    if (current.resetTime <= now) {
      current.count = 1
      current.resetTime = now + windowMs
    } else {
      current.count++
    }
    rateLimitMap.set(ip, current)

    // Add rate limit headers
    const response = await handler(req)
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - current.count).toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString())

    return response
  }
}