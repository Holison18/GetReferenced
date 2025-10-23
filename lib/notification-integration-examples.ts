/**
 * Examples of how to integrate the notification system into existing components
 * These are reference implementations showing how to trigger notifications
 * in various scenarios throughout the application.
 */

import { triggerNotifications } from './notification-triggers'
import { supabase } from './supabase'

// Example: Request creation in student dashboard
export async function createRequestWithNotifications(requestData: any) {
  try {
    // Create the request in the database
    const { data: newRequest, error } = await supabase
      .from('requests')
      .insert(requestData)
      .select()
      .single()

    if (error) throw error

    // The database trigger will automatically handle the notification
    // But you can also manually trigger if needed:
    // await triggerNotifications.requestCreated(newRequest)

    return newRequest
  } catch (error) {
    console.error('Error creating request:', error)
    throw error
  }
}

// Example: Lecturer accepting/declining a request
export async function updateRequestStatus(
  requestId: string,
  newStatus: string,
  lecturerId: string,
  reason?: string
) {
  try {
    // Get current request status
    const { data: currentRequest } = await supabase
      .from('requests')
      .select('status')
      .eq('id', requestId)
      .single()

    if (!currentRequest) throw new Error('Request not found')

    // Update the request status
    const { error } = await supabase
      .from('requests')
      .update({ status: newStatus })
      .eq('id', requestId)

    if (error) throw error

    // The database trigger will handle notifications automatically
    // Manual trigger example:
    // await triggerNotifications.requestStatusChanged(
    //   requestId,
    //   currentRequest.status,
    //   newStatus,
    //   lecturerId,
    //   reason
    // )

    return true
  } catch (error) {
    console.error('Error updating request status:', error)
    throw error
  }
}

// Example: Processing payment with notifications
export async function processPaymentWithNotifications(paymentData: any) {
  try {
    // Process payment with Stripe
    // ... payment processing logic ...

    // Update payment status in database
    const { data: updatedPayment, error } = await supabase
      .from('payments')
      .update({ status: 'succeeded' })
      .eq('id', paymentData.id)
      .select()
      .single()

    if (error) throw error

    // Database trigger will handle notification automatically
    return updatedPayment
  } catch (error) {
    console.error('Error processing payment:', error)
    
    // Update payment status to failed
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('id', paymentData.id)

    // Database trigger will handle failure notification
    throw error
  }
}

// Example: Filing a complaint with admin notification
export async function fileComplaintWithNotifications(complaintData: any) {
  try {
    // Create complaint in database
    const { data: newComplaint, error } = await supabase
      .from('complaints')
      .insert(complaintData)
      .select()
      .single()

    if (error) throw error

    // Database trigger will notify admins automatically
    return newComplaint
  } catch (error) {
    console.error('Error filing complaint:', error)
    throw error
  }
}

// Example: Manual admin alert
export async function sendAdminAlert(alertType: string, message: string, additionalData?: any) {
  try {
    await triggerNotifications.adminAlert(alertType, message, additionalData)
  } catch (error) {
    console.error('Error sending admin alert:', error)
    throw error
  }
}

// Example: Request reassignment
export async function reassignRequestWithNotifications(
  requestId: string,
  oldLecturerId: string,
  newLecturerId: string
) {
  try {
    // Update request with new lecturer
    const { error } = await supabase
      .from('requests')
      .update({ 
        lecturer_ids: [newLecturerId],
        status: 'reassigned'
      })
      .eq('id', requestId)

    if (error) throw error

    // Manually trigger reassignment notifications
    await triggerNotifications.requestReassigned(
      requestId,
      oldLecturerId,
      newLecturerId
    )

    return true
  } catch (error) {
    console.error('Error reassigning request:', error)
    throw error
  }
}

// Example: React component integration
export const NotificationIntegrationExample = `
// In a React component (e.g., RequestCard.tsx)
import { useNotifications } from '@/hooks/useNotifications'

export function RequestCard({ request }) {
  const { sendNotification, loading } = useNotifications()

  const handleAcceptRequest = async () => {
    try {
      // Update request status
      await updateRequestStatus(request.id, 'accepted', lecturerId)
      
      // Optional: Send custom notification
      await sendNotification('request_accepted', {
        studentName: request.student_name,
        lecturerName: 'Current Lecturer',
        purpose: request.purpose,
        deadline: request.deadline
      })
    } catch (error) {
      console.error('Error accepting request:', error)
    }
  }

  return (
    <div>
      <button 
        onClick={handleAcceptRequest}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Accept Request'}
      </button>
    </div>
  )
}
`

// Example: Server-side integration in API routes
export const APIRouteIntegrationExample = `
// In an API route (e.g., app/api/requests/[id]/accept/route.ts)
import { triggerNotifications } from '@/lib/notification-triggers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { lecturerId, reason } = await request.json()
    
    // Update request status
    const { data: updatedRequest, error } = await supabase
      .from('requests')
      .update({ status: 'accepted' })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    // Trigger notification (if not using database triggers)
    await triggerNotifications.requestStatusChanged(
      params.id,
      'pending_acceptance',
      'accepted',
      lecturerId,
      reason
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`