'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'student' | 'lecturer' | 'admin' | string[]
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (!loading && user && profile && requiredRole) {
      const hasRequiredRole = Array.isArray(requiredRole)
        ? requiredRole.includes(profile.role)
        : profile.role === requiredRole

      if (!hasRequiredRole) {
        // Redirect to appropriate dashboard based on user role
        router.push(`/${profile.role}/dashboard`)
        return
      }
    }
  }, [user, profile, loading, requiredRole, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return fallback || null
  }

  if (requiredRole && profile) {
    const hasRequiredRole = Array.isArray(requiredRole)
      ? requiredRole.includes(profile.role)
      : profile.role === requiredRole

    if (!hasRequiredRole) {
      return fallback || null
    }
  }

  return <>{children}</>
}