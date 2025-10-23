'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DashboardSkeleton } from '@/components/ui/dashboard-skeleton'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  Eye, 
  Check,
  X,
  Bell,
  Calendar,
  Users,
  DollarSign,
  BookOpen,
  Star,
  Play
} from 'lucide-react'
import { Tables } from '@/lib/supabase'
import RequestActionDialog from './RequestActionDialog'
import SampleLetterUpload from './SampleLetterUpload'
import NotificationCenter from './NotificationCenter'

interface LecturerDashboardProps {
  user: {
    user: any
    profile: Tables<'profiles'>
  }
}

interface RequestStats {
  total: number
  pending: number
  accepted: number
  inProgress: number
  completed: number
  declined: number
}

interface RequestWithDetails {
  id: string
  studentName: string
  purpose: 'school' | 'scholarship' | 'job'
  status: string
  deadline: string
  createdAt: string
  priority: 'high' | 'medium' | 'low'
  details: {
    organizationName: string
    programName?: string
    recipientName?: string
  }
  studentProfile: {
    enrollmentYear: number
    completionYear: number
  }
}

interface SampleLetter {
  id: string
  title: string
  category: 'academic' | 'research' | 'professional'
  uploadedAt: string
  fileUrl: string
}

interface Notification {
  id: string
  type: 'new_request' | 'reminder' | 'reassignment'
  title: string
  message: string
  read: boolean
  createdAt: string
}

