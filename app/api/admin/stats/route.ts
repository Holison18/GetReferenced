import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth'
import { requirePermission } from '@/lib/server-auth'

export async function GET() {
  try {
    // Check admin permission
    await requirePermission('admin', 'read')
    
    const supabase = createServerSupabaseClient()
    
    // Get user statistics
    const { data: userStats } = await supabase
      .from('profiles')
      .select('role')
    
    const totalUsers = userStats?.length || 0
    const studentCount = userStats?.filter(u => u.role === 'student').length || 0
    const lecturerCount = userStats?.filter(u => u.role === 'lecturer').length || 0
    const adminCount = userStats?.filter(u => u.role === 'admin').length || 0
    
    // Get request statistics
    const { data: requestStats } = await supabase
      .from('requests')
      .select('status, created_at')
    
    const totalRequests = requestStats?.length || 0
    const activeRequests = requestStats?.filter(r => 
      ['pending_acceptance', 'accepted', 'in_progress'].includes(r.status)
    ).length || 0
    
    // Get this month's requests
    const thisMonth = new Date()
    thisMonth.setDate(1)
    const thisMonthRequests = requestStats?.filter(r => 
      new Date(r.created_at) >= thisMonth
    ).length || 0
    
    // Get payment statistics
    const { data: paymentStats } = await supabase
      .from('payments')
      .select('amount, status, created_at')
      .eq('status', 'completed')
    
    const totalRevenue = paymentStats?.reduce((sum, p) => sum + p.amount, 0) || 0
    const thisMonthRevenue = paymentStats?.filter(p => 
      new Date(p.created_at) >= thisMonth
    ).reduce((sum, p) => sum + p.amount, 0) || 0
    
    // Get complaint statistics
    const { data: complaintStats } = await supabase
      .from('complaints')
      .select('status, priority, created_at')
    
    const totalComplaints = complaintStats?.length || 0
    const openComplaints = complaintStats?.filter(c => 
      ['open', 'in_progress'].includes(c.status)
    ).length || 0
    const urgentComplaints = complaintStats?.filter(c => 
      c.priority === 'urgent' && ['open', 'in_progress'].includes(c.status)
    ).length || 0
    
    // Get token statistics
    const { data: tokenStats } = await supabase
      .from('tokens')
      .select('used_by, expiry_date')
    
    const totalTokens = tokenStats?.length || 0
    const usedTokens = tokenStats?.filter(t => t.used_by).length || 0
    const activeTokens = tokenStats?.filter(t => 
      !t.used_by && new Date(t.expiry_date) > new Date()
    ).length || 0
    
    return NextResponse.json({
      users: {
        total: totalUsers,
        students: studentCount,
        lecturers: lecturerCount,
        admins: adminCount
      },
      requests: {
        total: totalRequests,
        active: activeRequests,
        thisMonth: thisMonthRequests
      },
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue
      },
      complaints: {
        total: totalComplaints,
        open: openComplaints,
        urgent: urgentComplaints
      },
      tokens: {
        total: totalTokens,
        used: usedTokens,
        active: activeTokens
      }
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}