'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Tables<'profiles'> | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshSession: () => Promise<void>
  isSessionValid: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSessionValid, setIsSessionValid] = useState(false)
  
  // Using the supabase client from lib/supabase.ts

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error)
        setIsSessionValid(false)
        return
      }
      
      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
        setIsSessionValid(true)
        
        // Refresh profile if user changed
        if (data.session.user) {
          const profileData = await fetchProfile(data.session.user.id)
          setProfile(profileData)
        }
      }
    } catch (error) {
      console.error('Error refreshing session:', error)
      setIsSessionValid(false)
    }
  }

  const validateSession = (currentSession: Session | null) => {
    if (!currentSession) {
      setIsSessionValid(false)
      return false
    }

    const now = Math.floor(Date.now() / 1000)
    const isValid = currentSession.expires_at ? currentSession.expires_at > now : true
    setIsSessionValid(isValid)
    
    // Auto-refresh if session expires in the next 5 minutes
    if (currentSession.expires_at && (currentSession.expires_at - now) < 300) {
      refreshSession()
    }
    
    return isValid
  }

  const signOut = async () => {
    try {
      setLoading(true)
      
      // Call logout API for server-side cleanup
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      } catch (apiError) {
        console.warn('Logout API call failed:', apiError)
        // Continue with client-side cleanup even if API fails
      }
      
      // Clear any app-specific localStorage items
      if (typeof window !== 'undefined') {
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.startsWith('supabase.') || 
          key.startsWith('getreference.') ||
          key.includes('auth')
        )
        keysToRemove.forEach(key => localStorage.removeItem(key))
        
        // Clear sessionStorage
        sessionStorage.clear()
      }
      
      // Sign out from Supabase client
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Supabase signout error:', error)
        // Don't throw here, continue with cleanup
      }
      
      // Clear state
      setUser(null)
      setSession(null)
      setProfile(null)
      setIsSessionValid(false)
      
      // Redirect to login page
      window.location.href = '/login'
      
    } catch (error) {
      console.error('Error during signout:', error)
      // Even if there's an error, clear local state and redirect
      setUser(null)
      setSession(null)
      setProfile(null)
      setIsSessionValid(false)
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Initial session error:', error)
        setIsSessionValid(false)
        setLoading(false)
        return
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      validateSession(session)
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id)
        setProfile(profileData)
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id)
        
        setSession(session)
        setUser(session?.user ?? null)
        validateSession(session)
        
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          setProfile(profileData)
        } else {
          setProfile(null)
        }
        
        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setSession(null)
          setProfile(null)
          setIsSessionValid(false)
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully')
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in')
        }
        
        setLoading(false)
      }
    )

    // Set up session validation interval (check every 5 minutes)
    const sessionCheckInterval = setInterval(() => {
      if (session) {
        validateSession(session)
      }
    }, 5 * 60 * 1000)

    return () => {
      subscription.unsubscribe()
      clearInterval(sessionCheckInterval)
    }
  }, [])

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
    refreshProfile,
    refreshSession,
    isSessionValid
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}