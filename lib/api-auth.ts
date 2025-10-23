import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from './auth'
import { Tables } from './supabase'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: string
    profile: Tables<'profiles'>
  }
}

export interface ApiAuthResult {
  success: boolean
  user?: {
    id: string
    email: string
    role: string
    profile: Tables<'profiles'>
  }
  error?: string
  response?: NextResponse
}

/**
 * Middleware for protecting API routes with authentication
 */
export async function withAuth(
  request: NextRequest,
  requiredRoles?: string[]
): Promise<ApiAuthResult> {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get session from cookies (handled by middleware)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return {
        success: false,
        error: 'Authentication required',
        response: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found',
        response: NextResponse.json(
          { error: 'User profile not found' },
          { status: 403 }
        )
      }
    }

    // Check role-based access if required
    if (requiredRoles && !requiredRoles.includes(profile.role)) {
      return {
        success: false,
        error: 'Insufficient permissions',
        response: NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    return {
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email || '',
        role: profile.role,
        profile
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return {
      success: false,
      error: 'Internal authentication error',
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Higher-order function for protecting API route handlers
 */
export function protectApiRoute(
  handler: (request: AuthenticatedRequest, context: any) => Promise<NextResponse>,
  requiredRoles?: string[]
) {
  return async (request: NextRequest, context: any) => {
    const authResult = await withAuth(request, requiredRoles)
    
    if (!authResult.success) {
      return authResult.response!
    }

    // Add user info to request
    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = authResult.user

    return handler(authenticatedRequest, context)
  }
}

/**
 * Utility for checking specific permissions
 */
export function hasPermission(
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
 * Check if user can access specific resource
 */
export function canAccessResource(
  userId: string,
  userRole: string,
  resourceOwnerId: string,
  resource: string,
  action: 'read' | 'write' | 'delete' | 'admin'
): boolean {
  // Admin can access everything
  if (userRole === 'admin') {
    return true
  }

  // Users can access their own resources
  if (userId === resourceOwnerId) {
    return hasPermission(userRole, resource, action)
  }

  // Special cases for cross-role access
  if (resource === 'requests') {
    // Lecturers can read/write requests assigned to them
    if (userRole === 'lecturer' && (action === 'read' || action === 'write')) {
      return true // Additional check needed in the actual handler
    }
  }

  return false
}

/**
 * Rate limiting utility (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    // Reset or create new record
    const resetTime = now + windowMs
    rateLimitMap.set(identifier, { count: 1, resetTime })
    return { allowed: true, remaining: limit - 1, resetTime }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count++
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime }
}

/**
 * Apply rate limiting to API routes
 */
export function withRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000
): NextResponse | null {
  const rateLimit = checkRateLimit(identifier, limit, windowMs)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        resetTime: rateLimit.resetTime
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      }
    )
  }

  return null
}