import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createBrowserClient } from '@supabase/ssr'

// Server-side Supabase client
export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// Client-side Supabase client
export function createClientSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Get current user session (server-side)
export async function getSession() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Get current user profile (server-side)
export async function getUserProfile() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return profile
}

// Get user with role-specific profile (server-side)
export async function getUserWithProfile() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) return null

  let roleProfile = null
  
  if (profile.role === 'student') {
    const { data } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('id', profile.id)
      .single()
    roleProfile = data
  } else if (profile.role === 'lecturer') {
    const { data } = await supabase
      .from('lecturer_profiles')
      .select('*')
      .eq('id', profile.id)
      .single()
    roleProfile = data
  }

  return {
    user: session.user,
    profile,
    roleProfile
  }
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  role: 'student' | 'lecturer' | 'admin'
  profile: StudentProfile | LecturerProfile | AdminProfile
}

export interface StudentProfile {
  id: string
  enrollment_year: number
  completion_year: number
  contact_info: any
  date_of_birth: string
  transcript_urls: string[]
  cv_url?: string
  photo_url?: string
}

export interface LecturerProfile {
  id: string
  staff_number: string
  department: string
  affiliated_departments?: string[]
  employment_year: number
  rank: string
  notification_preferences: NotificationPreferences
  payment_details?: any
}

export interface AdminProfile {
  id: string
  // Admin-specific fields can be added here
}

export interface NotificationPreferences {
  email: boolean
  sms: boolean
  whatsapp: boolean
  in_app: boolean
}

// Session management utilities
export async function refreshSession() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.auth.refreshSession()
  
  if (error) {
    console.error('Session refresh error:', error)
    return null
  }
  
  return data.session
}

export async function validateSession() {
  const supabase = createServerSupabaseClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    return null
  }
  
  // Check if session is expired
  const now = Math.floor(Date.now() / 1000)
  if (session.expires_at && session.expires_at < now) {
    // Try to refresh the session
    return await refreshSession()
  }
  
  return session
}

// Enhanced logout with cleanup
export async function signOut() {
  const supabase = createServerSupabaseClient()
  
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Sign out error:', error)
      throw error
    }
    
    // Additional cleanup can be added here
    // e.g., clear local storage, invalidate caches, etc.
    
    return { success: true }
  } catch (error) {
    console.error('Sign out failed:', error)
    return { success: false, error }
  }
}

// Client-side logout with cleanup
export async function signOutClient() {
  const supabase = createClientSupabaseClient()
  
  try {
    // Clear any local state before signing out
    if (typeof window !== 'undefined') {
      // Clear localStorage items related to the app
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('supabase.') || 
        key.startsWith('getreference.') ||
        key.includes('auth')
      )
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Clear sessionStorage
      sessionStorage.clear()
    }
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Client sign out error:', error)
      throw error
    }
    
    return { success: true }
  } catch (error) {
    console.error('Client sign out failed:', error)
    return { success: false, error }
  }
}

// Role-based access control
export function hasRole(userRole: string, requiredRole: string | string[]): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole)
  }
  return userRole === requiredRole
}

export function canAccessRoute(userRole: string, route: string): boolean {
  const roleRoutes = {
    student: ['/student'],
    lecturer: ['/lecturer'],
    admin: ['/admin']
  }

  const allowedRoutes = roleRoutes[userRole as keyof typeof roleRoutes] || []
  return allowedRoutes.some(allowedRoute => route.startsWith(allowedRoute))
}

// Enhanced role-based access control
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
      'profile': ['read', 'write'] as const
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

// JWT token utilities
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const now = Math.floor(Date.now() / 1000)
    return payload.exp < now
  } catch (error) {
    console.error('Error parsing JWT token:', error)
    return true
  }
}

export function getTokenPayload(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch (error) {
    console.error('Error parsing JWT token:', error)
    return null
  }
}

// Session validation for API routes
export async function validateApiRequest(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.substring(7)
  
  if (isTokenExpired(token)) {
    return { valid: false, error: 'Token expired' }
  }

  const supabase = createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return { valid: false, error: 'Invalid token or user not found' }
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    valid: true,
    user,
    profile,
    token
  }
}