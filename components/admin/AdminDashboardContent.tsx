'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Users, 
  FileText, 
  DollarSign, 
  AlertTriangle, 
  Search, 
  Filter, 
  Download,
  Plus,
  Eye,
  Edit,
  UserX,
  RefreshCw,
  CheckCircle
} from 'lucide-react'

interface AdminStats {
  users: {
    total: number
    students: number
    lecturers: number
    admins: number
  }
  requests: {
    total: number
    active: number
    thisMonth: number
  }
  revenue: {
    total: number
    thisMonth: number
  }
  complaints: {
    total: number
    open: number
    urgent: number
  }
  tokens: {
    total: number
    used: number
    active: number
  }
}

interface User {
  id: string
  first_name: string
  last_name: string
  role: 'student' | 'lecturer' | 'admin'
  created_at: string
  student_profiles?: any
  lecturer_profiles?: any
}

interface Token {
  id: string
  code: string
  value: number
  expiry_date: string
  created_by: string
  used_by: string | null
  used_date: string | null
  created_at: string
  created_by_profile?: { first_name: string; last_name: string }
  used_by_profile?: { first_name: string; last_name: string }
}

interface Complaint {
  id: string
  type: string
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  student?: { first_name: string; last_name: string }
  lecturer?: { first_name: string; last_name: string }
  assigned_admin?: { first_name: string; last_name: string }
}

interface AuditLog {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  created_at: string
  user?: { first_name: string; last_name: string; role: string }
}

