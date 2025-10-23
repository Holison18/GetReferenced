'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DashboardSkeleton } from '@/components/ui/dashboard-skeleton'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/animated-wrapper'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Eye, 
  RotateCcw,
  MessageSquare,
  Calendar,
  DollarSign,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { Tables } from '@/lib/supabase'

interface StudentDashboardProps {
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
  purpose: 'school' | 'scholarship' | 'job'
  status: string
  deadline: string
  lecturerNames: string[]
  createdAt: string
  details: {
    organizationName: string
    programName?: string
  }
}

export default function StudentDashboardContent({ user }: StudentDashboardProps) {
  const [requests, setRequests] = useState<RequestWithDetails[]>([])
  const [stats, setStats] = useState<RequestStats>({
    total: 0,
    pending: 0,
    accepted: 0,
    inProgress: 0,
    completed: 0,
    declined: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/requests')
      if (response.ok) {
        const data = await response.json()
        
        // Format the data to match our interface
        const formattedRequests: RequestWithDetails[] = data.map((request: any) => ({
          id: request.id,
          purpose: request.purpose,
          status: request.status,
          deadline: request.deadline,
          lecturerNames: request.lecturerNames || [],
          createdAt: request.created_at,
          details: request.details
        }))
        
        setRequests(formattedRequests)
        
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
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_acceptance: { variant: 'outline' as const, label: 'Pending', icon: Clock },
      accepted: { variant: 'secondary' as const, label: 'Accepted', icon: CheckCircle },
      in_progress: { variant: 'default' as const, label: 'In Progress', icon: FileText },
      completed: { variant: 'default' as const, label: 'Completed', icon: CheckCircle },
      declined: { variant: 'destructive' as const, label: 'Declined', icon: AlertCircle },
      reassigned: { variant: 'outline' as const, label: 'Reassigned', icon: RotateCcw }
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

  const getPurposeIcon = (purpose: string) => {
    switch (purpose) {
      case 'school':
        return <FileText className="h-4 w-4" />
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

  const currentRequests = requests.filter(req => 
    ['pending_acceptance', 'accepted', 'in_progress'].includes(req.status)
  )
  
  const pastRequests = requests.filter(req => 
    ['completed', 'declined'].includes(req.status)
  )

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <FadeIn className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Welcome back, {user.profile.first_name}!
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your recommendation letter requests from your dashboard.
        </p>
      </div>

      {/* Overview Cards */}
      <StaggerContainer className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                All time requests
              </p>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.pending + stats.accepted + stats.inProgress}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
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
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </div>
              <Progress 
                value={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0} 
                className="mt-2"
              />
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Quick Actions */}
      <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks you might want to perform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link href="/student/new-request" className="flex-1 sm:flex-none">
                  <Button className="w-full sm:w-auto flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Request
                  </Button>
                </Link>
                <Button variant="outline" className="flex items-center justify-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">View All Requests</span>
                  <span className="sm:hidden">View All</span>
                </Button>
                <Button variant="outline" className="flex items-center justify-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">File Complaint</span>
                  <span className="sm:hidden">Complaint</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Request Management Tabs */}
      <Card>
          <CardHeader>
            <CardTitle>Request Management</CardTitle>
            <CardDescription>
              View and manage your recommendation letter requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="current" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Current Requests ({currentRequests.length})</span>
                  <span className="sm:hidden">Current ({currentRequests.length})</span>
                </TabsTrigger>
                <TabsTrigger value="past" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Past Requests ({pastRequests.length})</span>
                  <span className="sm:hidden">Past ({pastRequests.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="current" className="mt-6">
                {currentRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No active requests
                    </h3>
                    <p className="text-gray-600 mb-4">
                      You don't have any active recommendation letter requests.
                    </p>
                    <Link href="/student/new-request">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Request
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentRequests.map((request) => (
                      <Card key={request.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  {getPurposeIcon(request.purpose)}
                                  <h3 className="font-semibold text-base sm:text-lg truncate">
                                    {request.details.organizationName}
                                  </h3>
                                </div>
                                {getStatusBadge(request.status)}
                              </div>
                              
                              {request.details.programName && (
                                <p className="text-gray-600 mb-2">
                                  {request.details.programName}
                                </p>
                              )}
                              
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 text-sm text-muted-foreground mb-3">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">Deadline: {formatDate(request.deadline)}</span>
                                  {isDeadlineNear(request.deadline) && (
                                    <Badge variant="destructive" className="ml-2 text-xs">
                                      Due Soon
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{request.lecturerNames.join(', ')}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 sm:ml-4">
                              <Link href={`/student/requests/${request.id}`} className="flex-1 sm:flex-none">
                                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                  <Eye className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">View</span>
                                  <span className="sm:hidden">View Details</span>
                                </Button>
                              </Link>
                              {request.status === 'pending_acceptance' && (
                                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Reassign
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-6">
                {pastRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No past requests
                    </h3>
                    <p className="text-gray-600">
                      Your completed and declined requests will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pastRequests.map((request) => (
                      <Card key={request.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  {getPurposeIcon(request.purpose)}
                                  <h3 className="font-semibold text-base sm:text-lg truncate">
                                    {request.details.organizationName}
                                  </h3>
                                </div>
                                {getStatusBadge(request.status)}
                              </div>
                              
                              {request.details.programName && (
                                <p className="text-gray-600 mb-2">
                                  {request.details.programName}
                                </p>
                              )}
                              
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 text-sm text-muted-foreground mb-3">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">Completed: {formatDate(request.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{request.lecturerNames.join(', ')}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 sm:ml-4">
                              <Link href={`/student/requests/${request.id}`} className="flex-1 sm:flex-none">
                                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                  <Eye className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">View Details</span>
                                  <span className="sm:hidden">View</span>
                                </Button>
                              </Link>
                              {request.status === 'completed' && (
                                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                  <FileText className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              )}
                            </div>
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
    </FadeIn>
  )
}