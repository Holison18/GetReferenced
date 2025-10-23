'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, Eye, X, Clock, Users, AlertCircle } from 'lucide-react'

interface Notification {
  id: string
  type: 'new_request' | 'reminder' | 'reassignment' | 'payment' | 'system'
  title: string
  message: string
  read: boolean
  createdAt: string
  data?: {
    requestId?: string
    studentName?: string
    amount?: number
  }
}

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
  onMarkAsRead: (notificationId: string) => void
  onMarkAllAsRead: () => void
}

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead
}: NotificationCenterProps) {
  if (!isOpen) return null

  const unreadNotifications = notifications.filter(n => !n.read)
  const readNotifications = notifications.filter(n => n.read)

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_request':
        return <Users className="h-4 w-4 text-blue-600" />
      case 'reminder':
        return <Clock className="h-4 w-4 text-orange-600" />
      case 'reassignment':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'payment':
        return <Check className="h-4 w-4 text-green-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffTime / (1000 * 60))

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {unreadNotifications.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadNotifications.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Stay updated with your recommendation letter requests
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {unreadNotifications.length > 0 && (
                <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
                  <Check className="h-4 w-4 mr-1" />
                  Mark All Read
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 overflow-y-auto max-h-[60vh]">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No notifications
              </h3>
              <p className="text-gray-600">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Unread Notifications */}
              {unreadNotifications.length > 0 && (
                <div>
                  <div className="px-6 py-3 bg-blue-50 border-b">
                    <h4 className="text-sm font-medium text-blue-900">
                      Unread ({unreadNotifications.length})
                    </h4>
                  </div>
                  {unreadNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="px-6 py-4 hover:bg-gray-50 transition-colors border-l-4 border-blue-500"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                {formatDate(notification.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onMarkAsRead(notification.id)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              {notification.data?.requestId && (
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Read Notifications */}
              {readNotifications.length > 0 && (
                <div>
                  {unreadNotifications.length > 0 && (
                    <div className="px-6 py-3 bg-gray-50 border-b">
                      <h4 className="text-sm font-medium text-gray-700">
                        Earlier
                      </h4>
                    </div>
                  )}
                  {readNotifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className="px-6 py-4 hover:bg-gray-50 transition-colors opacity-75"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1 opacity-60">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-700">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {formatDate(notification.createdAt)}
                              </p>
                            </div>
                            {notification.data?.requestId && (
                              <Button variant="ghost" size="sm" className="opacity-60">
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {readNotifications.length > 10 && (
                    <div className="px-6 py-4 text-center border-t">
                      <Button variant="outline" size="sm">
                        Load More
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}