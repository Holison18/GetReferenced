import { redirect } from 'next/navigation'
import { createServerSupabaseClient, getUserWithProfile } from './auth'

/**
 * Server-side authentication check for pages
 * Redirects to login if not authenticated
 */
export async function requireAuth(redirectTo?: string) {
  const userWithProfile = await getUserWithProfile()
  
  if (!userWithProfile) {
    const currentPath = redirectTo || '/'
    redirect(`/login?redirectTo=${encodeURIComponent(currentPath)}`)
  }
  
  return userWithProfile
}

/**
 * Server-side role-based authentication check
 * Redirects to appropriate dashboard if role doesn't match
 */
export async function requireRole(
  requiredRole: string | string[],
  redirectTo?: string
) {
  const userWithProfile = await requireAuth(redirectTo)
  
  const userRole = userWithProfile.profile.role
  const hasRequiredRole = Array.isArray(requiredRole)
    ? requiredRole.includes(userRole)
    : userRole === requiredRole
  
  if (!hasRequiredRole) {
    redirect(`/${userRole}/dashboard`)
  }
  
  return userWithProfile
}

/**
 * Get authenticated user without redirecting
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser() {
  try {
    return await getUserWithProfile()
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

/**
 * Check if user has specific permission
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
 * Server-side permission check with redirect
 */
export async function requirePermission(
  resource: string,
  action: 'read' | 'write' | 'delete' | 'admin',
  redirectTo?: string
) {
  const userWithProfile = await requireAuth(redirectTo)
  
  const hasPermission = checkPermission(
    userWithProfile.profile.role,
    resource,
    action
  )
  
  if (!hasPermission) {
    const userRole = userWithProfile.profile.role
    redirect(`/${userRole}/dashboard`)
  }
  
  return userWithProfile
}

/**
 * Validate session and get user data for server components
 */
export async function validateServerSession() {
  const supabase = createServerSupabaseClient()
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      return { valid: false, user: null, profile: null, session: null }
    }
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at && session.expires_at < now) {
      return { valid: false, user: null, profile: null, session: null }
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    
    return {
      valid: true,
      user: session.user,
      profile,
      session
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return { valid: false, user: null, profile: null, session: null }
  }
}