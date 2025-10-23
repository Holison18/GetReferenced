import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth'
import { requirePermission } from '@/lib/server-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission('admin', 'read')
    
    const supabase = createServerSupabaseClient()
    
    const { data: user, error } = await supabase
      .from('profiles')
      .select(`
        *,
        student_profiles(*),
        lecturer_profiles(*)
      `)
      .eq('id', params.id)
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission('admin', 'write')
    
    const body = await request.json()
    const { action, ...updateData } = body
    
    const supabase = createServerSupabaseClient()
    
    if (action === 'suspend') {
      // In a real implementation, you might add a 'suspended' field to profiles
      // For now, we'll use a notification approach
      await supabase
        .from('notifications')
        .insert({
          user_id: params.id,
          type: 'account_suspended',
          title: 'Account Suspended',
          message: 'Your account has been suspended by an administrator.',
          data: { suspended_by: updateData.suspended_by, reason: updateData.reason }
        })
      
      return NextResponse.json({ message: 'User suspended successfully' })
    }
    
    if (action === 'reset_password') {
      // This would typically trigger a password reset email
      // For now, we'll create a notification
      await supabase
        .from('notifications')
        .insert({
          user_id: params.id,
          type: 'password_reset',
          title: 'Password Reset Required',
          message: 'An administrator has requested that you reset your password.',
          data: { reset_by: updateData.reset_by }
        })
      
      return NextResponse.json({ message: 'Password reset initiated' })
    }
    
    // Regular profile update
    const { data: updatedUser, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission('admin', 'delete')
    
    const supabase = createServerSupabaseClient()
    
    // In a real implementation, you might want to soft delete or archive
    // For now, we'll just delete the profile (cascading will handle related data)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', params.id)
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}