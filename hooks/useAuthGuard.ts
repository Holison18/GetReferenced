'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface UseAuthGuardOptions {
  requiredRole?: string | string[]
  redirectTo?: string
  requireAuth?: boolean
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { 
    requiredRole, 
    redirectTo = '/login', 
    requireAuth = true 
  } = options
  
  const { user, profile, loading, isSessionValid } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (loading) {
      setIsChecking(true)
      return
    }

    // Check authentication requirement
    if (requireAuth && (!user || !isSessionValid)) {
      const currentPath = window.location.pathname
      const loginUrl = `${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}`
      router.push(loginUrl)
      setIsAuthorized(false)
      setIsChecking(false)
      return
    }

    // Check role requirement
    if (requiredRole && profile) {
      const userRole = profile.role
      const hasRequiredRole = Array.isArray(requiredRole)
        ? requiredRole.includes(userRole)
        : userRole === requiredRole

      if (!hasRequiredRole) {
        // Redirect to appropriate dashboard
        router.push(`/${userRole}/dashboard`)
        setIsAuthorized(false)
        setIsChecking(false)
        return
      }
    }

    setIsAuthorized(true)
    setIsChecking(false)
  }, [user, profile, loading, isSessionValid, requiredRole, redirectTo, requireAuth, router])

  return {
    isAuthorized,
    isChecking,
    user,
    profile,
    isSessionValid
  }
}

/**
 * Hook for role-based component rendering
 */
export function useRoleAccess(allowedRoles: string | string[]) {
  const { profile } = useAuth()
  
  if (!profile) return false
  
  const userRole = profile.role
  return Array.isArray(allowedRoles)
    ? allowedRoles.includes(userRole)
    : userRole === allowedRoles
}

/**
 * Hook for permission-based access control
 */
export function usePermission(resource: string, action: 'read' | 'write' | 'delete' | 'admin') {
  const { profile } = useAuth()
  
  if (!profile) return false
  
  return hasPermission(profile.role, resource, action)
}

function hasPermission(
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
 * Hook for session management
 */
export function useSessionManager() {
  const { session, refreshSession, isSessionValid } = useAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const checkAndRefreshSession = async () => {
    if (!session || isRefreshing) return

    const now = Math.floor(Date.now() / 1000)
    const expiresAt = session.expires_at || 0
    
    // Refresh if session expires in the next 5 minutes
    if (expiresAt - now < 300) {
      setIsRefreshing(true)
      try {
        await refreshSession()
      } catch (error) {
        console.error('Session refresh failed:', error)
      } finally {
        setIsRefreshing(false)
      }
    }
  }

  useEffect(() => {
    if (!session || !isSessionValid) return

    // Check session every minute
    const interval = setInterval(checkAndRefreshSession, 60 * 1000)
    
    // Initial check
    checkAndRefreshSession()

    return () => clearInterval(interval)
  }, [session, isSessionValid])

  return {
    isSessionValid,
    isRefreshing,
    checkAndRefreshSession
  }
}