export default function LecturerDashboardContent({ user }: LecturerDashboardProps) {
  const [requests, setRequests] = useState<RequestWithDetails[]>([])
  const [sampleLetters, setSampleLetters] = useState<SampleLetter[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<RequestStats>({
    total: 0,
    pending: 0,
    accepted: 0,
    inProgress: 0,
    completed: 0,
    declined: 0
  })
  const [loading, setLoading] = useState(true)
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    action: 'accept' | 'decline'
    requestId: string
    studentName: string
    organizationName: string
  } | null>(null)
  const [uploadDialog, setUploadDialog] = useState(false)
  const [notificationCenter, setNotificationCenter] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // For now, using mock data since API endpoints are not implemented yet
      const mockRequests: RequestWithDetails[] = [
        {
          id: '1',
          studentName: 'John Doe',
          purpose: 'school',
          status: 'pending_acceptance',
          deadline: '2024-12-15',
          createdAt: '2024-10-15',
          priority: 'high',
          details: {
            organizationName: 'Harvard University',
            programName: 'Computer Science PhD',
            recipientName: 'Dr. Jane Smith'
          },
          studentProfile: {
            enrollmentYear: 2020,
            completionYear: 2024
          }
        },
        {
          id: '2',
          studentName: 'Alice Johnson',
          purpose: 'scholarship',
          status: 'accepted',
          deadline: '2024-11-30',
          createdAt: '2024-10-10',
          priority: 'medium',
          details: {
            organizationName: 'Gates Foundation'
          },
          studentProfile: {
            enrollmentYear: 2019,
            completionYear: 2023
          }
        },
        {
          id: '3',
          studentName: 'Bob Wilson',
          purpose: 'job',
          status: 'in_progress',
          deadline: '2024-11-20',
          createdAt: '2024-10-05',
          priority: 'high',
          details: {
            organizationName: 'Google Inc.',
            recipientName: 'HR Manager'
          },
          studentProfile: {
            enrollmentYear: 2018,
            completionYear: 2022
          }
        }
      ]

      const mockSampleLetters: SampleLetter[] = [
        {
          id: '1',
          title: 'Academic Reference Template',
          category: 'academic',
          uploadedAt: '2024-09-15',
          fileUrl: '/sample-letters/academic-template.pdf'
        },
        {
          id: '2',
          title: 'Research Position Reference',
          category: 'research',
          uploadedAt: '2024-09-20',
          fileUrl: '/sample-letters/research-template.pdf'
        }
      ]

      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'new_request',
          title: 'New Request from John Doe',
          message: 'You have received a new recommendation letter request for Harvard University application.',
          read: false,
          createdAt: '2024-10-15T10:30:00Z'
        },
        {
          id: '2',
          type: 'reminder',
          title: 'Deadline Reminder',
          message: 'Request from Alice Johnson is due in 3 days.',
          read: false,
          createdAt: '2024-10-14T09:00:00Z'
        }
      ]

      setRequests(mockRequests)
      setSampleLetters(mockSampleLetters)
      setNotifications(mockNotifications)

      // Calculate stats
      const newStats = mockRequests.reduce((acc, req) => {
        acc.total++
        switch (req.status) {
          case 'pending_acceptance':
            acc.pending++
            break
          case 'accepted':
            acc.accepted++
            break
          case 'in_progress':
            acc.inProgress++
            break
          case 'completed':
            acc.completed++
            break
          case 'declined':
            acc.declined++
            break
        }
        return acc
      }, {
        total: 0,
        pending: 0,
        accepted: 0,
        inProgress: 0,
        completed: 0,
        declined: 0
      })

      setStats(newStats)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRequest = (requestId: string, studentName: string, organizationName: string) => {
    setActionDialog({
      isOpen: true,
      action: 'accept',
      requestId,
      studentName,
      organizationName
    })
  }

  const handleDeclineRequest = (requestId: string, studentName: string, organizationName: string) => {
    setActionDialog({
      isOpen: true,
      action: 'decline',
      requestId,
      studentName,
      organizationName
    })
  }

  const handleActionConfirm = async (reason?: string) => {
    if (!actionDialog) return

    try {
      const { action, requestId } = actionDialog
      
      // API call to accept/decline request
      console.log(`${action}ing request:`, requestId, reason ? `Reason: ${reason}` : '')
      
      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { 
          ...req, 
          status: action === 'accept' ? 'accepted' : 'declined' 
        } : req
      ))

      // Update stats
      setStats(prev => ({
        ...prev,
        pending: prev.pending - 1,
        [action === 'accept' ? 'accepted' : 'declined']: prev[action === 'accept' ? 'accepted' : 'declined'] + 1
      }))
    } catch (error) {
      console.error('Error processing request:', error)
    }
  }

  const handleSampleLetterUpload = async (letterData: any) => {
    try {
      // API call to upload sample letter
      console.log('Uploading sample letter:', letterData)
      
      // Add to local state
      const newLetter: SampleLetter = {
        id: Date.now().toString(),
        title: letterData.title,
        category: letterData.category,
        uploadedAt: new Date().toISOString(),
        fileUrl: URL.createObjectURL(letterData.file)
      }
      
      setSampleLetters(prev => [newLetter, ...prev])
    } catch (error) {
      console.error('Error uploading sample letter:', error)
      throw error
    }
  }

  const handleMarkNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ))
  }

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleWorkNow = (requestId: string) => {
    // Navigate to letter writing interface
    console.log('Starting work on request:', requestId)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_acceptance: { variant: 'outline' as const, label: 'Pending', icon: Clock },
      accepted: { variant: 'secondary' as const, label: 'Accepted', icon: CheckCircle },
      in_progress: { variant: 'default' as const, label: 'In Progress', icon: FileText },
      completed: { variant: 'default' as const, label: 'Completed', icon: CheckCircle },
      declined: { variant: 'destructive' as const, label: 'Declined', icon: AlertCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_acceptance
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      high: { variant: 'destructive' as const, label: 'High Priority' },
      medium: { variant: 'secondary' as const, label: 'Medium Priority' },
      low: { variant: 'outline' as const, label: 'Low Priority' }
    }
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    )
  }

  const getPurposeIcon = (purpose: string) => {
    switch (purpose) {
      case 'school':
        return <BookOpen className="h-4 w-4" />
      case 'scholarship':
        return <DollarSign className="h-4 w-4" />
      case 'job':
        return <Users className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isDeadlineNear = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7 && diffDays > 0
  }

  const pendingRequests = requests.filter(req => req.status === 'pending_acceptance')
  const activeRequests = requests.filter(req => ['accepted', 'in_progress'].includes(req.status))
  const completedRequests = requests.filter(req => req.status === 'completed')
  const unreadNotifications = notifications.filter(n => !n.read)

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="space-y-4 sm:space-y-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back, Dr. {user.profile.first_name}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your recommendation letter requests and help students achieve their goals.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNotificationCenter(true)}
            className="relative w-full sm:w-auto"
          >
            <Bell className="h-4 w-4" />
            <span className="ml-2 sm:hidden">Notifications</span>
            {unreadNotifications.length > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting your response
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.accepted + stats.inProgress}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently working on
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Letters</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                Successfully delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Earnings This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${(stats.completed * 22.5).toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                75% of ${stats.completed * 30} total
              </p>
            </CardContent>
          </Card>
      </div>

      {/* Notification Center */}
      {unreadNotifications.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Bell className="h-5 w-5" />
                Notifications ({unreadNotifications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {unreadNotifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className="flex flex-col gap-3 sm:flex-row sm:items-start p-3 bg-white rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleMarkNotificationAsRead(notification.id)}
                      className="w-full sm:w-auto"
                    >
                      <span className="sm:hidden">Mark as Read</span>
                      <span className="hidden sm:inline">Mark as Read</span>
                    </Button>
                  </div>
                ))}
                {unreadNotifications.length > 3 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setNotificationCenter(true)}
                  >
                    View All Notifications
                  </Button>
                )}
              </div>
            </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Card>
          <CardHeader>
            <CardTitle>Request Management</CardTitle>
            <CardDescription>
              Manage your recommendation letter requests and sample letters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="queue" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="queue" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Request Queue ({pendingRequests.length})</span>
                  <span className="sm:hidden">Queue ({pendingRequests.length})</span>
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Active Work ({activeRequests.length})</span>
                  <span className="sm:hidden">Active ({activeRequests.length})</span>
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Completed ({completedRequests.length})</span>
                  <span className="sm:hidden">Done ({completedRequests.length})</span>
                </TabsTrigger>
                <TabsTrigger value="samples" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Sample Letters ({sampleLetters.length})</span>
                  <span className="sm:hidden">Samples ({sampleLetters.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* Request Queue Tab */}
              <TabsContent value="queue" className="mt-6">
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No pending requests
                    </h3>
                    <p className="text-gray-600">
                      All caught up! New requests will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests
                      .sort((a, b) => {
                        // Sort by priority (high first) then by deadline
                        const priorityOrder = { high: 3, medium: 2, low: 1 }
                        const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - 
                                           priorityOrder[a.priority as keyof typeof priorityOrder]
                        if (priorityDiff !== 0) return priorityDiff
                        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
                      })
                      .map((request) => (
                        <Card key={request.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  {getPurposeIcon(request.purpose)}
                                  <h3 className="font-semibold text-lg">
                                    {request.studentName}
                                  </h3>
                                  {getStatusBadge(request.status)}
                                  {getPriorityBadge(request.priority)}
                                </div>
                                
                                <p className="text-gray-600 mb-2">
                                  {request.details.organizationName}
                                  {request.details.programName && ` - ${request.details.programName}`}
                                </p>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Deadline: {formatDate(request.deadline)}
                                    {isDeadlineNear(request.deadline) && (
                                      <Badge variant="destructive" className="ml-2">
                                        Due Soon
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    Class of {request.studentProfile.completionYear}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex gap-2 ml-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeclineRequest(request.id, request.studentName, request.details.organizationName)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Decline
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleAcceptRequest(request.id, request.studentName, request.details.organizationName)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Accept
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </TabsContent>

              {/* Active Work Tab */}
              <TabsContent value="active" className="mt-6">
                {activeRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No active work
                    </h3>
                    <p className="text-gray-600">
                      Accept requests from the queue to start working on them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeRequests
                      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                      .map((request) => (
                        <Card key={request.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  {getPurposeIcon(request.purpose)}
                                  <h3 className="font-semibold text-lg">
                                    {request.studentName}
                                  </h3>
                                  {getStatusBadge(request.status)}
                                  {getPriorityBadge(request.priority)}
                                </div>
                                
                                <p className="text-gray-600 mb-2">
                                  {request.details.organizationName}
                                  {request.details.programName && ` - ${request.details.programName}`}
                                </p>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Deadline: {formatDate(request.deadline)}
                                    {isDeadlineNear(request.deadline) && (
                                      <Badge variant="destructive" className="ml-2">
                                        Due Soon
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    Class of {request.studentProfile.completionYear}
                                  </div>
                                </div>

                                {request.status === 'accepted' && (
                                  <div className="mt-3">
                                    <Progress value={0} className="h-2" />
                                    <p className="text-xs text-gray-500 mt-1">Ready to start</p>
                                  </div>
                                )}

                                {request.status === 'in_progress' && (
                                  <div className="mt-3">
                                    <Progress value={65} className="h-2" />
                                    <p className="text-xs text-gray-500 mt-1">65% complete</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex gap-2 ml-4">
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleWorkNow(request.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Work Now
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </TabsContent>

              {/* Completed Tab */}
              <TabsContent value="completed" className="mt-6">
                {completedRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No completed requests
                    </h3>
                    <p className="text-gray-600">
                      Your completed recommendation letters will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedRequests.map((request) => (
                      <Card key={request.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {getPurposeIcon(request.purpose)}
                                <h3 className="font-semibold text-lg">
                                  {request.studentName}
                                </h3>
                                {getStatusBadge(request.status)}
                              </div>
                              
                              <p className="text-gray-600 mb-2">
                                {request.details.organizationName}
                                {request.details.programName && ` - ${request.details.programName}`}
                              </p>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Completed: {formatDate(request.createdAt)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4" />
                                  Earned: $22.50
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View Letter
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Sample Letters Tab */}
              <TabsContent value="samples" className="mt-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Sample Letters</h3>
                      <p className="text-gray-600">
                        Upload sample letters to help AI learn your writing style
                      </p>
                    </div>
                    <Button onClick={() => setUploadDialog(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Sample
                    </Button>
                  </div>
                </div>

                {sampleLetters.length === 0 ? (
                  <div className="text-center py-8">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No sample letters uploaded
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Upload sample letters to help AI generate letters in your style.
                    </p>
                    <Button onClick={() => setUploadDialog(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Sample
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sampleLetters.map((letter) => (
                      <Card key={letter.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <FileText className="h-8 w-8 text-blue-600" />
                            <Badge variant="outline">
                              {letter.category}
                            </Badge>
                          </div>
                          
                          <h4 className="font-semibold mb-2">{letter.title}</h4>
                          <p className="text-sm text-gray-600 mb-3">
                            Uploaded {formatDate(letter.uploadedAt)}
                          </p>
                          
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Action Dialog */}
        {actionDialog && (
          <RequestActionDialog
            isOpen={actionDialog.isOpen}
            onClose={() => setActionDialog(null)}
            onConfirm={handleActionConfirm}
            action={actionDialog.action}
            studentName={actionDialog.studentName}
            organizationName={actionDialog.organizationName}
          />
        )}

        {/* Upload Dialog */}
        <SampleLetterUpload
          isOpen={uploadDialog}
          onClose={() => setUploadDialog(false)}
          onUpload={handleSampleLetterUpload}
        />

        {/* Notification Center */}
        <NotificationCenter
          isOpen={notificationCenter}
          onClose={() => setNotificationCenter(false)}
          notifications={notifications}
          onMarkAsRead={handleMarkNotificationAsRead}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        />
      </div>
    </div>
  )
}