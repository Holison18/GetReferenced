'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Mail, MessageSquare, Phone, Bell } from 'lucide-react'

interface NotificationPreferences {
  email: boolean
  sms: boolean
  whatsapp: boolean
  in_app: boolean
  phone_number?: string
  whatsapp_number?: string
}

interface NotificationPreferencesProps {
  userRole: 'student' | 'lecturer' | 'admin'
}

export default function NotificationPreferences({ userRole }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    sms: false,
    whatsapp: false,
    in_app: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchPreferences()
  }, [userRole])

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (userRole === 'lecturer') {
        const { data, error } = await supabase
          .from('lecturer_profiles')
          .select('notification_preferences')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching lecturer preferences:', error)
          return
        }

        if (data?.notification_preferences) {
          setPreferences(data.notification_preferences)
        }
      } else if (userRole === 'student') {
        const { data, error } = await supabase
          .from('student_profiles')
          .select('contact_info')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching student preferences:', error)
          return
        }

        if (data?.contact_info) {
          const contactInfo = data.contact_info
          setPreferences({
            email: true,
            sms: contactInfo.sms_notifications || false,
            whatsapp: contactInfo.whatsapp_notifications || false,
            in_app: true,
            phone_number: contactInfo.phone_number,
            whatsapp_number: contactInfo.whatsapp_number
          })
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (userRole === 'lecturer') {
        const { error } = await supabase
          .from('lecturer_profiles')
          .update({ notification_preferences: preferences })
          .eq('id', user.id)

        if (error) {
          throw error
        }
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

        if (error) {
          throw error
        }
      }

      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated successfully.',
      })
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading preferences...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-500" />
            <div>
              <Label htmlFor="email-notifications" className="text-sm font-medium">
                Email Notifications
              </Label>
              <p className="text-xs text-gray-500">
                Receive notifications via email
              </p>
            </div>
          </div>
          <Switch
            id="email-notifications"
            checked={preferences.email}
            onCheckedChange={(checked) => updatePreference('email', checked)}
          />
        </div>

        {/* SMS Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-gray-500" />
              <div>
                <Label htmlFor="sms-notifications" className="text-sm font-medium">
                  SMS Notifications
                </Label>
                <p className="text-xs text-gray-500">
                  Receive notifications via SMS
                </p>
              </div>
            </div>
            <Switch
              id="sms-notifications"
              checked={preferences.sms}
              onCheckedChange={(checked) => updatePreference('sms', checked)}
            />
          </div>
          {preferences.sms && (
            <div className="ml-8">
              <Label htmlFor="phone-number" className="text-sm">
                Phone Number
              </Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="+1234567890"
                value={preferences.phone_number || ''}
                onChange={(e) => updatePreference('phone_number', e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* WhatsApp Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <div>
                <Label htmlFor="whatsapp-notifications" className="text-sm font-medium">
                  WhatsApp Notifications
                </Label>
                <p className="text-xs text-gray-500">
                  Receive notifications via WhatsApp
                </p>
              </div>
            </div>
            <Switch
              id="whatsapp-notifications"
              checked={preferences.whatsapp}
              onCheckedChange={(checked) => updatePreference('whatsapp', checked)}
            />
          </div>
          {preferences.whatsapp && (
            <div className="ml-8">
              <Label htmlFor="whatsapp-number" className="text-sm">
                WhatsApp Number
              </Label>
              <Input
                id="whatsapp-number"
                type="tel"
                placeholder="+1234567890"
                value={preferences.whatsapp_number || ''}
                onChange={(e) => updatePreference('whatsapp_number', e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* In-App Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-gray-500" />
            <div>
              <Label htmlFor="in-app-notifications" className="text-sm font-medium">
                In-App Notifications
              </Label>
              <p className="text-xs text-gray-500">
                Show notifications in the application
              </p>
            </div>
          </div>
          <Switch
            id="in-app-notifications"
            checked={preferences.in_app}
            onCheckedChange={(checked) => updatePreference('in_app', checked)}
          />
        </div>

        <div className="pt-4">
          <Button 
            onClick={savePreferences} 
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}