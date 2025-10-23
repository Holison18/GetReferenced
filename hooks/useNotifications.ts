'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface NotificationHookReturn {
  sendNotification: (type: string, data: any, channels?: string[]) => Promise<void>
  loading: boolean
  error: string | null
}

export function useNotifications(): NotificationHookReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendNotification = async (
    type: string, 
    data: any, 
    channels?: string[]
  ) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data,
          channels
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send notification')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    sendNotification,
    loading,
    error
  }
}

// Hook for managing notification preferences
export function useNotificationPreferences() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePreferences = async (preferences: any, userRole: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      if (userRole === 'lecturer') {
        const { error } = await supabase
          .from('lecturer_profiles')
          .update({ notification_preferences: preferences })
          .eq('id', user.id)

        if (error) throw error
      } else if (userRole === 'student') {
        const { data: currentProfile } = await supabase
          .from('student_profiles')
          .select('contact_info')
          .eq('id', user.id)
          .single()

        const updatedContactInfo = {
          ...currentProfile?.contact_info,
          sms_notifications: preferences.sms,
          whatsapp_notifications: preferences.whatsapp,
          phone_number: preferences.phone_number,
          whatsapp_number: preferences.whatsapp_number
        }

        const { error } = await supabase
          .from('student_profiles')
          .update({ contact_info: updatedContactInfo })
          .eq('id', user.id)

        if (error) throw error
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    updatePreferences,
    loading,
    error
  }
}

// Hook for real-time notifications
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const subscribeToNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Set up real-time subscription
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new
          setNotifications(prev => [newNotification, ...prev])
          if (!newNotification.read) {
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new
          setNotifications(prev =>
            prev.map(n =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          )
          
          // Update unread count if read status changed
          if (payload.old.read !== updatedNotification.read) {
            setUnreadCount(prev => 
              updatedNotification.read ? Math.max(0, prev - 1) : prev + 1
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }

    setUnreadCount(0)
  }

  return {
    notifications,
    unreadCount,
    subscribeToNotifications,
    markAsRead,
    markAllAsRead,
    setNotifications,
    setUnreadCount
  }
}