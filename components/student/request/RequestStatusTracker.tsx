'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  User, 
  Calendar,
  RotateCcw,
  X,
  MessageSquare,
  Download
} from 'lucide-react'
import { formatDistanceToNow, isAfter, isBefore, addWeeks } from 'date-fns'

interface RequestStatusTrackerProps {
  requestId: string
  onStatusUpdate?: () => void
}

interface RequestDetails {
  id: string
  purpose: 'school' | 'scholarship' | 'job'
  status: string
  deadline: string
  created_at: string
  updated_at: string
  details: {
    organizationName: string
    programName?: string
    recipientName?: string
    recipientAddress: string
    deliveryMethod: string
  }
  lecturer_profiles: Array<{
    id: string
    department: string
    rank: string
    profiles: {
      first_name: string
      last_name: string
    }
  }>
  letters: Array<{
    id: string
    content: string
    submitted_at: string | null
    declaration_completed: boolean
    lecturer_id: string
  }>
}

export default function RequestStatusTracker({ requestId, onStatusUpdate }: RequestStatusTrackerProps) {
  const [request, setRequest] = useState<RequestDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchRequestDetails()
  }, [requestId])

  const fetchRequestDetails = async () => {
    try {
      const response = await fetch(`/api/requests/${requestId}`)
      if (response.ok) {
        const data = await response.json()
        setRequest(data)
      } else {
        console.error('Failed to fetch request details')
      }
    } catch (error) {
      console.error('Error fetching request details:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateRequestStatus = async (newStatus: string, reason?: string) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, reason }),
      })

      if (response.ok) {
        await fetchRequestDetails()
        onStatusUpdate?.()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending_acceptance: {
        label: 'Pending Acceptance',
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
        progress: 20,
        description: 'Waiting for lecturer response'
      },
      accepted: {
        label: 'Accepted',
        color: 'bg-blue-100 text-blue-800',
        icon: CheckCircle,
        progress: 40,
        description: 'Lecturer has accepted your request'
      },
      in_progress: {
        label: 'In Progress',
        color: 'bg-purple-100 text-purple-800',
        icon: FileText,
        progress: 70,
        description: 'Letter is being written'
      },
      completed: {
        label: 'Completed',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        progress: 100,
        description: 'Letter has been completed and submitted'
      },
      declined: {
        label: 'Declined',
        color: 'bg-red-100 text-red-800',
        icon: AlertCircle,
        progress: 0,
        description: 'Lecturer declined your request'
      },
      cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-800',
        icon: X,
        progress: 0,
        description: 'Request was cancelled'
      },
      reassigned: {
        label: 'Reassigned',
        color: 'bg-orange-100 text-orange-800',
        icon: RotateCcw,
        progress: 10,
        description: 'Request has been reassigned to another lecturer'
      }
    }

    return statusMap[status as keyof typeof statusMap] || statusMap.pending_acceptance
  }

  const isDeadlineNear = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    const oneWeekFromNow = addWeeks(today, 1)
    return isAfter(deadlineDate, today) && isBefore(deadlineDate, oneWeekFromNow)
  }

  const isOverdue = (deadline: string) => {
    return isBefore(new Date(deadline), new Date())
  }

  const canCancelRequest = (status: string) => {
    return ['pending_acceptance', 'accepted'].includes(status)
  }

  const canReassignRequest = (status: string) => {
    return status === 'pending_acceptance'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!request) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Request not found
          </div>
        </CardContent>
      </Card>
    )
  }

  const statusInfo = getStatusInfo(request.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <StatusIcon className="h-6 w-6" />
            Request Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
            <span className="text-sm text-gray-500">
              Updated {formatDistanceToNow(new Date(request.updated_at))} ago
            </span>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{statusInfo.progress}%</span>
            </div>
            <Progress value={statusInfo.progress} className="h-2" />
          </div>
          
          <p className="text-sm text-gray-600">{statusInfo.description}</p>
          
          {/* Deadline Warning */}
          {request.status !== 'completed' && request.status !== 'cancelled' && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>Deadline: {new Date(request.deadline).toLocaleDateString()}</span>
              {isOverdue(request.deadline) && (
                <Badge variant="destructive">Overdue</Badge>
              )}
              {isDeadlineNear(request.deadline) && !isOverdue(request.deadline) && (
                <Badge variant="destructive">Due Soon</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-700">Organization</h4>
              <p className="text-sm">{request.details.organizationName}</p>
            </div>
            {request.details.programName && (
              <div>
                <h4 className="font-medium text-sm text-gray-700">Program</h4>
                <p className="text-sm">{request.details.programName}</p>
              </div>
            )}
            <div>
              <h4 className="font-medium text-sm text-gray-700">Purpose</h4>
              <p className="text-sm capitalize">{request.purpose}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-700">Delivery Method</h4>
              <p className="text-sm">{request.details.deliveryMethod.replace('_', ' ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lecturers */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Lecturers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {request.lecturer_profiles.map((lecturer) => {
              const hasSubmittedLetter = request.letters.some(
                letter => letter.lecturer_id === lecturer.id && letter.submitted_at
              )
              
              return (
                <div key={lecturer.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {lecturer.profiles.first_name} {lecturer.profiles.last_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {lecturer.rank} • {lecturer.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasSubmittedLetter ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Submitted
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {canReassignRequest(request.status) && (
              <Button
                variant="outline"
                onClick={() => updateRequestStatus('reassigned')}
                disabled={updating}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reassign Request
              </Button>
            )}
            
            {canCancelRequest(request.status) && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm('Are you sure you want to cancel this request? This action cannot be undone.')) {
                    updateRequestStatus('cancelled')
                  }
                }}
                disabled={updating}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel Request
              </Button>
            )}
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Contact Support
            </Button>
            
            {request.status === 'completed' && request.letters.length > 0 && (
              <Button
                variant="default"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Letters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}