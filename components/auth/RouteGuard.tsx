'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface RouteGuardProps {
  children: React.ReactNode
  requiredRole?: 'student' | 'lecturer' | 'admin'
}

export function RouteGuard({ children, requiredRole }: RouteGuardProps) {
  const { user, profile, loading, isSessionValid } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // If no session or invalid session, redirect to login
      if (!user || !isSessionValid) {
        router.push('/login')
        return
      }

      // If no profile, redirect to complete registration
      if (!profile) {
        router.push('/signup')
        return
      }

      // If specific role required and user doesn't have it, redirect to appropriate dashboard
      if (requiredRole && profile.role !== requiredRole) {
        router.push(`/${profile.role}/dashboard`)
        return
      }
    }
  }, [user, profile, loading, isSessionValid, requiredRole, router])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render children if not authenticated or wrong role
  if (!user || !isSessionValid || !profile) {
    return null
  }

  if (requiredRole && profile.role !== requiredRole) {
    return null
  }

  return <>{children}</>
}