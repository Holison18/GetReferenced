import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSecurityMiddleware } from './lib/security/headers'
import { createRateLimit, rateLimitConfigs } from './lib/security/rate-limiting'
import { auditLogger, extractRequestContext } from './lib/audit-logger'

// Route configuration for role-based access control
const ROUTE_CONFIG = {
  // Public routes that don't require authentication
  public: ['/', '/about', '/contact', '/terms', '/privacy'],
  
  // Authentication routes
  auth: ['/login', '/signup', '/forgot-password', '/verify-email'],
  
  // Protected routes by role
  protected: {
    student: ['/student'],
    lecturer: ['/lecturer'],
    admin: ['/admin']
  },
  
  // API routes that require authentication
  protectedApi: ['/api/requests', '/api/letters', '/api/notifications', '/api/payments'],
  
  // API routes that don't require authentication
  publicApi: ['/api/auth']
}

export async function middleware(req: NextRequest) {
  // Apply security headers first
  const securityMiddleware = createSecurityMiddleware({
    enforceHTTPS: process.env.NODE_ENV === 'production'
  })
  
  let res = securityMiddleware(req)
  if (res.status !== 200) {
    return res // Return if redirected or blocked
  }

  // Apply rate limiting based on route
  const pathname = req.nextUrl.pathname
  let rateLimitResponse = null

  if (pathname.startsWith('/api/auth')) {
    const authRateLimit = createRateLimit(rateLimitConfigs.auth)
    rateLimitResponse = await authRateLimit(req)
  } else if (pathname.startsWith('/api/payments')) {
    const paymentRateLimit = createRateLimit(rateLimitConfigs.payment)
    rateLimitResponse = await paymentRateLimit(req)
  } else if (pathname.startsWith('/api/upload')) {
    const uploadRateLimit = createRateLimit(rateLimitConfigs.upload)
    rateLimitResponse = await uploadRateLimit(req)
  } else if (pathname.startsWith('/api/ai')) {
    const aiRateLimit = createRateLimit(rateLimitConfigs.ai)
    rateLimitResponse = await aiRateLimit(req)
  } else if (pathname.startsWith('/api/notifications')) {
    const notificationRateLimit = createRateLimit(rateLimitConfigs.notification)
    rateLimitResponse = await notificationRateLimit(req)
  } else if (pathname.startsWith('/api')) {
    const apiRateLimit = createRateLimit(rateLimitConfigs.api)
    rateLimitResponse = await apiRateLimit(req)
  }

  if (rateLimitResponse) {
    // Log rate limit violation
    const context = extractRequestContext(req)
    await auditLogger.logSecurity({
      action: 'rate_limit_exceeded',
      resource_type: 'api_endpoint',
      resource_id: pathname,
      details: { endpoint: pathname },
      severity: 'medium',
      success: false,
      blocked: true,
      threat_type: 'rate_limit',
      ...context
    })
    return rateLimitResponse
  }

  res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession()

  // Handle session errors (invalid JWT, expired tokens, etc.)
  if (sessionError) {
    console.error('Session error:', sessionError)
    
    // Log security event
    const context = extractRequestContext(req)
    await auditLogger.logSecurity({
      action: 'session_error',
      resource_type: 'authentication',
      details: { error: sessionError.message, pathname },
      severity: 'medium',
      success: false,
      threat_type: 'unauthorized_access',
      ...context
    })
    
    // Clear all Supabase-related cookies
    const cookiesToClear = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token', 'supabase.auth.token']
    cookiesToClear.forEach(cookieName => {
      res.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    })
    
    // Redirect to login if accessing protected routes
    if (isProtectedRoute(pathname) || isProtectedApiRoute(pathname)) {
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      redirectUrl.searchParams.set('error', 'session_expired')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Check route types
  const isPublicRoute = isPublicRouteCheck(pathname)
  const isAuthRoute = isAuthRouteCheck(pathname)
  const isProtectedRouteCheck = isProtectedRoute(pathname)
  const isApiRoute = pathname.startsWith('/api')
  const isProtectedApiRouteCheck = isProtectedApiRoute(pathname)
  const isPublicApiRoute = isPublicApiRouteCheck(pathname)

  // Handle API routes
  if (isApiRoute) {
    // Public API routes don't need authentication
    if (isPublicApiRoute) {
      return res
    }
    
    // Protected API routes require authentication
    if (isProtectedApiRouteCheck && !session) {
      // Log unauthorized API access attempt
      const context = extractRequestContext(req)
      await auditLogger.logSecurity({
        action: 'unauthorized_api_access',
        resource_type: 'api_endpoint',
        resource_id: pathname,
        details: { endpoint: pathname },
        severity: 'high',
        success: false,
        threat_type: 'unauthorized_access',
        ...context
      })
      
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Add user context to API requests
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        // Add user info to request headers for API routes
        res.headers.set('x-user-id', session.user.id)
        res.headers.set('x-user-role', profile.role)
        res.headers.set('x-user-email', session.user.email || '')
      }
    }

    return res
  }

  // Handle public routes
  if (isPublicRoute) {
    return res
  }

  // Handle authentication routes
  if (isAuthRoute) {
    // If user is already authenticated, redirect to appropriate dashboard
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        const dashboardUrl = new URL(`/${profile.role}/dashboard`, req.url)
        return NextResponse.redirect(dashboardUrl)
      }
    }
    return res
  }

  // Handle protected routes
  if (isProtectedRouteCheck) {
    // Require authentication
    if (!session) {
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Get user profile for role-based access control
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('error', 'profile_not_found')
      return NextResponse.redirect(redirectUrl)
    }

    // Check role-based access
    const userRole = profile.role
    const requestedRole = pathname.split('/')[1] as 'student' | 'lecturer' | 'admin'

    // Verify user has access to the requested role route
    if (!hasRoleAccess(userRole, requestedRole)) {
      const correctDashboard = new URL(`/${userRole}/dashboard`, req.url)
      return NextResponse.redirect(correctDashboard)
    }

    // Add user context to request headers
    res.headers.set('x-user-id', session.user.id)
    res.headers.set('x-user-role', userRole)
    res.headers.set('x-user-email', session.user.email || '')
  }

  return res
}

// Helper functions for route checking
function isPublicRouteCheck(pathname: string): boolean {
  return ROUTE_CONFIG.public.some(route => 
    route === pathname || (route !== '/' && pathname.startsWith(route))
  )
}

function isAuthRouteCheck(pathname: string): boolean {
  return ROUTE_CONFIG.auth.some(route => pathname.startsWith(route))
}

function isProtectedRoute(pathname: string): boolean {
  return Object.values(ROUTE_CONFIG.protected).flat().some(route => 
    pathname.startsWith(route)
  )
}

function isProtectedApiRoute(pathname: string): boolean {
  return ROUTE_CONFIG.protectedApi.some(route => pathname.startsWith(route))
}

function isPublicApiRouteCheck(pathname: string): boolean {
  return ROUTE_CONFIG.publicApi.some(route => pathname.startsWith(route))
}

function hasRoleAccess(userRole: string, requestedRole: string): boolean {
  // Admin can access all routes
  if (userRole === 'admin') {
    return true
  }
  
  // Users can only access their own role routes
  return userRole === requestedRole
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}