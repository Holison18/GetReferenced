import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Enhanced server-side authentication utilities
 */

export interface AuthResult {
  user: {
    id: string
    email: string
    role: string
  }
  profile: any
  session: any
}

/**
 * Create server Supabase client with proper cookie handling
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
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
}

/**
 * Get authenticated user with comprehensive error handling
 */
export async function getAuthenticatedUser(): Promise<AuthResult | null> {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return null
    }
    
    if (!session) {
      return null
    }
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at && session.expires_at < now) {
      console.log('Session expired')
      return null
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    
    if (profileError) {
      console.error('Profile error:', profileError)
      return null
    }
    
    return {
      user: {
        id: session.user.id,
        email: session.user.email || '',
        role: profile.role
      },
      profile,
      session
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

/**
 * Require authentication with redirect
 */
export async function requireAuth(redirectPath?: string): Promise<AuthResult> {
  const auth = await getAuthenticatedUser()
  
  if (!auth) {
    const currentPath = redirectPath || '/'
    const loginUrl = `/login?redirectTo=${encodeURIComponent(currentPath)}`
    redirect(loginUrl)
  }
  
  return auth
}

/**
 * Require specific role with redirect
 */
export async function requireRole(
  requiredRole: string | string[],
  redirectPath?: string
): Promise<AuthResult> {
  const auth = await requireAuth(redirectPath)
  
  const userRole = auth.user.role
  const hasRequiredRole = Array.isArray(requiredRole)
    ? requiredRole.includes(userRole)
    : userRole === requiredRole
  
  if (!hasRequiredRole) {
    redirect(`/${userRole}/dashboard`)
  }
  
  return auth
}

/**
 * Require specific permission with redirect
 */
export async function requirePermission(
  resource: string,
  action: 'read' | 'write' | 'delete' | 'admin',
  redirectPath?: string
): Promise<AuthResult> {
  const auth = await requireAuth(redirectPath)
  
  const hasPermission = checkPermission(auth.user.role, resource, action)
  
  if (!hasPermission) {
    redirect(`/${auth.user.role}/dashboard`)
  }
  
  return auth
}

/**
 * Check permissions
 */
export function checkPermission(
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
 * Check if user can access route
 */
export function canAccessRoute(userRole: string, route: string): boolean {
  const roleRoutes = {
    student: ['/student'],
    lecturer: ['/lecturer'],
    admin: ['/admin']
  }

  // Admin can access all routes
  if (userRole === 'admin') return true

  const allowedRoutes = roleRoutes[userRole as keyof typeof roleRoutes] || []
  return allowedRoutes.some(allowedRoute => route.startsWith(allowedRoute))
}

/**
 * Validate session without redirect (for optional auth)
 */
export async function validateSession(): Promise<{
  valid: boolean
  auth?: AuthResult
  error?: string
}> {
  try {
    const auth = await getAuthenticatedUser()
    
    if (!auth) {
      return { valid: false, error: 'No valid session' }
    }
    
    return { valid: true, auth }
  } catch (error) {
    console.error('Session validation error:', error)
    return { valid: false, error: 'Session validation failed' }
  }
}

/**
 * Enhanced session refresh
 */
export async function refreshUserSession(): Promise<AuthResult | null> {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error || !data.session) {
      console.error('Session refresh error:', error)
      return null
    }
    
    // Get updated profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.session.user.id)
      .single()
    
    if (profileError) {
      console.error('Profile fetch error after refresh:', profileError)
      return null
    }
    
    return {
      user: {
        id: data.session.user.id,
        email: data.session.user.email || '',
        role: profile.role
      },
      profile,
      session: data.session
    }
  } catch (error) {
    console.error('Session refresh error:', error)
    return null
  }
}

/**
 * Server-side logout utility
 */
export async function serverSignOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Server signout error:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Server signout error:', error)
    return { success: false, error: 'Internal server error' }
  }
}