'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface RouteProtectionOptions {
  requiredRole?: string | string[]
  redirectTo?: string
  requireAuth?: boolean
}

/**
 * Hook for client-side route protection
 */
export function useRouteProtection(options: RouteProtectionOptions = {}) {
  const { user, profile, loading, isSessionValid } = useAuth()
  const router = useRouter()
  
  const {
    requiredRole,
    redirectTo = '/login',
    requireAuth = true
  } = options

  useEffect(() => {
    // Don't redirect while loading
    if (loading) return

    // Check authentication requirement
    if (requireAuth && (!user || !isSessionValid)) {
      const currentPath = window.location.pathname
      const loginUrl = `${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}`
      router.push(loginUrl)
      return
    }

    // Check role requirement
    if (requiredRole && profile) {
      const userRole = profile.role
      const hasRequiredRole = Array.isArray(requiredRole)
        ? requiredRole.includes(userRole)
        : userRole === requiredRole

      if (!hasRequiredRole) {
        // Redirect to appropriate dashboard based on user role
        const dashboardPath = `/${userRole}/dashboard`
        router.push(dashboardPath)
        return
      }
    }
  }, [user, profile, loading, isSessionValid, requiredRole, redirectTo, requireAuth, router])

  return {
    isAuthenticated: !!user && isSessionValid,
    isAuthorized: !requiredRole || (profile && (
      Array.isArray(requiredRole) 
        ? requiredRole.includes(profile.role)
        : profile.role === requiredRole
    )),
    loading,
    user,
    profile
  }
}

/**
 * Hook for protecting specific actions based on permissions
 */
export function usePermissions() {
  const { profile } = useAuth()

  const hasPermission = (
    resource: string,
    action: 'read' | 'write' | 'delete' | 'admin'
  ): boolean => {
    if (!profile) return false

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

    const userPermissions = permissions[profile.role as keyof typeof permissions]
    if (!userPermissions) return false

    // Admin has access to everything
    if (profile.role === 'admin' && '*' in userPermissions) {
      return (userPermissions['*'] as readonly string[]).includes(action)
    }

    const resourcePermissions = userPermissions[resource as keyof typeof userPermissions] as readonly string[] | undefined
    if (!resourcePermissions) return false

    return resourcePermissions.includes(action)
  }

  const canAccessResource = (
    resourceOwnerId: string,
    resource: string,
    action: 'read' | 'write' | 'delete' | 'admin'
  ): boolean => {
    if (!profile) return false

    // Admin can access everything
    if (profile.role === 'admin') {
      return true
    }

    // Users can access their own resources
    if (profile.id === resourceOwnerId) {
      return hasPermission(resource, action)
    }

    // Special cases for cross-role access
    if (resource === 'requests') {
      // Lecturers can read/write requests assigned to them
      if (profile.role === 'lecturer' && (action === 'read' || action === 'write')) {
        return true // Additional check needed in the component
      }
    }

    return false
  }

  return {
    hasPermission,
    canAccessResource,
    userRole: profile?.role,
    userId: profile?.id
  }
}

/**
 * Hook for session management
 */
export function useSessionManagement() {
  const { session, refreshSession, signOut, isSessionValid } = useAuth()

  const handleSessionExpiry = async () => {
    try {
      await refreshSession()
    } catch (error) {
      console.error('Failed to refresh session:', error)
      await signOut()
    }
  }

  const forceSignOut = async () => {
    await signOut()
  }

  return {
    session,
    isSessionValid,
    handleSessionExpiry,
    forceSignOut,
    refreshSession
  }
}