export function AdminDashboardContent() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [tokens, setTokens] = useState<Token[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters and pagination
  const [userSearch, setUserSearch] = useState('')
  const [userRole, setUserRole] = useState('all')
  const [tokenStatus, setTokenStatus] = useState('all')
  const [complaintStatus, setComplaintStatus] = useState('all')
  const [complaintPriority, setComplaintPriority] = useState('all')
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [showCreateToken, setShowCreateToken] = useState(false)
  const [showUserActions, setShowUserActions] = useState(false)
  
  // Token creation form
  const [tokenForm, setTokenForm] = useState({
    value: 1,
    expiryDate: '',
    quantity: 1
  })

  useEffect(() => {
    fetchStats()
    fetchUsers()
    fetchTokens()
    fetchComplaints()
    fetchAuditLogs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        search: userSearch,
        role: userRole,
        limit: '20'
      })
      const response = await fetch(`/api/admin/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchTokens = async () => {
    try {
      const params = new URLSearchParams({
        status: tokenStatus,
        limit: '20'
      })
      const response = await fetch(`/api/admin/tokens?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTokens(data.tokens)
      }
    } catch (error) {
      console.error('Error fetching tokens:', error)
    }
  }

  const fetchComplaints = async () => {
    try {
      const params = new URLSearchParams({
        status: complaintStatus,
        priority: complaintPriority,
        limit: '20'
      })
      const response = await fetch(`/api/admin/complaints?${params}`)
      if (response.ok) {
        const data = await response.json()
        setComplaints(data.complaints)
      }
    } catch (error) {
      console.error('Error fetching complaints:', error)
    }
  }

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs?limit=10')
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.auditLogs)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTokens = async () => {
    try {
      const response = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenForm)
      })
      
      if (response.ok) {
        setShowCreateToken(false)
        setTokenForm({ value: 1, expiryDate: '', quantity: 1 })
        fetchTokens()
        fetchStats()
      }
    } catch (error) {
      console.error('Error creating tokens:', error)
    }
  }

  const handleUserAction = async (userId: string, action: string, data?: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      })
      
      if (response.ok) {
        fetchUsers()
        setShowUserActions(false)
        setSelectedUser(null)
      }
    } catch (error) {
      console.error('Error performing user action:', error)
    }
  }

  const handleComplaintUpdate = async (complaintId: string, updates: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/admin/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (response.ok) {
        fetchComplaints()
        fetchStats()
      }
    } catch (error) {
      console.error('Error updating complaint:', error)
    }
  }

  const exportAuditLogs = async (format: 'json' | 'csv' = 'csv') => {
    try {
      const response = await fetch('/api/admin/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            System administration and user management
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.users.students || 0} students, {stats?.users.lecturers || 0} lecturers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.requests.active || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.requests.thisMonth || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.revenue.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                ${stats?.revenue.thisMonth || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Complaints</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.complaints.open || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.complaints.urgent || 0} urgent
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Search, view, and manage user accounts
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-64"
                      />
                    </div>
                    <Select value={userRole} onValueChange={setUserRole}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="student">Students</SelectItem>
                        <SelectItem value="lecturer">Lecturers</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={fetchUsers} variant="outline" size="sm">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            user.role === 'admin' ? 'destructive' :
                            user.role === 'lecturer' ? 'default' : 'secondary'
                          }>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                setShowUserActions(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tokens Tab */}
          <TabsContent value="tokens" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Token Management</CardTitle>
                    <CardDescription>
                      Generate and manage free request tokens
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select value={tokenStatus} onValueChange={setTokenStatus}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tokens</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => setShowCreateToken(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Tokens
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Used By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-mono">{token.code}</TableCell>
                        <TableCell>{token.value} request(s)</TableCell>
                        <TableCell>
                          <Badge variant={
                            token.used_by ? 'secondary' :
                            new Date(token.expiry_date) < new Date() ? 'destructive' : 'default'
                          }>
                            {token.used_by ? 'Used' :
                             new Date(token.expiry_date) < new Date() ? 'Expired' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {token.created_by_profile ? 
                            `${token.created_by_profile.first_name} ${token.created_by_profile.last_name}` : 
                            'System'}
                        </TableCell>
                        <TableCell>
                          {new Date(token.expiry_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {token.used_by_profile ? 
                            `${token.used_by_profile.first_name} ${token.used_by_profile.last_name}` : 
                            '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Complaints Tab */}
          <TabsContent value="complaints" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Complaint Management</CardTitle>
                    <CardDescription>
                      Review and resolve user complaints
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select value={complaintStatus} onValueChange={setComplaintStatus}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={complaintPriority} onValueChange={setComplaintPriority}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complaints.map((complaint) => (
                      <TableRow key={complaint.id}>
                        <TableCell className="font-medium">{complaint.subject}</TableCell>
                        <TableCell>{complaint.type.replace('_', ' ')}</TableCell>
                        <TableCell>
                          <Badge variant={
                            complaint.priority === 'urgent' ? 'destructive' :
                            complaint.priority === 'high' ? 'default' : 'secondary'
                          }>
                            {complaint.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            complaint.status === 'resolved' ? 'default' :
                            complaint.status === 'in_progress' ? 'secondary' : 'outline'
                          }>
                            {complaint.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {complaint.student ? 
                            `${complaint.student.first_name} ${complaint.student.last_name}` : 
                            'Unknown'}
                        </TableCell>
                        <TableCell>
                          {new Date(complaint.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedComplaint(complaint)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Audit Logs</CardTitle>
                    <CardDescription>
                      System activity and user action logs
                    </CardDescription>
                  </div>
                  <Button onClick={() => exportAuditLogs('csv')} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.user ? 
                            `${log.user.first_name} ${log.user.last_name} (${log.user.role})` : 
                            'System'}
                        </TableCell>
                        <TableCell className="font-mono">{log.action}</TableCell>
                        <TableCell>{log.resource_type}</TableCell>
                        <TableCell>
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Token Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Tokens:</span>
                      <span className="font-bold">{stats?.tokens.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Used Tokens:</span>
                      <span className="font-bold">{stats?.tokens.used || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Tokens:</span>
                      <span className="font-bold">{stats?.tokens.active || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Database:</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>API:</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Operational
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Storage:</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Token Dialog */}
        <Dialog open={showCreateToken} onOpenChange={setShowCreateToken}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tokens</DialogTitle>
              <DialogDescription>
                Generate tokens that students can use for free requests
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="value">Token Value (number of free requests)</Label>
                <Input
                  id="value"
                  type="number"
                  min="1"
                  value={tokenForm.value}
                  onChange={(e) => setTokenForm(prev => ({ ...prev, value: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="100"
                  value={tokenForm.quantity}
                  onChange={(e) => setTokenForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={tokenForm.expiryDate}
                  onChange={(e) => setTokenForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateToken(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTokens}>
                Create {tokenForm.quantity} Token(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Actions Dialog */}
        <Dialog open={showUserActions} onOpenChange={setShowUserActions}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>User Actions</DialogTitle>
              <DialogDescription>
                Manage user account: {selectedUser?.first_name} {selectedUser?.last_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleUserAction(selectedUser?.id || '', 'suspend', { reason: 'Administrative action' })}
              >
                <UserX className="h-4 w-4 mr-2" />
                Suspend Account
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleUserAction(selectedUser?.id || '', 'reset_password')}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUserActions(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complaint Details Dialog */}
        <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedComplaint?.subject}</DialogTitle>
              <DialogDescription>
                Complaint Details and Resolution
              </DialogDescription>
            </DialogHeader>
            {selectedComplaint && (
              <div className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedComplaint.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={selectedComplaint.status}
                      onValueChange={(value) => 
                        handleComplaintUpdate(selectedComplaint.id, { status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={selectedComplaint.priority}
                      onValueChange={(value) => 
                        handleComplaintUpdate(selectedComplaint.id, { priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}